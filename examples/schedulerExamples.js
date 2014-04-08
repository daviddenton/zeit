var zeit = require('../');
var q = require('q');
var moment = require('moment');

// 1. Schedule a single execution of a callback for 3 seconds in the future.
var dateClock = new zeit.DateClock();
new zeit.Scheduler(dateClock)
    .execute(function () {
       console.log('every 3 seconds: ' + dateClock.now());
    })
    .at(dateClock.timeIn(3000))
    .start();

// 2. Schedule a Q promise to execute 5 times at 7 second intervals, starting in 6 seconds.
var momentClock = new zeit.MomentClock();
new zeit.Scheduler(momentClock)
    .execute(function () {
        return q('every 7 seconds: ' + momentClock.now()).then(console.log);
    })
    .after(moment.duration(6000))
    .exactly(5)
    .atFixedIntervalOf(moment.duration(7000))
    .start();

// 3. Schedule repeatedly to trigger a callback at 5 second breaks (wait for completion) while
//    executed less than 1000 times and no error is thrown by the callback. Starts immediately.
new zeit.Scheduler(dateClock)
    .execute(function () {
        console.log('every 5 seconds: ' + dateClock.now());
    })
    .andRepeatAfter(5000)
    .whilst(function (scheduleItemDetails) {
        return scheduleItemDetails.invocationCount < 1000;
    })
    .until(function (err, result) {
        return err;
    })
    .start();
