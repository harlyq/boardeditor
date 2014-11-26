/// <reference path="game.d.ts" />

interface LabelRule extends Game.BaseRule, Game.BaseCommand {
    key: any;
    labels: {
        [name: string]: boolean
    };
    affects ? : string;
}

module LabelPlugin {
    var Game = require('./game');

    export function createRule(board: Game.Board, rule: LabelRule): Game.BaseRule {
        var info = board.convertToIdString(rule.key);

        return Game.extend({
            key: '',
            labels: {},
            affects: rule.user || '' // by default we affect the user we send the command to
        }, board.createRule('label'), rule, {
            key: info.value
        });
    }

    // LabelRule is the command, just pass it through
    // export function performRule(client: Game.BaseClient, rule: Game.BaseRule, results: any[]): boolean

    export function updateBoard(client: Game.BaseClient, command: Game.BaseCommand, results: any[]): boolean {
        if (command.type !== 'label')
            return false;

        var labelCommand = < LabelRule > command,
            mapping = client.getMapping();

        if (!mapping)
            return true;

        if (Game.union(labelCommand.affects, mapping.getUser()).length === 0)
            return true; // command correct, but not intended for this user

        var elems = mapping.getElemsFromIds(labelCommand.key);
        for (var i = 0; i < elems.length; ++i) {
            var elem = elems[i];

            for (var k in labelCommand.labels) {
                if (labelCommand.labels[k])
                    elem.classList.add(k);
                else
                    elem.classList.remove(k);
            }
        }
    }
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.label = LabelPlugin;
