'use strict';

var _ = require('lodash'), util = require('./util'), q = require('q'), ee = require('events');

function ScheduleItemBuilder(clock, callbackFn, startCallback) {
    var state = {
        callbackFn: callbackFn,
        invocationLimit: undefined,
        finishBeforeRescheduling: true,
        initialDelay: undefined,
        repeatInterval: undefined,
        prePredicate: undefined,
        postPredicate: undefined
    };

    return {
        named: function (name) {
            state.name = name;
            return this;
        },
        atFixedIntervalOf: function (duration) {
            state.finishBeforeRescheduling = false;
            state.repeatInterval = duration;
            return this;
        },
        after: function (delay) {
            state.initialDelay = delay;
            return this;
        },
        at: function (time) {
            state.initialDelay = clock.durationUntil(time);
            return this;
        },
        andRepeatAfter: function (duration) {
            state.finishBeforeRescheduling = true;
            state.repeatInterval = duration;
            return this;
        },
        once: function () {
            state.invocationsLeft = 1;
            return this;
        },
        exactly: function (times) {
            state.invocationsLeft = times;
            return this;
        },
        whilst: function (predicateFn) {
            state.prePredicate = predicateFn;
            return this;
        },
        until: function (predicateFn) {
            state.postPredicate = predicateFn;
            return this;
        },
        start: function () {
            if (state.postPredicate && (state.repeatInterval === undefined) && (!state.invocationsLeft || state.invocationsLeft === 1)) {
                throw new Error("Cannot specify an until() without repeating!");
            }
            if (!state.postPredicate) {
                state.postPredicate = function () {
                    return false;
                };
            }
            if (!state.prePredicate) {
                state.prePredicate = function () {
                    return true;
                };
            }
            return startCallback(state);
        }
    };
}

exports.Scheduler = function (clock) {

    var activeSchedules = {};

    var events = new ee.EventEmitter();

    events.activeSchedule = function (id) {
        return activeSchedules[id];
    };

    events.cancel = function (id) {
        var scheduleToCancel = activeSchedules[id];
        clock.clearTimeout(scheduleToCancel.clockId);
        delete activeSchedules[id];
        return scheduleToCancel;
    };

    events.cancelAll = function () {
        return _(activeSchedules).keys().map(this.cancel).map(function (cancelledSchedule) {
            return [cancelledSchedule.id, cancelledSchedule];
        }).fromPairs().value();
    };

    function ensurePromise(fn) {
        try {
            return q(fn());
        } catch (e) {
            return q.reject(e);
        }
    }

    function createPromiseCallbackFn(item, state, onDone) {
        return function () {
            if (item.invocationsLeft === 0 || !state.prePredicate(item)) {
                onDone();
                return;
            }

            item.latestStartTime = clock.now();
            item.invocationCount++;

            if (!item.finishBeforeRescheduling) {
                if (!state.postPredicate()) {
                    if (!item.invocationsLeft || (item.invocationsLeft && item.invocationsLeft > 0)) {
                        var timeout = item.repeatInterval || clock.numberOfMillisecondsAsDuration(0);
                        item.nextTriggerTime = clock.timeIn(timeout);
                        item.clockId = clock.setTimeout(createPromiseCallbackFn(item, state, onDone), timeout);
                    }
                }
            }

            if (item.invocationsLeft) {
                item.invocationsLeft--;
            }

            events.emit('start', item);
            ensurePromise(state.callbackFn).done(function (result) {
                item.latestEndTime = clock.now();
                events.emit('finish', item);
                onDone(undefined, result);
            }, function (err) {
                events.emit('error', _.extend({
                    error: err
                }, item));
                onDone(err);
            });
        };
    }

    var addSchedule = function (state) {
        var scheduleId = util.createGuid();

        var item = {
            id: scheduleId,
            name: state.name,
            invocationsLeft: state.invocationsLeft,
            finishBeforeRescheduling: state.finishBeforeRescheduling,
            initialDelay: state.initialDelay,
            repeatInterval: state.repeatInterval,
            invocationCount: 0,
            creationTime: clock.now()
        };

        var callback = createPromiseCallbackFn(item, state, function (err, result) {
            if (!state.prePredicate(item) || state.postPredicate(err, result) || item.invocationsLeft === 0 || (!item.invocationsLeft && (item.repeatInterval === undefined))) {
                clock.clearTimeout(item.clockId);
                delete activeSchedules[scheduleId];
            } else if (item.finishBeforeRescheduling) {
                var timeout = item.repeatInterval || clock.numberOfMillisecondsAsDuration(0);
                item.nextTriggerTime = clock.timeIn(timeout);
                item.clockId = clock.setTimeout(callback, timeout);
            }
        });

        var timeout = item.initialDelay || clock.numberOfMillisecondsAsDuration(0);
        item.nextTriggerTime = clock.timeIn(timeout);
        item.clockId = clock.setTimeout(callback, timeout);

        activeSchedules[scheduleId] = item;

        return scheduleId;
    };

    events.execute = function (callbackFn) {
        return new ScheduleItemBuilder(clock, callbackFn, addSchedule);
    };

    return events;
};
