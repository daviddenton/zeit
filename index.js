'use strict';

var _ = require('lodash');

_.extend(module.exports, require('./lib/clock.js'));
_.extend(module.exports, require('./lib/promiseScheduler.js'));
