'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util');

var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);
var momentOrThrow = _.partialRight(util.ensure, 'moment', moment.isMoment, function (value) {
    return value.clone();
});

exports.DateClock = function () {
    return {
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
    };
};

exports.MomentClock = function () {
    return {
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
    }
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
            _.map(timeouts, function(timeout, id) {
                timeout();
                delete timeouts[id];
                return id;
            });
            _.each(intervals, function(interval) {
                interval();
            });
            return ids;
        }
    };
}

exports.StubMomentClock = function (current, tickSize, implicitTickFlag) {

    var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);
    var momentOrThrow = _.partialRight(util.ensure, 'moment', moment.isMoment, function (value) {
        return value.clone();
    });

    var current = current ? momentOrThrow(current) : moment(0);
    var tickSize = tickSize ? durationOrThrow(tickSize) : moment.duration(1, 'second');
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return _.extend({
        now: function () {
            if (arguments.length > 0) {
                current = momentOrThrow(arguments[0]);
            } else if (implicitTickFlag) {
                current.add(tickSize);
            }
            return moment(current);
        },
        tick: function (duration) {
            current = current.add(duration ? durationOrThrow(arguments[0]) : tickSize);
            return moment(current);
        },
        tickSize: function (duration) {
            if (duration) {
                tickSize = durationOrThrow(duration);
            }
            return tickSize;
        },
        implicitTick: function () {
            if (arguments.length > 0) {
                implicitTickFlag = arguments[0];
            }
            return implicitTickFlag;
        }
    }, new StubClock())
};

exports.StubDateClock = function (current, tickSizeMs, implicitTickFlag) {

    var numberOrThrow = _.partialRight(util.ensure, 'number of milliseconds', _.isNumber);
    var dateOrThrow = _.partialRight(util.ensure, 'date', _.isDate);

    var current = current ? dateOrThrow(current) : new Date(0);
    var tickSize = tickSizeMs ? numberOrThrow(tickSizeMs) : 1000;
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return _.extend({
        now: function () {
            if (arguments.length > 0) {
                current = dateOrThrow(arguments[0]);
            } else if (implicitTickFlag) {
                current = new Date(current.getTime() + tickSize);
            }
            return new Date(current);
        },
        tick: function (duration) {
            current = new Date(current.getTime() + (duration ? numberOrThrow(arguments[0]) : tickSize));
            return new Date(current);
        },
        tickSize: function (duration) {
            if (duration) {
                tickSize = numberOrThrow(duration);
            }
            return tickSize;
        },
        implicitTick: function () {
            if (arguments.length > 0) {
                implicitTickFlag = arguments[0];
            }
            return implicitTickFlag;
        }
    }, new StubClock());
};
