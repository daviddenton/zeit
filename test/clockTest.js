'use strict';

var chai = require('chai');
var zeit = require('../'), moment = require('moment'), assert = chai.assert;

chai.use(require('chai-timers'));

assert.momentEql = function (expected, actual) {
    assert.equal(expected.toString(), actual.toString());
};

function describeClockContract(name, ctr, intervalFn, timeFn, greaterThan) {
    describe(name + ' clock', function () {
        var clock = new ctr();

        it('now()', function () {
            assert.equal(clock.now().toString(), timeFn().toString());
        });

        it('can set and cancel interval', function (done) {
            var timer = new chai.Timer().start();

            var calls = 0;
            var id = clock.setInterval(function () {
                calls++;
                if (calls === 2) {
                    clock.clearInterval(id);
                    timer.stop();
                    assert.ok(greaterThan(timer.elapsed, intervalFn(2)));
                    done();
                }
            }, intervalFn(1));
        });

        it('can set timeout', function (done) {
            var timer = new chai.Timer().start();

            clock.setTimeout(function () {
                timer.stop();
                assert.ok(greaterThan(timer.elapsed, intervalFn(1)));
                done();
            }, intervalFn(1));
        });

        it('can cancel timeout', function (done) {
            clock.setTimeout(function () {
                done();
            }, intervalFn(10));
            var id = clock.setTimeout(function () {
                assert.fail();
            }, intervalFn(5));
            clock.clearTimeout(id);
        });
    });
}

function describeStubClockContract(name, CtrFn, timeAtSeconds, durationOfSeconds) {
    describe(name, function () {

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
            assert.momentEql(clock.tick(), timeAtSeconds(1));
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
    });
}

describeClockContract('date based', zeit.DateClock, function (i) {return 10 * i;}, function () {
    return new Date();
}, function (a, b) {return a >= b});

describeClockContract('moment based', zeit.MomentClock, function (i) {return moment.duration(10 * i);}, function () {
    return moment();
}, function (a, b) {return a >= b.asMilliseconds();});

describeStubClockContract('stub moment clock', zeit.StubMomentClock, function (seconds) {
    return moment(seconds * 1000)
}, function (seconds) {
    return moment.duration(seconds, 'second');
});

describeStubClockContract('stub date clock', zeit.StubDateClock, function (seconds) {
    return new Date(seconds * 1000);
}, function (seconds) {
    return seconds * 1000;
});

