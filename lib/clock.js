'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util');

var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);
var momentOrThrow = _.partialRight(util.ensure, 'moment', moment.isMoment, function (value) {
    return value.clone();
});

var dateBase = {
    durationAsNumberOfMilliseconds: function (duration) {
        return util.ensure(duration, 'duration in milliseconds', _.isNumber);
    },
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return durationInMillis;
    },
    diffInMilliseconds: function (firstDate, secondDate) {
        return secondDate.getTime() - firstDate.getTime();
    }
};

exports.DateClock = function () {
    return _.extend({
        now: function () {
            return new Date();
        },
        setTimeout: function (callback, timeout) {
            return setTimeout(callback, timeout);
        },
        clearTimeout: function (id) {
            return clearTimeout(id);
        },
        setInterval: function (callback, interval) {
            return setInterval(callback, interval);
        },
        clearInterval: function (id) {
            return clearInterval(id);
        }
    }, dateBase);
};

var momentBase = {
    durationAsNumberOfMilliseconds: function (duration) {
        return durationOrThrow(duration).asMilliseconds();
    },
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return moment.duration(durationInMillis);
    },
    diffInMilliseconds: function (firstMoment, secondMoment) {
        return moment.duration(firstMoment.diff(secondMoment));
    }
};

exports.MomentClock = function () {
    return _.extend({
        now: function () {
            return moment();
        },
        setTimeout: function (callback, timeoutDuration) {
            return setTimeout(callback, durationOrThrow(timeoutDuration).asMilliseconds());
        },
        clearTimeout: function (id) {
            return clearTimeout(id);
        },
        setInterval: function (callback, intervalDuration) {
            return setInterval(callback, durationOrThrow(intervalDuration).asMilliseconds());
        },
        clearInterval: function (id) {
            return clearInterval(id);
        }
    }, momentBase);
};

function StubClock() {
    var intervals = {};
    var timeouts = {};

    return {
        setTimeout: function (callback) {
            var id = util.createGuid();
            timeouts[id] = callback;
            return id;
        },
        clearTimeout: function (id) {
            delete timeouts[id];
            return id;
        },
        setInterval: function (callback) {
            var id = util.createGuid();
            intervals[id] = callback;
            return id;
        },
        clearInterval: function (id) {
            delete intervals[id];
            return id;
        },
        triggerAll: function () {
            var ids = _.keys(timeouts).concat(_.keys(intervals));
            _.map(timeouts, function (timeout, id) {
                timeout();
                delete timeouts[id];
                return id;
            });
            _.each(intervals, function (interval) {
                interval();
            });
            return ids;
        }
    };
}

var StubClockBase = function (fns, current, tickSize, implicitTickFlag, base) {
    var current = current ? fns.dateCheck(current) : fns.dateFn(0);
    var tickSize = tickSize ? fns.durationCheck(tickSize) : fns.durationFn(1000);
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    var target = {
        now: function () {
            if (arguments.length > 0) {
                current = fns.dateCheck(arguments[0]);
            } else if (implicitTickFlag) {
                current = fns.incrementBy(current, tickSize);
            }
            return fns.dateFn(current);
        },
        tick: function (duration) {
            current = fns.incrementBy(current, duration ? fns.durationCheck(arguments[0]) : tickSize);
            return fns.dateFn(current);
        },
        tickSize: function (duration) {
            if (duration) {
                tickSize = fns.durationCheck(duration);
            }
            return tickSize;
        },
        implicitTick: function () {
            if (arguments.length > 0) {
                implicitTickFlag = arguments[0];
            }
            return implicitTickFlag;
        }
    };
    return _.extend(_.extend(target, new StubClock(), base));
}

exports.StubMomentClock = function (current, tickSize, implicitTickFlag) {
    var fns = {
        dateFn: moment,
        dateCheck: momentOrThrow,
        durationCheck: durationOrThrow,
        durationFn: function (ms) {
            return moment.duration(ms, 'milliseconds');
        },
        incrementBy: function (date, tickSize) {
            return moment(date).add(tickSize);
        }
    };
    return new StubClockBase(fns, current, tickSize, implicitTickFlag, momentBase)
}

exports.StubDateClock = function (current, tickSize, implicitTickFlag) {
    var fns = {
        dateFn: function(millis) {
            return new Date(millis);
        },
        dateCheck: _.partialRight(util.ensure, 'date', _.isDate),
        durationCheck: _.partialRight(util.ensure, 'number of milliseconds', _.isNumber),
        durationFn: function (ms) {
            return ms;
        },
        incrementBy: function (date, tickSize) {
           return new Date(date.getTime() + tickSize);
        }
    };
    return new StubClockBase(fns, current, tickSize, implicitTickFlag, dateBase);
}
