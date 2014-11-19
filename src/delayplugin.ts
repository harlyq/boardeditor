/// <reference path="game.d.ts" />

interface DelayRule extends Game.BaseRule {
    seconds: number;
}

module DelayPlugin {
    var Game = require('./game');

    export function createRule(board: Game.Board, delayRule: DelayRule) {
        // note: force user to be the default
        return Game.extend({
            seconds: delayRule.seconds || 10
        }, board.createRule('delay'))
    }

    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {
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
