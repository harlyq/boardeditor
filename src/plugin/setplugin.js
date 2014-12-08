/// <reference path='game.d.ts' />

var SetPlugin;
(function (SetPlugin) {
    var Game = require('./game');

    function createRule(board, setRule) {
        var ruleType = 'setVariable', key = setRule.key, keyArray = Array.isArray(key);

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
    SetPlugin.createRule = createRule;

    // user the default performRule, which uses the rule as a command
    // export function performRule(client: Game.BaseClient, rule: Game.BaseRule, results: Game.BatchCommand[]) {
    function updateBoard(client, command, results) {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return false;

        var mapping = client.getMapping(), setCommand = command, elems = [];

        if (!mapping)
            return true;

        if (setCommand.affects && Game.union(setCommand.affects, mapping.getUser()).length === 0)
            return;

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
    SetPlugin.updateBoard = updateBoard;
})(SetPlugin || (SetPlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.set = SetPlugin;
