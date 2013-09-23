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

            it('triggers a scheduled promise', function (done) {
                scheduler.execute(function () {
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
                assert.equal(clock.triggerAll().length, 0);
            });
        });

        describe('scheduling a rejected one-off promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            it('triggers a scheduled promise', function (done) {
                scheduler.execute(function () {
                    return q.reject('some error');
                }).named('some name').after(clock.numberOfMillisecondsAsDuration(10)).start();

                assert.equal(clock.triggerAll().length, 1);
                _.defer(done)
            });

            it('emits the correct events', function () {
                assert.deepEqual(events.captured['start'].length, 1);
                assert.equal(events.captured['finish'], undefined);
                assert.deepEqual(events.captured['error'].length, 1);
            });

            it('cancels the schedule once run', function () {
                assert.equal(clock.triggerAll().length, 0);
            });
        });

        xdescribe('scheduling a repeating promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'finish');

            var id;
            console.log('reset');
            var hasRun;
            before(function () {
                hasRun = 0;
            })

            it('triggers a repeating promise at least once', function (done) {
                id = scheduler.execute(function () {
                    hasRun++;
                    console.log('hello', hasRun);
                    return q.resolve('some value');
                }).named('some name').every(clock.numberOfMillisecondsAsDuration(10)).start();
                clock.triggerAll();
                setTimeout(function () {
                    assert.equal(hasRun, 1);
                    done();
                }, 100);
            });

            it('triggers a repeating promise every time the clock triggers', function (done) {
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

        xdescribe('scheduling a repeating rejected promise', function () {
            var clock = aClock();
            var scheduler = new zeit.NaturalLanguageScheduler(clock);
            var events = new EventCapture(scheduler);
            events.listenTo('start', 'error');

            var id;
            var hasRun = 0;

            it('triggers a rejected repeating promise right away', function () {
                id = scheduler.scheduleEvery(function () {
                    hasRun++;
                    return q.reject('some error');
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

        xdescribe('can query and cancel all active schedules', function () {

            it('cancelling a single schedule', function () {
                var clock = aClock();
                var scheduler = new zeit.NaturalLanguageScheduler(clock);
                var id = scheduler.schedule(function () {
                    return q.resolve('some value');
                }, clock.numberOfMillisecondsAsDuration(10000), 'some name');

                assert.equal(_.size(scheduler.activeSchedules()), 1);
                assert.equal(scheduler.activeSchedules()[id].name, 'some name');

                scheduler.cancel(id);

                assert.equal(_.size(scheduler.activeSchedules()), 0);
            });

            it('cancelling all schedules', function () {
                var clock = aClock();
                var scheduler = new zeit.NaturalLanguageScheduler(clock);
                var id1 = scheduler.schedule(function () {
                    return q.resolve('some value');
                }, clock.numberOfMillisecondsAsDuration(10000), 'some name 1');
                var id2 = scheduler.schedule(function () {
                    return q.resolve('some value');
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
