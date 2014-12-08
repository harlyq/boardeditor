/// <reference path="game.d.ts" />

var DelayPlugin;
(function (DelayPlugin) {
    var Game = require('./game');

    function createRule(board, delayRule) {
        // note: force user to be the default
        return Game.extend({
            seconds: delayRule.seconds || 10
        }, board.createRule('delay'));
    }
    DelayPlugin.createRule = createRule;

    function performRule(client, rule, results) {
        if (rule.type !== 'delay')
            return true;

        var delayRule = rule;
        setTimeout(function () {
            client.sendUserCommands(rule.id, []); // respond to the server after the delay has expired
        }, delayRule.seconds * 1000);
    }
    DelayPlugin.performRule = performRule;
})(DelayPlugin || (DelayPlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.delay = DelayPlugin;
