'use strict';

var chai = require('chai'), _ = require('lodash'), q = require('q'), moment = require('moment'), zeit = require('../'), assert = chai.assert;

chai.use(require('chai-timers'));

assert.momentEql = function (expected, actual, msg) {
    assert.equal(expected.toString(), actual.toString(), msg);
};

var ZERO_MILLIS = 0;
var REPEAT_OF_ONE_SECOND = 1000;
var AFTER_INTERVAL = 1234;

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

function PromiseToExecute(returnValue) {
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

function setUpTest(ClockCtr, returnValue) {
    return function () {
        var clock = new ClockCtr();
        var scheduler = new zeit.NaturalLanguageScheduler(clock);
        var promise = new PromiseToExecute(returnValue);
        var events = new EventCapture(scheduler).listenTo('start', 'finish', 'error');
        return {
            startTime: clock.now(),
            scheduler: scheduler,
            clock: clock,
            executionCountIsLessThan: function (expected) {
                return function () {
                    return promise.invocations() < expected;
                }
            },
            executionCountIs: function (expected) {
                return function () {
                    return promise.invocations() === expected;
                }
            },
            startSchedule: function (modify) {
                return modify(scheduler.execute(promise).named('my function'), clock).start();
            },
            scheduleFor: function (scheduleId) {
                return scheduler.activeSchedule(scheduleId);
            },
            clockTimeoutFor: function (scheduleId) {
                return clock.timeouts()[this.scheduleFor(scheduleId).clockId];
            },
            assertInvocationCount: function (expected) {
                assert.equal(promise.invocations(), expected);
            },
            assertEventCounts: function (started, finished, errors) {
                assert.deepEqual(events.captured['start'].length, started);
                assert.deepEqual(events.captured['finish'].length, finished);
                assert.deepEqual(events.captured['error'].length, errors);
            },
            triggerAllClockSchedulesAndAssertExecuted: function (expectedScheduleIds) {
                var expectedClockIds = _.map(expectedScheduleIds, function (scheduleId) {
                    return scheduler.activeSchedule(scheduleId).clockId;
                });
                assert.deepEqual(clock.triggerAll(), expectedClockIds);
            },
            assertThereIsNoActiveScheduleFor: function (scheduleId) {
                assert.equal(this.scheduleFor(scheduleId), undefined);
            }
        };
    };
}

function describeRepetitionScenariosFor(name, expectedRepeatInterval, testFn, scheduleBuilderFn) {
    describe(name + ':', function () {

        describe('defaults', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(scheduleBuilderFn);

            it('has a 0ms initial delay', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(0));
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.lastKnownTime());
            });
        });

        describe('combined with after()', function () {
            var t = testFn();
            var startDelay = t.clock.numberOfMillisecondsAsDuration(AFTER_INTERVAL);
            var scheduleId = t.startSchedule(function (s, clock) {
                return scheduleBuilderFn(s, clock).after(startDelay);
            });

            it('initially is scheduled with the defined delay', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), startDelay);
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.timeIn(startDelay));
            });

            it('triggers when executed', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(1);
            });

            it('is rescheduled at the defined interval', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval));
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.timeIn(t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval)));
            });
        });

        describe('combined with whilst()', function () {
            var t = testFn();
            var startDelay = t.clock.numberOfMillisecondsAsDuration(AFTER_INTERVAL);
            var scheduleId = t.startSchedule(function (s, clock) {
                return scheduleBuilderFn(s, clock).whilst(t.executionCountIsLessThan(2));
            });

            it('triggers when executed', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(1);
            });

            it('is rescheduled at the defined interval', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval));
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.timeIn(t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval)));
            });

            it('triggers when executed again', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(2);
            });

            it('is now not rescheduled', function () {
                t.assertThereIsNoActiveScheduleFor(scheduleId);
            });
        });

        describe('combined with until()', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(function (s, clock) {
                return scheduleBuilderFn(s, clock).until(t.executionCountIsLessThan(2));
            });

            it('triggers when executed', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(1);
            });

            it('is rescheduled at the defined interval', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval));
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.timeIn(t.clock.numberOfMillisecondsAsDuration(expectedRepeatInterval)));
            });

            it('triggers when executed again', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(2);
            });

            it('is now not rescheduled', function () {
                t.assertThereIsNoActiveScheduleFor(scheduleId);
            });
        });
    });
}

function describeNoRepetitionScenariosFor(name, testFn, scheduleBuilderFn) {
    describe(name + ':', function () {

        describe('defaults', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(scheduleBuilderFn);

            it('has a 0ms initial delay', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), t.clock.numberOfMillisecondsAsDuration(0));
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.lastKnownTime());
            });
        });

        describe('after() sets a custom initial delay', function () {
            var t = testFn();
            var startDelay = t.clock.numberOfMillisecondsAsDuration(AFTER_INTERVAL);
            var scheduleId = t.startSchedule(function (s, clock) {
                return scheduleBuilderFn(s, clock).after(startDelay);
            });

            it('initially is scheduled with the defined delay', function () {
                assert.deepEqual(t.clockTimeoutFor(scheduleId), startDelay);
                assert.deepEqual(t.scheduleFor(scheduleId).nextTriggerTime, t.clock.timeIn(startDelay));
            });

            it('triggers when executed', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(1);
            });

            it('is now not rescheduled', function () {
                t.assertThereIsNoActiveScheduleFor(scheduleId);
            });
        });

        describe('whilst() sets a pre-condition for execution', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(function (s, clock) {
                return scheduleBuilderFn(s, clock).whilst(t.executionCountIsLessThan(0));
            });

            it('triggers when executed, but does not invoke the promise', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(0);
            });

            it('is now not rescheduled', function () {
                t.assertThereIsNoActiveScheduleFor(scheduleId);
            });
        });

        describe('until cannot be scheduled', function () {
            var t = testFn();
            it('blows up as cannot have a post-condition for a single-shot execution', function () {
                try {
                    t.startSchedule(function (s, clock) {
                        return scheduleBuilderFn(s.clock).until(t.executionCountIs(2));
                    });
                } catch (err) {
                    // expected
                }
            });
        });
    });
}

function describeSchedulerWhenPromiseIs(name, testFn, expectedStartEvents, expectedFinishEvents, expectedErrorEvents) {
    describe('for a promise which is ' + name + ':', function () {
        describe('correct events are emitted', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(_.identity);

            it('triggers when executed', function () {
                t.triggerAllClockSchedulesAndAssertExecuted([scheduleId]);
                t.assertInvocationCount(1);
            });

            it('emits then correct events', function () {
                t.assertEventCounts(expectedStartEvents, expectedFinishEvents, expectedErrorEvents);
            });
        });

        describe('cancelling a schedule', function () {
            var t = testFn();
            var scheduleId = t.startSchedule(_.identity);

            it('returns the cancelled details' ,function() {
                t.scheduler.cancel(scheduleId);
            });

            it('is now not scheduled', function () {
                t.assertThereIsNoActiveScheduleFor(scheduleId);
            });
        });

        describeNoRepetitionScenariosFor('single shot', testFn, _.identity);

        describeNoRepetitionScenariosFor('once()', testFn, function (scheduler) {
            return scheduler.once();
        });

        describeRepetitionScenariosFor('exactly()', ZERO_MILLIS, testFn, function (scheduler) {
            return scheduler.exactly(3);
        });

        describeRepetitionScenariosFor('andRepeatAfter()', REPEAT_OF_ONE_SECOND, testFn, function (scheduler, clock) {
            return scheduler.andRepeatAfter(clock.numberOfMillisecondsAsDuration(REPEAT_OF_ONE_SECOND));
        });

        describeRepetitionScenariosFor('atFixedIntervalOf()', REPEAT_OF_ONE_SECOND, testFn, function (scheduler, clock) {
            return scheduler.atFixedIntervalOf(clock.numberOfMillisecondsAsDuration(REPEAT_OF_ONE_SECOND));
        });

    });
}

function describeSchedulerUsing(name, ClockCtr) {
    describe('using a ' + name + ' clock:', function () {
        describeSchedulerWhenPromiseIs('successful', setUpTest(ClockCtr, q.resolve('ok value')), 1, 1, 0);
        describeSchedulerWhenPromiseIs('rejeced', setUpTest(ClockCtr, q.reject('err value')), 1, 0, 1);
    });
}

describe('natural language scheduler', function () {
    describeSchedulerUsing('date-based', zeit.StubDateClock);
    describeSchedulerUsing('moment-based', zeit.StubMomentClock);
});