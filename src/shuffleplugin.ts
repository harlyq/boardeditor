/// <reference path='_dependencies.ts' />
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
            location: board.convertLocationsToString(shuffleRule.location)
        }, board.createRule('shuffle'));
    }

    export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]) {
        if (command.type !== 'shuffle')
            return false;

        var shuffleCommand = < ShuffleCommand > command;
        var location = board.findLocationById(shuffleCommand.locationId);
        Math.seedrandom(shuffleCommand.seed);
        if (location)
            location.shuffle();

        return true;
    }

    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {
        if (rule.type !== 'shuffle')
            return false;

        var shuffleRule = < ShuffleRule > rule;
        var location = client.getBoard().queryFirstLocation(shuffleRule.location);

        var batch: Game.BatchCommand = {
            ruleId: shuffleRule.id,
            commands: {}
        };
        batch.commands[client.getUser()] = [{
            type: 'shuffle',
            seed: shuffleRule.seed,
            locationId: location ? location.id : 0
        }];
        results.push(batch);

        return true;
    }
};

declare
var exports: any;
declare
var browserRequire: any;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.shuffle = ShufflePlugin;
