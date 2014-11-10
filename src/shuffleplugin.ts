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

Game.registerPlugin('shuffle', {
    createRule: function(board: Game.Board, shuffleRule: ShuffleRule) {
        return Game.extend({
            seed: shuffleRule.seed || Math.seedrandom(),
            location: board.convertLocationsToString(shuffleRule.location)
        }, board.createRule('shuffle'));
    },

    updateBoard: function(board: Game.Board, command: Game.BaseCommand, results: any[]) {
        if (command.type !== 'shuffle')
            return false;

        var shuffleCommand = < ShuffleCommand > command;
        var location = board.findLocationById(shuffleCommand.locationId);
        Math.seedrandom(shuffleCommand.seed);
        if (location)
            location.shuffle();

        return true;
    },

    performRule: function(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {
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
});
