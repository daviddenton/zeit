#zeit  [![Build Status](https://travis-ci.org/daviddenton/zeit.png?branch=master)](https://travis-ci.org/daviddenton/zeit)

A node.js clock and scheduler, intended to take place of the global V8 object for manipulation of time and task scheduling which would be handled with calls to ```set/clearTimeout``` and ```set/clearInterval```. Zeit ships with a set of controllable Stub clocks which can be used for the manipulation of time and scheduling in tests.

###Why does this project exist?
--
Writing testable code which involves the concept of time is hard work, since you are need to interact with the global "system" object in order to:
1. Create Date object instances.
2. Schedule intervals or callbacks to be executed at some point in the future.

In order to ensure that this behaviour is acceptably deterministic (and hence testable), we need to be able to control both of these events. The Zeit library provides objects to abstract away the global-ness of these operations, which can be used in node.js application code to provide a more managed method.

For test code you can use the bundled Stub implementations to effectively control the time in your tests, which removes the need for non-deterministic methods for asserting order and expected bevahiour, many of which rely on timeouts.

Zeit currently supports both the native Date API and the (IMHO) superior
[Moment.js](http://momentjs.com/) API.

###API
Zeit requires that the same supported Date API is used consistently throughout calling code - use the wrong type and you'll get an explicit error:
- Native Date implementation - Dates are represented as native Date objects, and durations are passed/returned as an integer number of milliseconds.
- Moment.js implementation - Dates are represented as Moment objects and durations are passed/returned as Duration objects.

####Real clocks - zeit.DateClock / zeit.MomentClock
Wraps the native ```set/clearTimeout``` & ```set/ClearInterval``` methods and  provides additional utility methods below, which are required by the Scheduler implementation:

#####now()
Returns the current date.

#####timeIn(durationInMilliseconds)
Returns the current date incremented by the passed duration.

#####numberOfMillisecondsAsDuration(numberOfMilliseconds)
Returns

####Stub clocks - zeit.StubDateClock / zeit.StubMomentClock
Extends the Real Clock API and provides a means to control the current time by setting it directly, or implicitly/explicitly ticking by a set duration. API as above, with the following methods:

##### Constructor(currentDate, tickSize, implicitTickFlag)
If no values passed, the following defaults are used:
- currentDate: Start of universal time (01-01-1970)
- tickSize: 1 second
- implicitTickFlag: false

#####now(newCurrentDate)
Sets the current date if passed, and then returns the current date. If implicit ticking is activated, the time will be incremented automatically by the set ticksize. Then returns the current date.

#####intervals()
Return a Hash of currently scheduled timeouts by their timeout id.

#####timeouts()
Return a Hash of currently scheduled intervals by their timeout id.

#####triggerAll()
Triggers all of the currently stored timeouts and intervals. After completion, reschedules intervals at the specified duration and discards timeouts.

#####lastKnownTime()
Returns the current date, without ticking the clock.

#####tickSize(tickSizeInMilliseconds)
If passed, sets the current ticksize, then returns the current ticksize.

#####tick(newTickSizeInMilliseconds)
Increments the current date by the duration in milliseconds, or the current ticksize if not passed. Then returns the new current date.

#####implicitTick(newImplicitTickFlag)
If passed, sets the current implicit tick flag, then returns the current implicit tick flag.

####Scheduler - zeit.PromiseScheduler
Wraps the native scheduling of repeating and non-repeating [Promises/A compliant](http://wiki.commonjs.org/wiki/Promises/A) promises, but also provides the API to provide pre and post predicates to prevent execution or rescheduling or to control the number of executions. Examples:

```javascript
var scheduler = new zeit.PromiseScheduler(new zeit.DateClock());

function promiseFn() {
    return q.resolve('some happy value');
}

// schedule a single execution for 10 seconds time.
scheduler
    .execute(promiseFn)
    .after(10000)
    .start();

// schedule 5 times at 30 second intervals, starting immediately.
scheduler
    .execute(promiseFn)
    .exactly(5)
    .atFixedIntervalOf(30000)
    .start();

// schedule repeatedly to trigger at 1 minute breaks (wait for completion) whilst the pre and post conditions are met. Starts immediately.
scheduler
    .execute(promiseFn)
    .andRepeatAfter(60000)
    .whilst(somePrePredicate)
    .until(somePrePredicate)
    .start();
```


###Installation
--
Via npm, simply run: ```npm install zeit```
