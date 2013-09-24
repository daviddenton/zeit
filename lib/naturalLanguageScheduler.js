'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util'), q = require('q'), ee = require('events');

function ScheduleBuilder(clock, promiseFn, startCallback) {
    var state = {
        promiseFn: promiseFn,
        invocationLimit: undefined,
        finishBeforeRescheduling: undefined,
        initialDelay: undefined,
        repeatInterval: undefined,
        continuePredicate: function () {
            return true;
        },
        stopPredicate: function () {
            return false;
        }
    };

    return {
        named: function (name) {
            state.name = name;
            return this;
        },
        every: function (duration) {
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
            state.continuePredicate = predicateFn;
            return this;
        },
        until: function (predicateFn) {
            state.stopPredicate = predicateFn;
            return this;
        },
        start: function () {
//            orThrow('repeatInterval', !state.repeatInterval && !!state.invocationLimit);
            return startCallback(state);
        }
    };
}

exports.NaturalLanguageScheduler = function (clock) {

    var activeSchedules = {};

    var events = new ee.EventEmitter();

    events.activeSchedule = function (id) {
        return activeSchedules[id];
    };

    events.cancel = function (id) {
        clock.clearTimeout(activeSchedules[id].clockId);
        delete activeSchedules[id];
    };

    events.cancelAll = function () {
        _.each(_.keys(activeSchedules), this.cancel);
    };

    function createPromiseCallbackFn(item, promiseFn, onDone) {
        return function () {
            if (item.invocationsLeft === 0) {
                return;
            }
            if (item.invocationsLeft) {
                item.invocationsLeft--;
            }

            if (!item.finishBeforeRescheduling && item.invocationsLeft > 0) {
                item.clockId = clock.setTimeout(createPromiseCallbackFn(item, promiseFn, onDone), item.repeatInterval);
            }

            item.latestStartTime = clock.now();
            item.invocationCount++;

            events.emit('start', item);
            promiseFn().then(function () {
                item.latestEndTime = clock.now();
                events.emit('finish', item);
            },function (err) {
                events.emit('error', _.extend({
                    error: err
                }, item));
            }).done(onDone);
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

        var callback = createPromiseCallbackFn(item, state.promiseFn, function (result) {
            if (state.stopPredicate(result) || !state.continuePredicate(result) ||
                item.invocationsLeft === 0 || (!item.invocationsLeft && !item.repeatInterval)) {
                delete activeSchedules[scheduleId];
            } else if (item.finishBeforeRescheduling) {
                item.clockId = clock.setTimeout(callback, item.repeatInterval);
            }
        });

        item.clockId = clock.setTimeout(callback, item.initialDelay || clock.numberOfMillisecondsAsDuration(0));

        activeSchedules[scheduleId] = item;

        return scheduleId;
    };

    events.execute = function (promiseFn) {
        return new ScheduleBuilder(clock, promiseFn, addSchedule);
    };

    return events;
};
