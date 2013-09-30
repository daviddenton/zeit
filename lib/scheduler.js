'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util'), q = require('q'), ee = require('events');

function ScheduleItemBuilder(clock, promiseFn, startCallback) {
    var state = {
        promiseFn: promiseFn,
        invocationLimit: undefined,
        finishBeforeRescheduling: true,
        initialDelay: undefined,
        repeatInterval: undefined,
        prePredicate: function () {
            return true;
        },
        postPredicate: function () {
            return true;
        }
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
        return _.chain(activeSchedules).keys().map(this.cancel).map(function (cancelledSchedule) {
                return [cancelledSchedule.id, cancelledSchedule];
            }).object().value();
    };

    function ensurePromise(fn) {
        try {
            return q(fn());
        } catch(e) {
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
                if (state.postPredicate()) {
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
            ensurePromise(state.promiseFn).done(function (result) {
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
            if (!state.prePredicate(item) || !state.postPredicate(err, result) || item.invocationsLeft === 0 || (!item.invocationsLeft && !item.repeatInterval)) {
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

    events.execute = function (promiseFn) {
        return new ScheduleItemBuilder(clock, promiseFn, addSchedule);
    };

    return events;
};
