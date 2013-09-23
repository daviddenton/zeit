'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util');

var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);
var momentOrThrow = _.partialRight(util.ensure, 'moment', moment.isMoment, function (value) {
    return value.clone();
});
var dateOrThrow = _.partialRight(util.ensure, 'date', _.isDate);
var numberOfMillisOrThrow = _.partialRight(util.ensure, 'number of milliseconds', _.isNumber);

var dateConversions = {
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return durationInMillis;
    }
};

var momentConversions = {
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return moment.duration(durationInMillis);
    }
};

var dateClockwork = {
    now: function () {
        return new Date();
    }
};

var momentClockwork = {
    now: function () {
        return moment();
    }
};

function TimeoutsAndIntervals(durationToMs) {
    return {
        setTimeout: function (callback, timeout) {
            return setTimeout(callback, durationToMs(timeout));
        },
        clearTimeout: function (id) {
            return clearTimeout(id);
        },
        setInterval: function (callback, interval) {
            return setInterval(callback, durationToMs(interval));
        },
        clearInterval: function (id) {
            return clearInterval(id);
        }
    };
}

exports.DateClock = function () {
    return _.extend(new TimeoutsAndIntervals(numberOfMillisOrThrow), dateConversions, dateClockwork);
};

exports.MomentClock = function () {
    return _.extend(new TimeoutsAndIntervals(function (duration) {
            return durationOrThrow(duration).asMilliseconds();
        }), momentConversions, momentClockwork);
};

function StubTimeoutsAndIntervals() {
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

var StubClockwork = function (fns, current, tickSize, implicitTickFlag) {
    var current = current ? fns.dateCheck(current) : fns.dateFn(0);
    var tickSize = tickSize ? fns.durationCheck(tickSize) : fns.durationFn(1000);
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return {
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
};

exports.StubMomentClock = function (current, tickSize, implicitTickFlag) {
    var fns = {
        dateFn: moment,
        durationFn: function (ms) {
            return moment.duration(ms, 'milliseconds');
        },
        incrementBy: function (date, tickSize) {
            return moment(date).add(tickSize);
        },
        dateCheck: momentOrThrow,
        durationCheck: durationOrThrow
    };
    return _.extend(new StubClockwork(fns, current, tickSize, implicitTickFlag), new StubTimeoutsAndIntervals(), momentConversions);
};

exports.StubDateClock = function (current, tickSize, implicitTickFlag) {
    var fns = {
        dateFn: function (millis) {
            return new Date(millis);
        },
        durationFn: function (ms) {
            return ms;
        },
        incrementBy: function (date, tickSize) {
            return new Date(date.getTime() + tickSize);
        },
        dateCheck: dateOrThrow,
        durationCheck: numberOfMillisOrThrow
    };
    return _.extend(new StubClockwork(fns, current, tickSize, implicitTickFlag), new StubTimeoutsAndIntervals(), dateConversions);
};
