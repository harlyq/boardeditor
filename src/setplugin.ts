/// <reference path='boardsystem.d.ts' />

interface SetRule extends BoardSystem.BaseRule, BoardSystem.BaseCommand {
    key: any;
    value: any;
    affects: string; // affected users
}

module SetPlugin {
    var BoardSystem = require('./boardsystem');

    export function createRule(board: BoardSystem.Board, setRule: SetRule) {
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
        return BoardSystem.extend({
            key: info.value,
            value: setRule.value,
            affects: setRule.user || ''
        }, board.createRule(ruleType));
    }

    // user the default performRule, which uses the rule as a command
    // export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: BoardSystem.BatchCommand[]) {

    export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return false;

        var mapping = client.getMapping(),
            setCommand = < SetRule > command,
            elems = [];

        if (!mapping)
            return true; // no mapping for this client

        if (setCommand.affects && BoardSystem.union(setCommand.affects, mapping.getUser()).length === 0)
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
