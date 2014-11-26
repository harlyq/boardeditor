/// <reference path='boardsystem.d.ts' />
/// <reference path="seedrandom.d.ts" />

interface ShuffleRule extends BoardSystem.BaseRule {
    seed ? : string;
    location: string;
}

interface ShuffleCommand extends BoardSystem.BaseCommand {
    seed: string;
    locationId: number;
}

module ShufflePlugin {
    var BoardSystem = require('./boardsystem');
    require('./seedrandom');

    export function createRule(board: BoardSystem.Board, shuffleRule: ShuffleRule) {
        return BoardSystem.extend({
            seed: shuffleRule.seed || Math.seedrandom(),
            location: board.convertLocationsToIdString(shuffleRule.location)
        }, board.createRule('shuffle'));
    }

    export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
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

    export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]) {
        if (rule.type !== 'shuffle')
            return false;

        var shuffleRule = < ShuffleRule > rule;
        var location = client.getBoard().queryFirstLocation(shuffleRule.location);

        var commands: BoardSystem.BaseCommand[] = [{
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
