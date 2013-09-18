'use strict';

var moment = require('moment'), _ = require('lodash'), util = require('./util'), q = require('q'), ee = require('events');

var durationOrThrow = _.partialRight(util.ensure, 'duration', moment.isDuration);

exports.PromiseScheduler = function (clock) {

    var activeSchedules = {};

    var events = new ee.EventEmitter();

    events.activeSchedules = function () {
        return activeSchedules;
    };

    function createPromiseCallbackFn(scheduleId, promiseFn, onDone) {
        return function () {
            events.emit('start', {
                id: scheduleId
            });
            promiseFn().then(function () {
                events.emit('finish', {
                    id: scheduleId
                });
            }).catch(function (err) {
                    events.emit('error', {
                        id: scheduleId,
                        error: err
                    });
                }).done(onDone);
        };
    }

    events.schedule = function (promiseFn, duration, name) {
        var scheduleId = util.createGuid();
        activeSchedules[scheduleId] = {
            name: name,
            clockId: clock.setTimeout(createPromiseCallbackFn(scheduleId, promiseFn, _.noop), durationOrThrow(duration))
        };
        return scheduleId;
    };

    events.scheduleEvery = function (promiseFn, duration, name) {
        var scheduleId = util.createGuid();
        activeSchedules[scheduleId] = {
            name: name
        };

        var callback = createPromiseCallbackFn(scheduleId, promiseFn, function () {
            activeSchedules[scheduleId].clockId = clock.setTimeout(callback, durationOrThrow(duration));
        });

        callback();

        return scheduleId;
    };

    events.cancel = function (id) {
        clock.clearTimeout(activeSchedules[id].clockId);
        delete activeSchedules[id];
    };

    return events;
};