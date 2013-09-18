'use strict'
var zeit = require('../'),
    moment = require('moment'),
    assert = require('chai').assert;

describe('a date based clock', function () {
    it('now()', function () {
        assert.equal(new zeit.DateClock().now().toString(), new Date().toString());
    });
});

describe('a moment based clock', function () {
    it('now()', function () {
        assert.equal(new zeit.MomentClock().now().toString(), moment().toString());
    });
});

assert.momentEql = function(expected, actual) {
    assert.equal(expected.toString(), actual.toString());
}

describe('a stub moment clock', function () {
    var DEFAULT_TIME = moment(0);
    var DEFAULT_TICK = moment.duration(1, 'second');
    var customTick = moment.duration(2, 'second');

    it('now() uses default time and no implicit tick', function () {
        var clock = new zeit.StubMomentClock();
        assert.momentEql(clock.now(), DEFAULT_TIME);
        assert.momentEql(clock.now(), DEFAULT_TIME);
    });

    it('now() using custom time', function () {
        var nonDefaultTime = moment(1234);
        assert.momentEql(new zeit.StubMomentClock(nonDefaultTime).now(), nonDefaultTime);
    });

    it('now() can modify time', function () {
        var nonDefaultTime = moment(1234);
        assert.momentEql(new zeit.StubMomentClock().now(nonDefaultTime), nonDefaultTime);
    });

    it('tick() uses default ticksize', function () {
        var clock = new zeit.StubMomentClock();
        assert.momentEql(clock.tick(), moment(DEFAULT_TIME).add(DEFAULT_TICK));
        assert.momentEql(clock.now(), moment(DEFAULT_TIME).add(DEFAULT_TICK));
    });

    it('tick() set to ticksize set on construction', function () {
        var clock = new zeit.StubMomentClock(DEFAULT_TIME, customTick);
        assert.momentEql(clock.tick(), moment(DEFAULT_TIME).add(customTick));
        assert.momentEql(clock.now(), moment(DEFAULT_TIME).add(customTick));
    });

    it('tick() by custom amount', function () {
        var clock = new zeit.StubMomentClock();
        assert.momentEql(clock.tick(customTick), moment(DEFAULT_TIME).add(customTick));
        assert.momentEql(clock.now(), moment(DEFAULT_TIME).add(customTick));
    });

    it('tickSize() modifies tick size', function () {
        var nonStandardTick = moment.duration(1, 'second');
        var clock = new zeit.StubMomentClock();
        clock.tick();
        assert.momentEql(clock.tickSize(), DEFAULT_TICK);
        assert.momentEql(clock.tickSize(nonStandardTick), nonStandardTick);
        clock.tick();
        assert.momentEql(clock.now(), moment(DEFAULT_TIME).add(DEFAULT_TICK).add(nonStandardTick));
    });

    it('implicitTick() can turn on and off the tick when calling now', function () {
        var clock = new zeit.StubMomentClock();
        assert.momentEql(clock.now(), DEFAULT_TIME);
        assert.equal(clock.implicitTick(), false);
        assert.equal(clock.implicitTick(true), true);
        assert.momentEql(clock.now(), moment(DEFAULT_TIME).add(DEFAULT_TICK));
    });
});