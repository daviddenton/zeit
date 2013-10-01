var zeit = require('../'),
    moment = require('moment');

// 1. Schedule a single execution of a callback for 3 seconds in the future.
var dateClock = new zeit.DateClock();
new zeit.Scheduler(dateClock).execute(function () {
       console.log('every 3 seconds: ' + dateClock.now());
    }).after(3000).start();

//// 2. Schedule a Q promise to execute 5 times at 30 second intervals, starting immediately.
//new zeit.Scheduler(new zeit.MomentClock())
//    .execute(function () {
//        return q.resolve('some happy path resolving promise');
//    })
//    .exactly(5)
//    .atFixedIntervalOf(moment.duration(30000))
//    .start();

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
