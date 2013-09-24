'use strict';

var chai = require('chai'), _ = require('lodash'), q = require('q'), moment = require('moment'), zeit = require('../'), assert = chai.assert;

chai.use(require('chai-timers'));

assert.momentEql = function (expected, actual, msg) {
    assert.equal(expected.toString(), actual.toString(), msg);
};

function EventCapture(emitter) {
    var events = {};
    return {
        listenTo: function () {
            _.each(arguments, function (name) {
                events[name] = [];
                emitter.on(name, function (event) {
                    events[name].push(event);
                });
            });
            return this;
        },
        captured: events
    };
}

//scheduler.execute(promise).andRepeatAfter(100).until(function () {}).start();
//scheduler.execute(promise).named('bob').every(1000).whilst(function () {}).start();
//scheduler.execute(promise).exactly(2).after(1000).start();
//scheduler.execute(promise).once().start();

// after() - succeeds, fails, no repetition
// exactly() - succeeds, fails, exact repetition
// once() - succeeds, fails, exact repetition
// andRepeatAfter() - repeat only on completion (on first tick)
// after().andRepeatAfter() - 1st tick initial, then repeat interval, then repeat interval, then still scheduled
// every() - first tick is repeat, then repeat at interval, then repeat at interval
// andRepeatAfter().until() - post condition, first tick is repeat, second tick cancels
// andRepeatAfter().whilst() - pre condition, first tick is repeat, second tick cancels, so never scheduled 2nd time

function PromiseToReturn(returnValue) {
    var invocationsCounter = [];
    var f = function () {
        invocationsCounter.push(0);
        return returnValue;
    };
    f.invocations = function () {
        return invocationsCounter.length;
    };
    return f;
}

function describeSchedulerContractUsing(clockType, ClockCtr) {

    function aClock() {
        var clock = new ClockCtr();
        clock.implicitTick(true);
        return  clock;
    }

    function setUpTest(returnValue) {
        var clock = aClock();
        var scheduler = new zeit.NaturalLanguageScheduler(clock);
        var promiseToReturn = new PromiseToReturn(returnValue);
        var events = new EventCapture(scheduler).listenTo('start', 'finish', 'error');
        return {
            clock: clock,
            scheduler: scheduler,
            scheduleBuilder: scheduler.execute(promiseToReturn),
            scheduleFor: function (scheduleId) {
                return scheduler.activeSchedule(scheduleId);
            },
            latestClockIdFor: function (scheduleId) {
                return this.scheduleFor(scheduleId).clockId;
            },
            clockTimeoutFor: function (scheduleId) {
                return clock.timeouts()[this.latestClockIdFor(scheduleId)];
            },
            assertInvocationCount: function (expected) {
                assert.equal(promiseToReturn.invocations(), expected);
            },
            assertEventCounts: function (started, finished, errors) {
//                console.log(started, finished, errors);
//                console.log(events.captured['start'].length, events.captured['finish'].length, events.captured['error'].length);
                assert.deepEqual(events.captured['start'].length, started);
                assert.deepEqual(events.captured['finish'].length, finished);
                assert.deepEqual(events.captured['error'].length, errors);
            },
            triggerAllClockSchedulesAndAssertExecuted: function (expected) {
                assert.deepEqual(clock.triggerAll(), expected);
            },
            assertThereIsNoActiveScheduleFor: function (scheduleId) {
                assert.equal(scheduler.activeSchedule(scheduleId), undefined);
            }
        };
    }

    describe('Natural Promise Scheduler backed by ' + clockType + ':', function () {

        function describeForAPromiseThatReturns(description, returnValue, starts, finishes, errors) {
            describe('no repeat for a promise that ' + description, function () {
                xdescribe('with no delay', function () {
                    var t = setUpTest(returnValue);
                    var scheduleId = t.scheduleBuilder.start();
                    var clockId = t.latestClockIdFor(scheduleId);

                    it('schedules the callback with no delay', function () {
                        assert.equal(t.scheduleFor(scheduleId).initialDelay, undefined);
                        assert.equal(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(0));
                    });

                    it('when triggered, callback is executed', function () {
                        t.triggerAllClockSchedulesAndAssertExecuted([clockId]);
                    });

                    it('after completion, the schedule is not rescheduled', function () {
                        t.assertInvocationCount(1);
                        t.triggerAllClockSchedulesAndAssertExecuted([]);
                        t.assertThereIsNoActiveScheduleFor(scheduleId);
                    });

                    it('emits the correct events', function () {
                        t.assertEventCounts(starts, finishes, errors);
                    });
                });

                describe('with delay', function () {
                    var t = setUpTest(returnValue);
                    var delay = t.clock.numberOfMillisecondsAsDuration(1000);
                    var scheduleId = t.scheduleBuilder.after(delay).start();
                    var clockId = t.latestClockIdFor(scheduleId);

                    it('schedules the callback with a delay', function () {
                        assert.equal(t.scheduleFor(scheduleId).initialDelay, delay);
                        assert.equal(t.clockTimeoutFor(scheduleId), delay);
                    });

                    it('when triggered, callback is executed', function () {
                        t.triggerAllClockSchedulesAndAssertExecuted([clockId]);
                    });

                    it('after completion, the schedule is not rescheduled', function () {
                        t.assertInvocationCount(1);
                        t.triggerAllClockSchedulesAndAssertExecuted([]);
                        t.assertThereIsNoActiveScheduleFor(scheduleId);
                    });

                    it('emits the correct events', function () {
                        t.assertEventCounts(starts, finishes, errors);
                    });
                });
            });
        }

        describeForAPromiseThatReturns('resolved', q.resolve('value'), 1, 1, 0);
        describeForAPromiseThatReturns('rejected', q.reject('value'), 1, 0, 1);
    });
}

//describeSchedulerContractUsing('moment based clock', zeit.StubMomentClock);

describeSchedulerContractUsing('date based clock', zeit.StubDateClock);

//        describe('fixed delay', function () {
//
//        });
//
//        describe('fixed invocations', function () {
//            describe('only invokes the set number of times', function () {
//
//            });
//            describe('only invokes once', function () {
//
//            });
//            )
//
//            describe('scheduling a resolved one-off promise', function () {
//                var clock = aClock();
//                var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                var events = new EventCapture(scheduler);
//                events.listenTo('start', 'finish');
//
//                var id;
//                it('triggers a scheduled promise', function (done) {
//                    id = scheduler.execute(function () {
//                        return q.resolve('some value');
//                    }).named('some name').after(clock.numberOfMillisecondsAsDuration(10)).start();
//                    assert.equal(clock.triggerAll().length, 1);
//                    _.defer(done);
//                });
//
//                it('emits the correct events', function () {
//                    assert.deepEqual(events.captured['start'].length, 1);
//                    assert.deepEqual(events.captured['finish'].length, 1);
//                    assert.equal(events.captured['error'], undefined);
//                });
//
//                it('cancels the schedule once run', function () {
//                    assert.equal(scheduler.activeSchedules()[id], undefined);
//                    assert.equal(clock.triggerAll().length, 0);
//                });
//            });
//
//            describe('scheduling a rejected one-off promise', function () {
//                var clock = aClock();
//                var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                var events = new EventCapture(scheduler);
//                events.listenTo('start', 'error');
//
//                var id;
//                it('triggers a scheduled promise', function (done) {
//                    id = scheduler.execute(function () {
//                        return q.reject('some error');
//                    }).named('some name').after(clock.numberOfMillisecondsAsDuration(10)).start();
//
//                    assert.equal(clock.triggerAll().length, 1);
//                    _.defer(done);
//                });
//
//                it('emits the correct events', function () {
//                    assert.deepEqual(events.captured['start'].length, 1);
//                    assert.equal(events.captured['finish'], undefined);
//                    assert.deepEqual(events.captured['error'].length, 1);
//                });
//
//                it('cancels the schedule once run', function () {
//                    assert.equal(scheduler.activeSchedules()[id], undefined);
//                    assert.equal(clock.triggerAll().length, 0);
//                });
//            });
//
//            describe('scheduling a repeating promise', function () {
//                var clock = aClock();
//                var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                var events = new EventCapture(scheduler);
//                events.listenTo('start', 'finish');
//
//                var id;
//                var hasRun = 0;
//
//                it('triggers a repeating promise at least once', function (done) {
//                    id = scheduler.execute(function () {
//                        hasRun++;
//                        return q.resolve('some value');
//                    }).named('some name').andRepeatAfter(clock.numberOfMillisecondsAsDuration(10)).start();
//
//                    assert.equal(clock.triggerAll().length, 1);
//
//                    _.defer(function () {
//                        assert.equal(hasRun, 1);
//                        done();
//                    });
//                });
//
//                it('triggers a repeating promise every time the clock triggers', function (done) {
//                    assert.equal(clock.triggerAll().length, 1);
//                    setTimeout(function () {
//                        assert.equal(hasRun, 2);
//                        assert.notEqual([scheduler.activeSchedules()[id]], undefined);
//                        done();
//                    }, 100);
//                });
//
//                it('emits the correct events', function () {
//                    assert.deepEqual(events.captured['start'].length, 2);
//                    assert.deepEqual(events.captured['finish'].length, 2);
//                });
//            });
//
//            xdescribe('scheduling a repeating rejected promise', function () {
//                var clock = aClock();
//                var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                var events = new EventCapture(scheduler);
//                events.listenTo('start', 'error');
//
//                var id;
//                var hasRun = 0;
//
//                it('triggers a rejected repeating promise right away', function () {
//                    id = scheduler.execute(function () {
//                        hasRun++;
//                        return q.reject('some error');
//                    }).named('some name').andRepeatAfter(clock.numberOfMillisecondsAsDuration(10)).start();
//                    _.defer(function () {
//                        assert.equal(hasRun, 1);
//                    })
//                });
//
//                it('triggers a repeating promise again', function (done) {
//                    clock.triggerAll();
//                    _.defer(function () {
//                        assert.equal(hasRun, 2);
//                        assert.notEqual([scheduler.activeSchedules()[id]], undefined);
//                        done();
//                    })
//                });
//
//                it('emits the correct events', function () {
//                    assert.deepEqual(events.captured['start'].length, 2);
//                    assert.deepEqual(events.captured['error'].length, 2);
//                });
//            });
//
//            describe('can query and cancel all active schedules', function () {
//
//                it('cancelling a single schedule', function () {
//                    var clock = aClock();
//                    var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                    var id = scheduler.execute(function () {
//                        return q.resolve('some value');
//                    }).named('some name').every(clock.numberOfMillisecondsAsDuration(10000)).start();
//
//                    assert.equal(_.size(scheduler.activeSchedules()), 1);
//                    assert.equal(scheduler.activeSchedules()[id].name, 'some name');
//
//                    scheduler.cancel(id);
//
//                    assert.equal(_.size(scheduler.activeSchedules()), 0);
//                });
//
//                it('cancelling all schedules', function () {
//                    var clock = aClock();
//                    var scheduler = new zeit.NaturalLanguageScheduler(clock);
//                    var id1 = scheduler.execute(function () {
//                        return q.resolve('some value');
//                    }).named('some name 1').every(clock.numberOfMillisecondsAsDuration(10000)).start();
//                    var id2 = scheduler.execute(function () {
//                        return q.resolve('some value');
//                    }).named('some name 2').every(clock.numberOfMillisecondsAsDuration(10000)).start();
//
//                    assert.equal(_.size(scheduler.activeSchedules()), 2);
//                    assert.equal(scheduler.activeSchedules()[id1].name, 'some name 1');
//                    assert.equal(scheduler.activeSchedules()[id2].name, 'some name 2');
//
//                    scheduler.cancelAll();
//
//                    assert.equal(_.size(scheduler.activeSchedules()), 0);
//                });
//            });
//        });
