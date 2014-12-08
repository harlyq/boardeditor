/// <reference path='game.d.ts' />
/// <reference path="seedrandom.d.ts" />

var ShufflePlugin;
(function (ShufflePlugin) {
    var Game = require('./game');
    require('./seedrandom');

    function createRule(board, shuffleRule) {
        return Game.extend({
            seed: shuffleRule.seed || Math.seedrandom(),
            location: board.convertLocationsToIdString(shuffleRule.location)
        }, board.createRule('shuffle'));
    }
    ShufflePlugin.createRule = createRule;

    function updateBoard(client, command, results) {
        if (command.type !== 'shuffle')
            return false;

        var shuffleCommand = command, board = client.getBoard(), location = board.findLocationById(shuffleCommand.locationId);

        Math.seedrandom(shuffleCommand.seed);
        if (location)
            location.shuffle();

        return true;
    }
    ShufflePlugin.updateBoard = updateBoard;

    function performRule(client, rule, results) {
        if (rule.type !== 'shuffle')
            return false;

        var shuffleRule = rule;
        var location = client.getBoard().queryFirstLocation(shuffleRule.location);

        var commands = [{
                type: 'shuffle',
                seed: shuffleRule.seed,
                locationId: location ? location.id : 0
            }];
        results.push(commands);

        return true;
    }
    ShufflePlugin.performRule = performRule;
})(ShufflePlugin || (ShufflePlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.shuffle = ShufflePlugin;
