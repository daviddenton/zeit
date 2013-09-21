'use strict';

var chai = require('chai'), _ = require('lodash'), q = require('q'), zeit = require('../'), assert = chai.assert;

chai.use(require('chai-timers'));

function describeSchedulerContractUsing(clockType, ClockCtr) {
    describe('Promise Scheduler using ' + clockType, function () {

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
            var clock = new ClockCtr();
            var scheduler = new zeit.PromiseScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'finish');

            it('triggers a scheduled promise', function (done) {
                var id = scheduler.schedule(function () {
                    return q.resolve();
                }, clock.numberOfMillisecondsAsDuration(10), 'some name');
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
            var clock = new ClockCtr();
            var scheduler = new zeit.PromiseScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            it('triggers a scheduled promise', function (done) {
                var id = scheduler.schedule(function () {
                    return q.reject();
                }, clock.numberOfMillisecondsAsDuration(10), 'some name');
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
            var clock = new ClockCtr();
            var scheduler = new zeit.PromiseScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'finish');

            var id;
            var hasRun = 0;

            it('triggers a repeating promise right away', function (done) {
                id = scheduler.scheduleEvery(function () {
                    hasRun++;
                    return q.resolve();
                }, clock.numberOfMillisecondsAsDuration(10), 'some name');
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
            var clock = new ClockCtr();
            var scheduler = new zeit.PromiseScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            var id;
            var hasRun = 0;

            it('triggers a rejected repeating promise right away', function () {
                id = scheduler.scheduleEvery(function () {
                    hasRun++;
                    return q.reject();
                }, clock.numberOfMillisecondsAsDuration(10), 'some name');
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

        describe('can query and cancel all active schedules', function () {

            it('cancelling a single schedule', function () {
                var clock = new ClockCtr();
                var scheduler = new zeit.PromiseScheduler(clock);
                var id = scheduler.schedule(function () {
                    return q.resolve();
                }, clock.numberOfMillisecondsAsDuration(10000), 'some name');

                assert.equal(_.size(scheduler.activeSchedules()), 1);
                assert.equal(scheduler.activeSchedules()[id].name, 'some name');

                scheduler.cancel(id);

                assert.equal(_.size(scheduler.activeSchedules()), 0);
            });

            it('cancelling all schedules', function () {
                var clock = new ClockCtr();
                var scheduler = new zeit.PromiseScheduler(clock);
                var id1 = scheduler.schedule(function () {
                    return q.resolve();
                }, clock.numberOfMillisecondsAsDuration(10000), 'some name 1');
                var id2 = scheduler.schedule(function () {
                    return q.resolve();
                }, clock.numberOfMillisecondsAsDuration(10000), 'some name 2');

                assert.equal(_.size(scheduler.activeSchedules()), 2);
                assert.equal(scheduler.activeSchedules()[id1].name, 'some name 1');
                assert.equal(scheduler.activeSchedules()[id2].name, 'some name 2');

                scheduler.cancelAll();

                assert.equal(_.size(scheduler.activeSchedules()), 0);
            });
        });
    });
}

describeSchedulerContractUsing('moment based clock', zeit.StubMomentClock);

describeSchedulerContractUsing('date based clock', zeit.StubDateClock);
