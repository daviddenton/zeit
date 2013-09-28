zeit  [![Build Status](https://travis-ci.org/daviddenton/zeit.png?branch=master)](https://travis-ci.org/daviddenton/zeit)
====

A node.js clock and scheduler, intended to take place of the global V8 object for manipulation of time and task scheduling which would be handled with calls to ```set/clearTimeout``` and ```set/clearInterval```. Zeit ships with a set of controllable Stub clocks which can be used for the manipulation of time and scheduling in tests.

Installation
--
Via npm, simply run: ```npm install zeit```

Why does this project exist?
--
Writing testable code which involves the concept of time is hard work, since you are need to interact with the global "system" object in order to:
1. Create Date object instances.
2. Schedule intervals or callbacks to be executed at some point in the future.

In order to make this behaviour acceptably deterministic (and hence testable), we need to be able to control both of these events. The Zeit library provides objects to abstract away the global-ness of these operations, which can be used in node.js applciation code to provide a more managed method. Additionally, by utilising the bundled Stub implementations you can effectively control time in your tests, which removes the need for non-deterministic methods for asserting order and expected bevahiour, many of which rely on timeouts.

API
--

Clock
--

Scheduling
--
