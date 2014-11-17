/// <reference path='game.d.ts' />
module PluginHelper {

    // COMBINATORIAL FUNCTIONS

    // return false if no remaining combinations
    // the first list provided should be the list of first elements of possible
    // assumes no duplicates
    export function nextCombination(list: any[], possible: any[]): boolean {
        if (list.length === 0 || possible.length === 0)
            return false; // nothing to iterate

        // sequence for 3 entries, max of 4
        // 0,1,2 (original) => 0,1,3 => 0,1,4 => 0,2,3 => 0,2,4 => 0,3,4 => 1,2,3 ...
        var max = possible.length - 1,
            k = 0;

        for (var i = list.length - 1; i >= 0; --i, ++k) {
            if (list[i] === possible[max - k])
                continue;

            var index = possible.indexOf(list[i]);
            for (var j = i; j < list.length; ++j)
                list[j] = possible[index + j - i + 1]; // [] will always be <= max - k
            return true;
        }

        return false; // list contains the final iteration
    }

    // return false is no remaining factorial
    // the first list provided should be the list of first element of possible
    // assumes no duplicates
    export function nextFactorial(list: any[], possible: any[], max ? : number): boolean {
        if (list.length === 0 || possible.length === 0)
            return false; // nothing to iterate

        if (typeof max === 'undefined' || max > possible.length)
            max = possible.length;

        // sequence from 1 entry, max of 3
        // 0 (original) => 1 => 2 => 0,1 => 0,2 => 1,2 => 0,1,2
        // this is a combination of 1 then combination of 2 then combination of 3

        if (list.length === max)
            return false; // list is complete

        if (nextCombination(list, possible))
            return true;

        for (var i = 0; i < list.length + 1; ++i)
            list[i] = possible[i];
    }

    // increasing gray code, first item is the least significant bit
    export function nextGrayCode(list: number[], max): boolean {
        if (list.length === 0 || max <= 0)
            return false;

        var listLength = list.length;

        // sequence of 2 digits for grey code 2
        // 0,0 (original) => 1,0 => 2,0 => 0,1 => 1,1 => 2,1 => 0,2 => 1,2 => 2,2
        for (var i = 0; i < listLength; ++i) {
            if (list[i] === max)
                continue;

            list[i] ++;
            for (var j = i + 1; j < listLength; ++j)
                list[j] = 0;

            return true;
        }

        return false;
    }

    // COUNTING FUNCTIONS
    export function isCountComplete(quantity: Game.Quantity, count: number, value: number): boolean {
        switch (quantity) {
            case Game.Quantity.All:
                return false; // all must be accounted for elsewhere
            case Game.Quantity.Exactly:
                return value === count;
            case Game.Quantity.AtMost:
                return value <= count;
            case Game.Quantity.AtLeast:
                return value >= count;
            case Game.Quantity.MoreThan:
                return value > count;
            case Game.Quantity.LessThan:
                return value < count;
        }
        return false;
    }

}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    for (var k in PluginHelper)
        exports[k] = PluginHelper[k];
}
