'use strict';

var chai = require('chai');
var zeit = require('../');
var moment = require('moment');
var assert = chai.assert;

chai.use(require('chai-timers'));

var TOLERANCE_IN_MILLIS = 10;

assert.momentEql = function (expected, actual, msg) {
    assert.ok(expected.diff(actual) < TOLERANCE_IN_MILLIS, msg);
};

function describeRealClockContract(name, ctr, durationInMillisFn, timeFn, greaterThan, assertDateEql, incrementFn) {
    describe(name + ' Clock', function () {
        var clock = new ctr();

        it('now()', function () {
            assertDateEql(clock.now(), timeFn());
        });

        it('timeIn()', function () {
            assertDateEql(clock.timeIn(clock.numberOfMillisecondsAsDuration(2000)), incrementFn(clock.now(), 2000));
        });

        it('durationUntil()', function () {
            var actual = clock.durationUntil(clock.timeIn(clock.numberOfMillisecondsAsDuration(2000)));
            assert.ok((durationInMillisFn(actual) - 2000) < TOLERANCE_IN_MILLIS);
        });

        it('can set and cancel interval', function (done) {
            var timer = new chai.Timer().start();

            var calls = 0;
            var id = clock.setInterval(function () {
                calls++;
                if (calls === 2) {
                    clock.clearInterval(id);
                    timer.stop();
                    assert.ok(greaterThan(timer.elapsed, durationInMillisFn(20)));
                    done();
                }
            }, durationInMillisFn(10));
        });

        it('can set timeout', function (done) {
            var timer = new chai.Timer().start();

            clock.setTimeout(function () {
                timer.stop();
                assert.ok(greaterThan(timer.elapsed, durationInMillisFn(10)));
                done();
            }, durationInMillisFn(10));
        });

        it('can cancel timeout', function (done) {
            clock.setTimeout(function () {
                done();
            }, durationInMillisFn(100));
            var id = clock.setTimeout(function () {
                assert.fail();
            }, durationInMillisFn(50));
            clock.clearTimeout(id);
        });

        it('converts duration to milliseconds', function () {
            assert.equal(clock.numberOfMillisecondsAsDuration(100).toString(), durationInMillisFn(100).toString());
        });
    });
}

function describeStubClockContract(name, CtrFn, timeAtSeconds, durationOfSeconds) {
    describe(name + ' Clock', function () {

        it('default settings for clock', function () {
            var clock = new CtrFn();
            assert.equal(clock.implicitTick(), false);
            assert.momentEql(clock.now(), timeAtSeconds(0));
            assert.momentEql(clock.tickSize(), durationOfSeconds(1));
        });

        it('constructor settings for clock', function () {
            var clock = new CtrFn(timeAtSeconds(1), durationOfSeconds(2), false);
            assert.equal(clock.implicitTick(), false);
            assert.momentEql(clock.now(), timeAtSeconds(1));
            assert.momentEql(clock.tickSize(), durationOfSeconds(2));
        });

        it('timeIn()', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.timeIn(durationOfSeconds(2)), timeAtSeconds(2));
        });

        it('durationUntil()', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.durationUntil(timeAtSeconds(2)), durationOfSeconds(2));
        });

        it('now() uses default time and no implicit tick', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.now(), timeAtSeconds(0));
            assert.momentEql(clock.now(), timeAtSeconds(0));
        });

        it('now() using custom time', function () {
            var clock = new CtrFn(timeAtSeconds(1), durationOfSeconds(2), false);
            assert.momentEql(clock.now(), timeAtSeconds(1));
        });

        it('now() can modify time', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.now(timeAtSeconds(1)), timeAtSeconds(1));
        });

        it('tick() uses default ticksize', function () {
            var clock = new CtrFn();
            var expected = clock.tick();
            assert.momentEql(expected, timeAtSeconds(1));
            assert.momentEql(clock.now(), timeAtSeconds(1));
        });

        it('tick() set to ticksize set on construction', function () {
            var clock = new CtrFn(timeAtSeconds(1), durationOfSeconds(2), false);
            assert.momentEql(clock.tick(), timeAtSeconds(3));
            assert.momentEql(clock.now(), timeAtSeconds(3));
        });

        it('tick() by custom amount', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.tick(durationOfSeconds(2)), timeAtSeconds(2));
            assert.momentEql(clock.now(), timeAtSeconds(2));
        });

        it('tickSize() modifies tick size', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.tickSize(durationOfSeconds(2)), durationOfSeconds(2));
            clock.tick();
            assert.momentEql(clock.now(), timeAtSeconds(2));
        });

        it('implicitTick() can turn on and off the tick when calling now()', function () {
            var clock = new CtrFn();
            assert.momentEql(clock.now(), timeAtSeconds(0));
            assert.equal(clock.implicitTick(true), true);
            assert.momentEql(clock.now(), timeAtSeconds(1));
            assert.equal(clock.implicitTick(false), false);
            assert.momentEql(clock.now(), timeAtSeconds(1));
        });

        function Capture() {
            var calls = 0;
            var fn = function () {
                calls++;
            };
            fn.count = function () {
                return calls;
            };
            return fn;
        }

        it('timeouts trigger then cancel', function () {
            var clock = new CtrFn();
            var cb = new Capture();
            clock.setTimeout(cb, 10);
            clock.triggerAll();
            assert.equal(cb.count(), 1);
            clock.triggerAll();
            assert.equal(cb.count(), 1);
        });

        it('cancel timeouts', function () {
            var clock = new CtrFn();
            var cb = new Capture();
            clock.clearTimeout(clock.setTimeout(cb, 10));
            clock.triggerAll();
            assert.equal(cb.count(), 0);
        })

        it('intervals trigger then stay', function () {
            var clock = new CtrFn();
            var cb = new Capture();
            clock.setInterval(cb, 10);
            clock.triggerAll();
            assert.equal(cb.count(), 1);
            clock.triggerAll();
            assert.equal(cb.count(), 2);
        });

        it('cancel timeouts', function () {
            var clock = new CtrFn();
            var cb = new Capture();
            clock.clearInterval(clock.setInterval(cb, 10));
            clock.triggerAll();
            assert.equal(cb.count(), 0);
        })

        it('converts duration to milliseconds', function () {
            assert.equal(new CtrFn().numberOfMillisecondsAsDuration(1000).toString(), durationOfSeconds(1).toString());
        });
    });
}

describeRealClockContract('Date-Based', zeit.DateClock,
    function (i) {return i;},
    function (optionalTime) { return optionalTime ? new Date(optionalTime) : new Date(); },
    function (a, b) {return a >= b},
    function (a, b) { assert.ok(a.getTime() - b.getTime() < TOLERANCE_IN_MILLIS); },
    function (theTime, tickSize) { return new Date(theTime.getTime() + tickSize);
});

describeRealClockContract('Moment-based', zeit.MomentClock,
    function (i) {return moment.duration(i);},
    function (optionalTime) { return optionalTime ? moment(optionalTime) : moment(); },
    function (a, b) {return a >= b.asMilliseconds();},
    assert.momentEql,
    function(theTime, tickSize) { return moment(theTime).add(tickSize);
});

describeStubClockContract('Stub Moment', zeit.StubMomentClock,
    function (seconds) { return moment(seconds * 1000) },
    function (seconds) { return moment.duration(seconds, 'second'); }
);

describeStubClockContract('Stub Date', zeit.StubDateClock,
    function (seconds) { return new Date(seconds * 1000); },
    function (seconds) { return seconds * 1000; }
);

