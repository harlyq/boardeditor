/// <reference path='game.d.ts' />

interface SetRule extends Game.BaseRule, Game.BaseCommand {
    key: any;
    value: any;
    affects: string; // affected users
}

module SetPlugin {
    var Game = require('./game');

    export function createRule(board: Game.Board, setRule: SetRule) {
        var ruleType = 'setVariable',
            key: any = setRule.key,
            keyArray = Array.isArray(key);

        var info = board.convertToIdString(key);
        switch (info.type) {
            case 'card':
                ruleType = 'setCardVariable';
                break;
            case 'location':
                ruleType = 'setLocationVariable';
                break;
            case 'region':
                ruleType = 'setRegionVariable';
                break;
        }

        // note 'affects' is set to the 'user', and 'user' is set to the default
        return Game.extend({
            key: info.value,
            value: setRule.value,
            affects: setRule.user || ''
        }, board.createRule(ruleType));
    }

    // user the default performRule, which uses the rule as a command
    // export function performRule(client: Game.BaseClient, rule: Game.BaseRule, results: Game.BatchCommand[]) {

    export function updateBoard(client: Game.BaseClient, command: Game.BaseCommand, results: any[]): boolean {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return false;

        var mapping = client.getMapping(),
            setCommand = < SetRule > command,
            elems = [];

        if (!mapping)
            return true; // no mapping for this client

        if (setCommand.affects && Game.union(setCommand.affects, mapping.getUser()).length === 0)
            return; // does not affect this user

        switch (command.type) {
            case 'setCardVariable':
                elems = mapping.getElemsFromCardIds(setCommand.key);
                break;

            case 'setLocationVariable':
                elems = mapping.getElemsFromLocationIds(setCommand.key);
                break;

        }

        for (var i = 0; i < elems.length; ++i)
            mapping.applyVariables(elems[i], setCommand.value);
    }
};

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.set = SetPlugin;
