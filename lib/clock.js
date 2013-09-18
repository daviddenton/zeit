'use strict'

var moment = require('moment');

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

exports.StubMomentClock = function (current, tickSize) {
    var current = current ? momentOrThrow(current) : moment(0);
    var tickSize = tickSize ? durationOrThrow(tickSize) : moment.duration(1, 'second');
    var implicitTick = false;

    function durationOrThrow(duration) {
        if (moment.isDuration(duration)) {
            return duration;
        } else {
            throw new Error(duration + ' is not a duration');
        }
    }

    function momentOrThrow(candidate) {
        if (moment.isMoment(candidate)) {
            return candidate.clone();
        } else {
            throw new Error(candidate + ' is not a moment');
        }
    }

    return {
        now: function () {
            if (arguments.length > 0) {
                current = momentOrThrow(arguments[0]);
            } else if (implicitTick) {
                return this.tick();
            }
            return moment(current);
        },
        tick: function (duration) {
            current = current.add(arguments.length > 0 ? durationOrThrow(arguments[0]) : tickSize);
            return this.now();
        },
        tickSize: function (duration) {
            if(duration) {
                tickSize = durationOrThrow(duration);
            }
            return tickSize;
        },
        implicitTick: function (newImplicitTick) {
            implicitTick = newImplicitTick;
            return implicitTick;
        }
    }
};
