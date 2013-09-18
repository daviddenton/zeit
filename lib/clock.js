'use strict'

var moment = require('moment'), _ = require('lodash');

function ensure(value, description, predicate, map) {
    if (predicate(value)) {
        return map ? map(value) : value;
    } else {
        throw new Error(value + ' is not a ' + description);
    }
}

exports.DateClock = function () {
    return {
        now: function () {
            return new Date();
        }
    }
};

exports.MomentClock = function () {
    return {
        now: function () {
            return moment();
        }
    }
};

exports.StubMomentClock = function (current, tickSize, implicitTickFlag) {

    var durationOrThrow = _.partialRight(ensure, 'duration', moment.isDuration);
    var momentOrThrow = _.partialRight(ensure, 'moment', moment.isMoment, function (value) {
        return value.clone();
    });

    var current = current ? momentOrThrow(current) : moment(0);
    var tickSize = tickSize ? durationOrThrow(tickSize) : moment.duration(1, 'second');
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return {
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
    }
};

exports.StubDateClock = function (current, tickSizeMs, implicitTickFlag) {

    var numberOrThrow = _.partialRight(ensure, 'number of milliseconds', _.isNumber);
    var dateOrThrow = _.partialRight(ensure, 'date', _.isDate);

    var current = current ? dateOrThrow(current) : new Date(0);
    var tickSize = tickSizeMs ? numberOrThrow(tickSizeMs) : 1000;
    var implicitTickFlag = implicitTickFlag === undefined ? false : implicitTickFlag;

    return {
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
    }
};
