'use strict';

var util = require('../lib/util');
var _ = require('lodash');
var assert = require('chai').assert;

describe('Util', function () {
    it('ensure() blows up when predicate fails', function () {
        try {
            util.ensure(false, 'a boolean', _.identity, _.identity);
            assert.fail('should not get here');
        } catch (e) {
            // expected
        }
    });

    it('ensure() maps variable up when predicate fails', function () {
        var result = util.ensure(true, 'a boolean', _.identity, function (value) {
            return !value;
        });
        assert.ok(!result);
    });
});