/// <reference path='_dependencies.ts' />
/// <reference path="humanclient.ts"/>

interface SetRule extends Game.BaseRule {
    key: any;
    value: any;
}

interface SetCommand extends Game.BaseCommand {
    key: string;
    value: any;
}

Game.registerPlugin('set', {
    createRule: function(board: Game.Board, setRule: SetRule) {
        var type = 'setVariable',
            key: any = setRule.key,
            keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            Game._error('key is an empty array');

        if (key instanceof Game.Card || (keyArray && key[0] instanceof Game.Card)) {
            type = 'setCardVariable';
            key = board.convertCardsToString(key);
        } else if (key instanceof Game.Location || (keyArray && key[0] instanceof Game.Location)) {
            type = 'setLocationVariable';
            key = board.convertLocationsToString(key);
        } else if (typeof key !== 'string')
            Game._error('unknown type of key - ' + key);

        return Game.extend({
            key: key,
            value: setRule.value
        }, board.createRule(type));
    },

    performRule: function(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {
        var setRule = < SetRule > rule;
        var wait = false;

        switch (rule.type) {
            case 'setCardVariable':
            case 'setLocationVariable':
            case 'setVariable':
                var batch = {
                    ruleId: rule.id,
                    commands: [{
                        type: rule.type,
                        key: setRule.key,
                        value: setRule.value
                    }]
                };

                results.push(batch);
                return true;
        }

        return false;
    },

    updateBoard: function(board: Game.Board, command: Game.BaseCommand, results: any[]) {
        var setCommand = < SetCommand > command;

        switch (command.type) {
            case 'setVariable':
                board.setVariable(setCommand.key, setCommand.value);
                return true;

            case 'setCardVariable':
                var cards = board.queryCards(setCommand.key);
                for (var i = 0; i < cards.length; ++i)
                    cards[i].setVariables(setCommand.value);
                return true;

            case 'setLocationVariable':
                var locations = board.queryLocations(setCommand.key);
                // TODO add variables to locations
                // for (var i = 0; i < locations.length; ++i)
                //     locations[i].setVariables(setCommand.value);
                return true;
        }

        return false;
    },

    updateMapping: function(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {
        var setCommand = < SetCommand > command;

        switch (command.type) {
            case 'setCardVariable':
                var cards = setCommand.key.split(',');
                for (var i = 0; i < cards.length; ++i)
                    mapping.applyVariables(mapping.getElemFromCardId(parseInt(cards[i])), setCommand.value);
        }
    }
});
