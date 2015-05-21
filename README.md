#zeit
[![NPM version](https://badge.fury.io/js/zeit.svg)](http://badge.fury.io/js/zeit)
[![Build Status](https://api.travis-ci.org/daviddenton/zeit.png?branch=master)](https://travis-ci.org/daviddenton/zeit)
[![Coverage Status](https://coveralls.io/repos/daviddenton/zeit/badge.png)](https://coveralls.io/r/daviddenton/zeit)
[![Dependency Status](https://david-dm.org/daviddenton/zeit.png)](https://david-dm.org/daviddenton/zeit)
[![devDependency Status](https://david-dm.org/daviddenton/zeit/dev-status.png)](https://david-dm.org/daviddenton/zeit#info=devDependencies)

A node.js clock and scheduler, intended to take place of the global V8 object for manipulation of time and task scheduling which
would be handled with calls to ```set/clearTimeout``` and ```set/clearInterval```. Zeit ships with a set of controllable Stub clocks
 which can be used for the manipulation of time and scheduling in tests.

###Why does this project exist?
Writing testable code which involves the concept of time can be hard work, since you need to interact with the global "system" object in order to:
1. Create Date object instances.
2. Schedule callbacks to be executed at some point in the future.

In order to ensure that this behaviour is acceptably deterministic (and hence testable),
we need to be able to control both of these events. The Zeit library provides objects to abstract
 away the global-ness of these operations, which can be used in [node.js](http://nodejs.org/) application code to
 provide a more managed method.

For test code you can use the bundled Stub implementations to effectively control the time in
your tests, which removes the need for non-deterministic methods for asserting order and expected bevahiour, many of which rely on timeouts.

Zeit currently supports both the native [JavaScript Date](http://www.w3schools.com/js/js_obj_date.asp) API and the (IMHO) superior
[Moment.js](http://momentjs.com/) API.

###tl;dr Examples:


1. Schedule a single execution of a callback for 10 seconds in the future.
```javascript
new zeit.Scheduler(new zeit.DateClock())
    .execute(function () {
        return 'some happy value';
    })
    .after(10000)
    .start();
```

2. Schedule a single execution of a callback at 10 seconds in the future.
```javascript
new zeit.Scheduler(new zeit.DateClock())
    .execute(function () {
        return 'some happy value';
    })
    .at(new zeit.DateClock().timeIn(10000))
    .start();
```

3. Schedule a Q promise to execute 5 times at 30 second intervals, starting immediately.
```javascript
new zeit.Scheduler(new zeit.MomentClock())
    .execute(function () {
        return q.resolve('some happy path resolving promise');
    })
    .exactly(5)
    .atFixedIntervalOf(moment.duration(30000))
    .start();
```

4. Schedule repeatedly to trigger a callback at 1 minute breaks (wait for completion) while
executed less than 1000 times and no error is thrown by the callback. Starts immediately.
```javascript
new zeit.Scheduler(new zeit.DateClock())
    .execute(function () {
        return 'some happy value';
    })
    .andRepeatAfter(60000)
    .whilst(function(scheduleItemDetails) {
        return scheduleItemDetails.invocationCount < 1000;
    })
    .until(function(err, result) {
        return err;
    })
    .start();
```

###Installation
Via npm, simply run: ```npm install zeit```

###API details
Zeit requires that the same supported Date API is used consistently throughout calling code - use
the wrong type and you'll get an explicit error:
- Native Date implementation - Dates are represented as native Date objects, and durations are passed/returned as an integer number of milliseconds.
- Moment.js implementation - Dates are represented as Moment objects and durations are passed/returned as Duration objects.

####Real clocks - zeit.DateClock / zeit.MomentClock
Abstracts the creation of date objects (using ```now```),
and wraps the native ```set/clearTimeout``` & ```set/clearInterval``` methods. Also provides some
utility methods below, which are required by the Scheduler implementation:

#####now() -> current date
In the format relative to the implementation (see above).

#####timeIn(durationInMilliseconds) -> augmented date
Returns the current date incremented by the passed duration.

#####numberOfMillisecondsAsDuration(numberOfMilliseconds) -> duration
In the format relative to the implementation (see above).

#####durationUntil(datetime) -> duration
In the format relative to the implementation (see above).

If you want to provide your own implementation of clock (using another Date library),
you'll just need to implement these methods and then mixin an instance of TimeoutsAndIntervals.

####Stub clocks - zeit.StubDateClock / zeit.StubMomentClock
Extends the Real Clock API and provides a means to control the current time by setting it
directly, or implicitly/explicitly ticking by a set duration. API as above, with the following methods:

##### Constructor(currentDate, tickSize, implicitTickFlag)
If no values passed, the following defaults are used:
- currentDate: Start of universal time (01-01-1970)
- tickSize: 1 second
- implicitTickFlag: false

#####now(newCurrentDate) -> current date
Sets the current date if passed, and then returns the current date in the relative format. If
implicit ticking is activated, the time will be incremented automatically by the set ticksize.

#####intervals() -> { native id -> timeout duration }
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


####Scheduler - zeit.Scheduler
Wraps the native scheduling of repeating and non-repeating callbacks or [Promises/A compliant](http://wiki.commonjs.org/wiki/Promises/A) promises, but also provides the API to provide pre and post
predicates to prevent execution or rescheduling or to control the number of executions.
Configuration of the schedules follows the Builder pattern. The scheduler doesn't make a
distinction between repeating and one-off events, rather the usage of the API determines this
behaviour.

Schedulers are [Event Emitters](http://nodejs.org/api/events.html) which emit the following
lifecycle events for each schedule, with the latest schedule details as the message:
- start
- finish
- error
Note that callbacks/promises which throw exceptions (or rejected promises) emit Start & Error (no
Finish event), and that throwing an exception does not cancel repeat scheduling (to stop
rescheduling on an error, use the until() predicate when configuring the schedule).

#####execute(callback/promise factory function) -> Schedule Item Builder
Initiates the Builder pattern for configuring the schedule item. The passed function can be
either a standard callback or return a Promises/A compliant promise object. Some of the examples
below and the internal Zeit implementation use the [Q](http://npmjs.org/package/q) library.

#####activeSchedule(scheduleId) -> schedule details
Returns details of the schedule, including the configuration and stats such as the invocation count and last run time.

#####cancel(scheduleId) -> schedule details
Cancels the schedule and returns the latest details for that schedule, if any.

#####cancelAll() -> (scheduleId -> schedule details)
Cancels all schedules and returns a Hash of the schedules cancelled.

####Schedule Item Builder (returned by execute() in Scheduler)
Provides the methods to configure the schedule. Calling ```start()``` actually schedules the execution.
Follows the Builder pattern, so most methods return ```this```.

#####named(schedule name) -> schedule item builder
Sets the name of the schedule.

#####after(durationInMilliseconds) -> schedule item builder
Sets the initial delay before the first execution (like ```setTimeout```).

#####at(datetime) -> schedule item builder
Sets the time of the first execution (like ```setTimeout```).

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

#####until((err, result) -> boolean) -> schedule item builder
Sets a post-execution predicate, which will cancel all rescheduling once it returns true. The
last execution error and result are passed to this predicate, so asserting on these values is possible.

