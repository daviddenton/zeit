'use strict';

var _ = require('lodash'), util = require('./util');

exports.TimeoutsAndIntervals = function(durationToMs) {
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

function StubTimeoutsAndIntervals() {
    var exists = _.partialRight(util.ensure, 'a truthy value', function (value) {
        return value !== undefined;
    });

    var intervals = {};
    var timeouts = {};

    return {
        setTimeout: function (callback, timeout) {
            exists(timeout);
            var id = util.createGuid();
            timeouts[id] = {
                callback: callback,
                timeout: timeout
            };
            return id;
        },
        clearTimeout: function (id) {
            delete timeouts[id];
            return id;
        },
        setInterval: function (callback, interval) {
            exists(interval);
            var id = util.createGuid();
            intervals[id] = {
                callback: callback,
                interval: interval
            };
            return id;
        },
        clearInterval: function (id) {
            delete intervals[id];
            return id;
        },
        timeouts: function () {
            return _(timeouts).map(function (timeout, id) {
                return [id, timeout.timeout];
            }).fromPairs().value();
        },
        intervals: function () {
            return _(timeouts).map(function (timeout, id) {
                return [id, intervals.timeout];
            }).fromPairs().value();
        },
        triggerAll: function () {
            var ids = _.keys(timeouts).concat(_.keys(intervals));
            _.map(timeouts, function (timeout, id) {
                timeout.callback();
                delete timeouts[id];
                return id;
            });
            _.each(intervals, function (interval) {
                interval.callback();
            });
            return ids;
        }
    };
}

var StubClockwork = function (fns, current, tickSize, implicitTickFlag) {
    current = current ? fns.ensureDate(current) : fns.dateFn(0);
    tickSize = tickSize ? fns.ensureDuration(tickSize) : fns.durationFn(1000);
    implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return {
        lastKnownTime: function () {
            return current;
        },
        now: function () {
            if (arguments.length > 0) {
                current = fns.ensureDate(arguments[0]);
            } else if (implicitTickFlag) {
                current = fns.incrementBy(current, tickSize);
            }
            return fns.dateFn(current);
        },
        timeIn: function (tickSize) {
            return fns.incrementBy(current, tickSize);
        },
        durationUntil: function (time) {
            return fns.durationDiff(current, time);
        },
        tick: function (duration) {
            current = fns.incrementBy(current, duration ? fns.ensureDuration(arguments[0]) : tickSize);
            return fns.dateFn(current);
        },
        tickSize: function (duration) {
            if (duration) {
                tickSize = fns.ensureDuration(duration);
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

/* NATIVE JAVASCRIPT DATE IMPLEMENTATION */

var numberOfMillisOrThrow = _.partialRight(util.ensure, 'number of milliseconds', _.isNumber);

var dateClockwork = {
    now: function () {
        return new Date();
    },
    timeIn: function (duration) {
        return new Date(this.now().getTime() + duration);
    },
    durationUntil: function (other) {
        return other.getTime() - this.now().getTime();
    }
};

var dateConversions = {
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return durationInMillis;
    }
};

exports.DateClock = function () {
    return _.extend(new exports.TimeoutsAndIntervals(numberOfMillisOrThrow), dateClockwork, dateConversions);
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
        durationDiff: function(current, other) {
            return other.getTime() - current.getTime();
        },
        ensureDate: _.partialRight(util.ensure, 'date', _.isDate),
        ensureDuration: numberOfMillisOrThrow
    };
    return _.extend(new StubTimeoutsAndIntervals(), new StubClockwork(fns, current, tickSize, implicitTickFlag), dateConversions);
};

/* MOMENT.JS IMPLEMENTATION */

var moment = require('moment');

var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);
var momentOrThrow = _.partialRight(util.ensure, 'moment', moment.isMoment, function (value) {
    return value.clone();
});

var momentClockwork = {
    now: function () {
        return moment();
    },
    timeIn: function (duration) {
        return this.now().add(duration);
    },
    durationUntil: function (other) {
        return this.numberOfMillisecondsAsDuration(other.diff(this.now()));
    }
};

var momentConversions = {
    numberOfMillisecondsAsDuration: function (durationInMillis) {
        return moment.duration(durationInMillis);
    }
};

exports.MomentClock = function () {
    return _.extend(new exports.TimeoutsAndIntervals(function (duration) {
        return durationOrThrow(duration).asMilliseconds();
    }), momentClockwork, momentConversions);
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
        durationDiff: function(current, other) {
            return moment.duration(other.diff(current), 'milliseconds');
        },
        ensureDate: momentOrThrow,
        ensureDuration: durationOrThrow
    };
    return _.extend(new StubTimeoutsAndIntervals(), new StubClockwork(fns, current, tickSize, implicitTickFlag), momentConversions);
};

