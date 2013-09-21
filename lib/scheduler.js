'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util'), q = require('q'), ee = require('events');

exports.PromiseScheduler = function (clock) {

    var activeSchedules = {};

    var events = new ee.EventEmitter();

    events.activeSchedules = function () {
        return activeSchedules;
    };

    function createPromiseCallbackFn(scheduleId, promiseFn, onDone) {
        return function () {
            activeSchedules[scheduleId].latestStartTime = clock.now();
            activeSchedules[scheduleId].invocationCount++;

            events.emit('start', activeSchedules[scheduleId]);
            promiseFn().then(function () {
                    activeSchedules[scheduleId].latestEndTime = clock.now();
                    events.emit('finish', activeSchedules[scheduleId]);
                },function (err) {
                    events.emit('error', _.extend({
                        error: err
                    }, activeSchedules[scheduleId]));
                }).done(onDone);
        };
    }

    events.schedule = function (promiseFn, duration, name) {
        var scheduleId = util.createGuid();

        var timeout = clock.numberOfMillisecondsAsDuration(clock.durationAsNumberOfMilliseconds(duration));

        activeSchedules[scheduleId] = {
            id: scheduleId,
            name: name,
            invocationCount: 0,
            creationTime: clock.now(),
            clockId: clock.setTimeout(createPromiseCallbackFn(scheduleId, promiseFn, _.noop), timeout)
        };
        return scheduleId;
    };

    events.scheduleEvery = function (promiseFn, duration, name) {
        var scheduleId = util.createGuid();

        var interval = clock.numberOfMillisecondsAsDuration(clock.durationAsNumberOfMilliseconds(duration));

        activeSchedules[scheduleId] = {
            id: scheduleId,
            name: name,
            invocationCount: 0,
            creationTime: clock.now()
        };

        var callback = createPromiseCallbackFn(scheduleId, promiseFn, function () {
            activeSchedules[scheduleId].clockId = clock.setTimeout(callback, interval);
        });

        callback();

        return scheduleId;
    };

    events.cancel = function (id) {
        clock.clearTimeout(activeSchedules[id].clockId);
        delete activeSchedules[id];
    };

    events.cancelAll = function () {
        _.each(_.keys(activeSchedules), this.cancel);
    };

    return events;
};