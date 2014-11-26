/// <reference path='game.d.ts' />
/// <reference path="seedrandom.d.ts" />

interface ShuffleRule extends Game.BaseRule {
    seed ? : string;
    location: string;
}

interface ShuffleCommand extends Game.BaseCommand {
    seed: string;
    locationId: number;
}

module ShufflePlugin {
    var Game = require('./game');
    require('./seedrandom');

    export function createRule(board: Game.Board, shuffleRule: ShuffleRule) {
        return Game.extend({
            seed: shuffleRule.seed || Math.seedrandom(),
            location: board.convertLocationsToIdString(shuffleRule.location)
        }, board.createRule('shuffle'));
    }

    export function updateBoard(client: Game.BaseClient, command: Game.BaseCommand, results: any[]): boolean {
        if (command.type !== 'shuffle')
            return false;

        var shuffleCommand = < ShuffleCommand > command,
            board = client.getBoard(),
            location = board.findLocationById(shuffleCommand.locationId);

        Math.seedrandom(shuffleCommand.seed);
        if (location)
            location.shuffle();

        return true;
    }

    export function performRule(client: Game.BaseClient, rule: Game.BaseRule, results: any[]) {
        if (rule.type !== 'shuffle')
            return false;

        var shuffleRule = < ShuffleRule > rule;
        var location = client.getBoard().queryFirstLocation(shuffleRule.location);

        var commands: Game.BaseCommand[] = [{
            type: 'shuffle',
            seed: shuffleRule.seed,
            locationId: location ? location.id : 0
        }];
        results.push(commands);

        return true;
    }
};

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.shuffle = ShufflePlugin;
