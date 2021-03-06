/// <reference path='game.d.ts' />

var SetTemporaryPlugin;
(function (SetTemporaryPlugin) {
    var Game = require('./game');

    function createRule(board, setTemporaryRule) {
        var type = 'setTemporaryCard', key = setTemporaryRule.key, keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            Game._error('key is an empty array');

        if (key instanceof Game.Card || (keyArray && key[0] instanceof Game.Card)) {
            type = 'setTemporaryCard';
            key = board.convertCardsToIdString(key);
        } else if (key instanceof Game.Location || (keyArray && key[0] instanceof Game.Location)) {
            type = 'setTemporaryLocation';
            key = board.convertLocationsToIdString(key);
        } else {
            Game._error('unknown type of key - ' + key);
        }

        return Game.extend({
            timeout: 1.0
        }, board.createRule(type), setTemporaryRule, {
            key: key
        });
    }
    SetTemporaryPlugin.createRule = createRule;

    function performRule(client, rule, results) {
        if (rule.type !== 'setTemporaryCard' && rule.type !== 'setTemporaryLocation')
            return false;

        // setTemporary does nothing on a non-HumanClient
        if (!(client instanceof Game.HTMLClient))
            return true;

        var setTemporaryRule = rule, board = client.getBoard(), mapping = client.getMapping(), oldVariables = [], things = [], elems = [];

        switch (rule.type) {
            case 'setTemporaryCard':
                things = board.queryCards(setTemporaryRule.key);
                elems = mapping.getElemsFromCards(things);
                break;

            case 'setTemporaryLocation':
                things = board.queryLocations(setTemporaryRule.key);
                elems = mapping.getElemsFromLocations(things);
                break;
        }

        for (var i = 0; i < elems.length; ++i) {
            oldVariables.push(mapping.copyVariables(elems[i], setTemporaryRule.value));
            mapping.applyVariables(elems[i], setTemporaryRule.value);
        }

        window.setTimeout(function () {
            for (var i = 0; i < elems.length; ++i)
                mapping.applyVariables(elems[i], oldVariables[i]);

            // tell the server to continue
            client.sendUserCommands(rule.id, []);
        }, setTemporaryRule.timeout * 1000);

        return true;
    }
    SetTemporaryPlugin.performRule = performRule;
})(SetTemporaryPlugin || (SetTemporaryPlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.setTemporary = SetTemporaryPlugin;
