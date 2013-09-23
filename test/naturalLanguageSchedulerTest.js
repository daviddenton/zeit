'use strict';

var chai = require('chai'), _ = require('lodash'), q = require('q'), zeit = require('../'), assert = chai.assert;

chai.use(require('chai-timers'));

function describeSchedulerContractUsing(clockType, ClockCtr) {
    function aClock() {
        var clock = new ClockCtr();
        clock.implicitTick(true);
        return  clock;
    }

    describe('Natural Promise Scheduler using ' + clockType, function () {

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
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'finish');

            var id;
            it('triggers a scheduled promise', function (done) {
                id = scheduler.execute(function () {
                    return q.resolve('some value');
                }).named('some name').after(clock.numberOfMillisecondsAsDuration(10)).start();
                assert.equal(clock.triggerAll().length, 1);
                _.defer(done);
            });

            it('emits the correct events', function () {
                assert.deepEqual(events.captured['start'].length, 1);
                assert.deepEqual(events.captured['finish'].length, 1);
                assert.equal(events.captured['error'], undefined);
            });

            it('cancels the schedule once run', function () {
                assert.equal(scheduler.activeSchedules()[id], undefined);
                assert.equal(clock.triggerAll().length, 0);
            });
        });

        describe('scheduling a rejected one-off promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            var id;
            it('triggers a scheduled promise', function (done) {
                id = scheduler.execute(function () {
                    return q.reject('some error');
                }).named('some name').after(clock.numberOfMillisecondsAsDuration(10)).start();

                assert.equal(clock.triggerAll().length, 1);
                _.defer(done);
            });

            it('emits the correct events', function () {
                assert.deepEqual(events.captured['start'].length, 1);
                assert.equal(events.captured['finish'], undefined);
                assert.deepEqual(events.captured['error'].length, 1);
            });

            it('cancels the schedule once run', function () {
                assert.equal(scheduler.activeSchedules()[id], undefined);
                assert.equal(clock.triggerAll().length, 0);
            });
        });

        describe('scheduling a repeating promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'finish');

            var id;
            var hasRun = 0;

            it('triggers a repeating promise at least once', function (done) {
                id = scheduler.execute(function () {
                    hasRun++;
                    return q.resolve('some value');
                }).named('some name').andRepeatAfter(clock.numberOfMillisecondsAsDuration(10)).start();

                assert.equal(clock.triggerAll().length, 1);

                _.defer(function () {
                    assert.equal(hasRun, 1);
                    done();
                });
            });

            it('triggers a repeating promise every time the clock triggers', function (done) {
                assert.equal(clock.triggerAll().length, 1);
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

        xdescribe('scheduling a repeating rejected promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            var id;
            var hasRun = 0;

            it('triggers a rejected repeating promise right away', function () {
                id = scheduler.execute(function () {
                    hasRun++;
                    return q.reject('some error');
                }).named('some name').andRepeatAfter(clock.numberOfMillisecondsAsDuration(10)).start();
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
                var clock = aClock();
                var scheduler = new zeit.NaturalLanguageScheduler(clock);
                var id = scheduler.execute(function () {
                    return q.resolve('some value');
                }).named('some name').every(clock.numberOfMillisecondsAsDuration(10000)).start();

                assert.equal(_.size(scheduler.activeSchedules()), 1);
                assert.equal(scheduler.activeSchedules()[id].name, 'some name');

                scheduler.cancel(id);

                assert.equal(_.size(scheduler.activeSchedules()), 0);
            });

            it('cancelling all schedules', function () {
                var clock = aClock();
                var scheduler = new zeit.NaturalLanguageScheduler(clock);
                var id1 = scheduler.execute(function () {
                    return q.resolve('some value');
                }).named('some name 1').every(clock.numberOfMillisecondsAsDuration(10000)).start();
                var id2 = scheduler.execute(function () {
                    return q.resolve('some value');
                }).named('some name 2').every(clock.numberOfMillisecondsAsDuration(10000)).start();

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
