'use strict';

var chai = require('chai'), _ = require('lodash'), q = require('q'), zeit = require('../'), moment = require('moment'), assert = chai.assert;

chai.use(require('chai-timers'));

describe('scheduler', function () {

    function EventCapture(emitter) {
        var events = {};
        return {
            listenTo: function () {
                _.each(arguments, function (name) {
                    events[name] = [];
                    emitter.on(name, function (event) {
                        events[name].push(event);
                    })
                })
            },
            captured: events
        };
    }

    describe('scheduling a resolved one-off promise', function () {
        var clock = zeit.StubMomentClock();
        var scheduler = new zeit.PromiseScheduler(clock);
        var events = new EventCapture(scheduler);
        events.listenTo('start', 'finish');

        it('triggers a scheduled promise', function (done) {
            var id = scheduler.schedule(function () {
                return q.resolve();
            }, moment.duration(10), 'some name');
            _.defer(function () {
                assert.deepEqual(clock.triggerAll(), [scheduler.activeSchedules()[id].clockId]);
                done();
            })
        });

        it('emits the correct events', function () {
            assert.deepEqual(events.captured['start'].length, 1);
            assert.deepEqual(events.captured['finish'].length, 1);
        });

        it('cancels the schedule once run', function () {
            assert.equal(clock.triggerAll().length, 0);
        });
    });

    describe('scheduling a rejected one-off promise', function () {
        var clock = zeit.StubMomentClock();
        var scheduler = new zeit.PromiseScheduler(clock);
        var events = new EventCapture(scheduler);
        events.listenTo('start', 'error');

        it('triggers a scheduled promise', function (done) {
            var id = scheduler.schedule(function () {
                return q.reject();
            }, moment.duration(10), 'some name');
            var idsRun = clock.triggerAll();
            _.defer(function () {
                assert.deepEqual([scheduler.activeSchedules()[id].clockId], idsRun);
                done();
            })
        });

        it('emits the correct events', function () {
            assert.deepEqual(events.captured['start'].length, 1);
            assert.deepEqual(events.captured['error'].length, 1);
        });

        it('cancels the schedule once run', function () {
            assert.equal(clock.triggerAll().length, 0);
        });
    });

    describe('scheduling a repeating promise', function () {
        var clock = zeit.StubMomentClock();
        var scheduler = new zeit.PromiseScheduler(clock);
        var events = new EventCapture(scheduler);
        events.listenTo('start', 'finish');

        var id;
        var hasRun = 0;

        it('triggers a repeating promise right away', function (done) {
            id = scheduler.scheduleEvery(function () {
                hasRun++;
                return q.resolve();
            }, moment.duration(10), 'some name');
            setTimeout(function () {
                assert.equal(hasRun, 1);
                done();
            }, 100);
        });

        it('triggers a repeating promise again', function (done) {
            clock.triggerAll();
            setTimeout(function () {
                assert.equal(hasRun, 2);
                assert.notEqual([scheduler.activeSchedules()[id]], undefined);
                done();
            }, 100);
        });

        it('emits the correct events', function () {
            assert.deepEqual(events.captured['start'].length, 2);
            assert.deepEqual(events.captured['finish'].length, 2);
        });
    });

    describe('scheduling a repeating rejected promise', function () {
        var clock = zeit.StubMomentClock();
        var scheduler = new zeit.PromiseScheduler(clock);
        var events = new EventCapture(scheduler);
        events.listenTo('start', 'error');

        var id;
        var hasRun = 0;

        it('triggers a rejected repeating promise right away', function () {
            id = scheduler.scheduleEvery(function () {
                hasRun++;
                return q.reject();
            }, moment.duration(10), 'some name');
            _.defer(function () {
                assert.equal(hasRun, 1);
            })
        });

        it('triggers a repeating promise again', function (done) {
            clock.triggerAll();
            _.defer(function () {
                assert.equal(hasRun, 2);
                assert.notEqual([scheduler.activeSchedules()[id]], undefined);
                done();
            })
        });

        it('emits the correct events', function () {
            assert.deepEqual(events.captured['start'].length, 2);
            assert.deepEqual(events.captured['error'].length, 2);
        });
    });
});

