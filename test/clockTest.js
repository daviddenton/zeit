'use strict';

var chai = require('chai');
var zeit = require('../'), moment = require('moment'), assert = chai.assert;

chai.use(require('chai-timers'));

describe('a date based clock', function () {
    var clock = new zeit.DateClock();

    it('now()', function () {
        assert.equal(clock.now().toString(), new Date().toString());
    });

    it('can set and cancel interval', function (done) {
        var timer = new chai.Timer().start();

        var interval = 10;
        var calls = 0;
        var id = clock.setInterval(function () {
            calls++;
            if (calls === 2) {
                clock.clearInterval(id);
                timer.stop();
                assert.ok(timer.elapsed > interval * 2);
                done();
            }
        }, interval);
    });

    it('can set timeout', function (done) {
        var timer = new chai.Timer().start();

        var interval = 10;
        var id = clock.setTimeout(function () {
            timer.stop();
            assert.ok(timer.elapsed > interval);
            done();
        }, interval);
    });

    it('can cancel timeout', function (done) {
        var timer = new chai.Timer().start();

        var interval = 10;
        var calls = 0;
        clock.setTimeout(function () {
            assert.ok(calls === 0);
            done();
        }, interval * 2);
        var id = clock.setTimeout(function () {
            assert.fail();
        }, interval);
        clock.clearTimeout(id);
    });
});

describe('a moment based clock', function () {
    it('now()', function () {
        assert.equal(new zeit.MomentClock().now().toString(), moment().toString());
    });
});

assert.momentEql = function (expected, actual) {
    assert.equal(expected.toString(), actual.toString());
}

function describeTestClockContract(name, ctrFn, timeAtSeconds, durationOfSeconds) {
    describe(name, function () {

        var defaultClock
        var customClock;

        beforeEach(function () {
            defaultClock = new ctrFn();
            customClock = new ctrFn(timeAtSeconds(1), durationOfSeconds(2), false);
        });

        it('default settings for clock', function () {
            assert.equal(defaultClock.implicitTick(), false);
            assert.momentEql(defaultClock.now(), timeAtSeconds(0));
            assert.momentEql(defaultClock.tickSize(), durationOfSeconds(1));
        });

        it('constructor settings for clock', function () {
            assert.equal(customClock.implicitTick(), false);
            assert.momentEql(customClock.now(), timeAtSeconds(1));
            assert.momentEql(customClock.tickSize(), durationOfSeconds(2));
        });

        it('now() uses default time and no implicit tick', function () {
            assert.momentEql(defaultClock.now(), timeAtSeconds(0));
            assert.momentEql(defaultClock.now(), timeAtSeconds(0));
        });

        it('now() using custom time', function () {
            assert.momentEql(customClock.now(), timeAtSeconds(1));
        });

        it('now() can modify time', function () {
            assert.momentEql(defaultClock.now(timeAtSeconds(1)), timeAtSeconds(1));
        });

        it('tick() uses default ticksize', function () {
            assert.momentEql(defaultClock.tick(), timeAtSeconds(1));
            assert.momentEql(defaultClock.now(), timeAtSeconds(1));
        });

        it('tick() set to ticksize set on construction', function () {
            assert.momentEql(customClock.tick(), timeAtSeconds(3));
            assert.momentEql(customClock.now(), timeAtSeconds(3));
        });

        it('tick() by custom amount', function () {
            assert.momentEql(defaultClock.tick(durationOfSeconds(2)), timeAtSeconds(2));
            assert.momentEql(defaultClock.now(), timeAtSeconds(2));
        });

        it('tickSize() modifies tick size', function () {
            assert.momentEql(defaultClock.tickSize(durationOfSeconds(2)), durationOfSeconds(2));
            defaultClock.tick();
            assert.momentEql(defaultClock.now(), timeAtSeconds(2));
        });

        it('implicitTick() can turn on and off the tick when calling now()', function () {
            assert.momentEql(defaultClock.now(), timeAtSeconds(0));
            assert.equal(defaultClock.implicitTick(true), true);
            assert.momentEql(defaultClock.now(), timeAtSeconds(1));
            assert.equal(defaultClock.implicitTick(false), false);
            assert.momentEql(defaultClock.now(), timeAtSeconds(1));
        });
    });
};

describeTestClockContract('stub moment clock', zeit.StubMomentClock, function (seconds) {
    return moment(seconds * 1000)
}, function (seconds) {
    return moment.duration(seconds, 'second');
});

describeTestClockContract('stub date clock', zeit.StubDateClock, function (seconds) {
    return new Date(seconds * 1000);
}, function (seconds) {
    return seconds * 1000;
});

