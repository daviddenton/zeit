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

###API details
Zeit requires that the same supported Date API is used consistently throughout calling code - use the wrong type and you'll get an explicit error:
- Native Date implementation - Dates are represented as native Date objects, and durations are passed/returned as an integer number of milliseconds.
- Moment.js implementation - Dates are represented as Moment objects and durations are passed/returned as Duration objects.

####Real clocks - zeit.DateClock / zeit.MomentClock
Wraps the native ```set/clearTimeout``` & ```set/ClearInterval``` methods and  provides additional utility methods below, which are required by the Scheduler implementation:

#####now() -> current date
In the format relative to the implementation (see above).

#####timeIn(durationInMilliseconds) -> augmented date
Returns the current date incremented by the passed duration.

#####numberOfMillisecondsAsDuration(numberOfMilliseconds) -> duration
In the format relative to the implementation (see above).

####Stub clocks - zeit.StubDateClock / zeit.StubMomentClock
Extends the Real Clock API and provides a means to control the current time by setting it directly, or implicitly/explicitly ticking by a set duration. API as above, with the following methods:

##### Constructor(currentDate, tickSize, implicitTickFlag)
If no values passed, the following defaults are used:
- currentDate: Start of universal time (01-01-1970)
- tickSize: 1 second
- implicitTickFlag: false

#####now(newCurrentDate) -> current date
Sets the current date if passed, and then returns the current date in teh relative format. If implicit ticking is activated, the time will be incremented automatically by the set ticksize.

#####intervals()-> { native id -> timeout duration }
Return a Hash of currently scheduled timeout durations by their timeout id.

#####timeouts() -> { native id -> timeout duration }
Return a Hash of currently scheduled interval durations by their timeout id.

#####triggerAll() -> [ids of all triggered callbacks]
Triggers all of the currently stored timeouts and intervals. After completion, reschedules intervals at the specified duration and discards timeouts.

#####lastKnownTime() -> current date
Same as ```now()```, but with no ticking.

#####tickSize(tickSizeInMilliseconds) -> current tick size duration
If passed, sets the current ticksize.

#####tick(newTickSizeInMilliseconds) -> new current (ticked) date
Increments the current date by the duration in milliseconds, or the current ticksize if not passed. Then returns the new current date.

#####implicitTick(newImplicitTickFlag) -> current implicit tick flag
If passed, sets the current implicit tick flag.

####Scheduler - zeit.PromiseScheduler
Wraps the native scheduling of repeating and non-repeating [Promises/A compliant](http://wiki.commonjs.org/wiki/Promises/A) promises, but also provides the API to provide pre and post predicates to prevent execution or rescheduling or to control the number of executions. Configuration of the schedules follows the Builder pattern.

Schedulers are Event Emitters, which emits the following events, with the latest schedule details as the message.
- start
- finish
- error

#####execute(promiseFn) -> schedule item builder
Begins the build pattern for configuring the schedule item.

#####activeSchedule(scheduleId) -> schedule details
Returns details of the schedule, including the configuration and stats such as the invocation count and last run time.

#####cancel(scheduleId) -> schedule details
Cancels the schedule and returns the latest details for that schedule, if any.

#####cancelAll() -> (scheduleId -> schedule details)
Cancels all schedules and returns a Hash of the schedules cancelled.

####Schedule Item Builder (returned by execute() in scheduler)
Provides the methods to configure the schedule. Calling ```start()``` actually schedules the execution. Follows the Builder pattern, so most methods return ```this```.

#####named(schedule name) -> schedule item builder
Sets the name of the schedule.

#####after(durationInMilliseconds) -> schedule item builder
Sets the initial delay before the first execution (like ```setTimeout```).

#####atFixedIntervalOf(durationInMilliseconds) -> schedule item builder
Sets the repeat at a fixed rate, regardless of how long the execution takes.

#####andRepeatAfter(durationInMilliseconds) -> schedule item builder
Sets the repeat at a fixed interval after execution has completed (like a tail call to ```setTimeout```).

#####exactly(numberOfExecutions) -> schedule item builder
Sets the maximum number of executions, which may be adjusted by pre and post predicates.

#####once() -> schedule item builder
Syntactic-sugar for ```exactly(1)```.

#####whilst(-> boolean) -> schedule item builder
Sets a pre-execution predicate, which will cancel all rescheduling once it returns false.

#####until(err, result -> boolean) -> schedule item builder
Sets a post-execution predicate, which will cancel all rescheduling once it returns false. The last execution error and result are passed to this predicate, so asserting on these values is possible.

####Examples:

1. Schedule a single execution for 10 seconds time.
```javascript
new zeit.PromiseScheduler(new zeit.DateClock())
    .execute(function () {
        return q.resolve('some happy value');
    })
    .after(10000)
    .start();
```

2. Schedule 5 times at 30 second intervals, starting immediately.
```javascript
new zeit.PromiseScheduler(new zeit.DateClock())
    .execute(function () {
        return q.resolve('some happy value');
    })
    .exactly(5)
    .atFixedIntervalOf(30000)
    .start();
```

3. Schedule repeatedly to trigger at 1 minute breaks (wait for completion) whilst the pre and post conditions are met. Starts immediately.
```javascript
new zeit.PromiseScheduler(new zeit.DateClock())
    .execute(function () {
        return q.resolve('some happy value');
    })
    .andRepeatAfter(60000)
    .whilst(somePrePredicate)
    .until(somePrePredicate)
    .start();
```

###Installation
--
Via npm, simply run: ```npm install zeit```
