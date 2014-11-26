/// <reference path="boardsystem.d.ts" />

interface DelayRule extends BoardSystem.BaseRule {
    seconds: number;
}

module DelayPlugin {
    var BoardSystem = require('./boardsystem');

    export function createRule(board: BoardSystem.Board, delayRule: DelayRule) {
        // note: force user to be the default
        return BoardSystem.extend({
            seconds: delayRule.seconds || 10
        }, board.createRule('delay'))
    }

    export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: BoardSystem.BatchCommand[]) {
        if (rule.type !== 'delay')
            return false;

        var delayRule = < DelayRule > rule;
        setTimeout(function() {
            client.sendUserCommands(rule.id, []); // respond to the server after the delay has expired
        }, delayRule.seconds * 1000);

        return true;
    }
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.delay = DelayPlugin;
