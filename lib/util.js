'use strict';

exports.createGuid = function() {
    function chunk() {
        return Math.floor(Math.random() * 0x10000).toString(16);
    }
    return [chunk()+chunk(),chunk(),chunk(),chunk(),chunk()+chunk()+chunk()].join('-');
};

exports.ensure = function (value, description, predicate, map) {
    if (predicate(value)) {
        return map ? map(value) : value;
    } else {
        throw new Error(value + ' is not a ' + description);
    }
};
