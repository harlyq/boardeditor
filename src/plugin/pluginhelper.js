/// <reference path='boardsystem.d.ts' />
var PluginHelper;
(function (PluginHelper) {
    var BoardSystem = require('./boardsystem');

    // COMBINATORIAL FUNCTIONS
    // return false if no remaining combinations
    // the first list provided should be the list of first elements of possible
    // assumes no duplicates
    function nextCombination(list, possible) {
        if (list.length === 0 || possible.length === 0)
            return false;

        // sequence for 3 entries, max of 4
        // 0,1,2 (original) => 0,1,3 => 0,1,4 => 0,2,3 => 0,2,4 => 0,3,4 => 1,2,3 ...
        var max = possible.length - 1, k = 0;

        for (var i = list.length - 1; i >= 0; --i, ++k) {
            if (list[i] === possible[max - k])
                continue;

            var index = possible.indexOf(list[i]);
            for (var j = i; j < list.length; ++j)
                list[j] = possible[index + j - i + 1]; // [] will always be <= max - k
            return true;
        }

        return false;
    }
    PluginHelper.nextCombination = nextCombination;

    // return false is no remaining factorial
    // the first list provided should be the list of first element of possible
    // assumes no duplicates
    function nextFactorial(list, possible, max) {
        if (list.length === 0 || possible.length === 0)
            return false;

        if (typeof max === 'undefined' || max > possible.length)
            max = possible.length;

        // sequence from 1 entry, max of 3
        // 0 (original) => 1 => 2 => 0,1 => 0,2 => 1,2 => 0,1,2
        // this is a combination of 1 then combination of 2 then combination of 3
        if (list.length === max)
            return false;

        if (nextCombination(list, possible))
            return true;

        for (var i = 0; i < list.length + 1; ++i)
            list[i] = possible[i];
    }
    PluginHelper.nextFactorial = nextFactorial;

    // increasing gray code, first item is the least significant bit
    function nextGrayCode(list, max) {
        if (list.length === 0 || max <= 0)
            return false;

        var listLength = list.length;

        for (var i = 0; i < listLength; ++i) {
            if (list[i] === max)
                continue;

            list[i]++;
            for (var j = i + 1; j < listLength; ++j)
                list[j] = 0;

            return true;
        }

        return false;
    }
    PluginHelper.nextGrayCode = nextGrayCode;

    // COUNTING FUNCTIONS
    function isCountComplete(quantity, count, value) {
        switch (quantity) {
            case BoardSystem.Quantity.All:
                return false;
            case BoardSystem.Quantity.Exactly:
                return value === count;
            case BoardSystem.Quantity.AtMost:
                return value <= count;
            case BoardSystem.Quantity.AtLeast:
                return value >= count;
            case BoardSystem.Quantity.MoreThan:
                return value > count;
            case BoardSystem.Quantity.LessThan:
                return value < count;
        }
        return false;
    }
    PluginHelper.isCountComplete = isCountComplete;
})(PluginHelper || (PluginHelper = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    for (var k in PluginHelper)
        exports[k] = PluginHelper[k];
}
