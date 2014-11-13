/// <reference path='_dependencies.ts' />
/// <reference path="htmlmapping.ts" />
/// <reference path="pluginhelper.ts" />

interface PickRule extends Game.BaseRule {
    list: any;
    quantity ? : Game.Quantity;
    count ? : number;
    where ? : number;
    whereIndex ? : number; // internal, use where instead
}

interface PickCommand extends Game.BaseCommand {
    values: any[]; // picked items
}

module PickPlugin {
    var Game = require('./game');
    var PluginHelper = require('./pluginhelper');

    export function createRule(board: Game.Board, rule: PickRule): Game.BaseRule {
        var type = '',
            list: any = rule.list;

        if (!list)
            Game._error('pickRule has no list');

        if (typeof list === 'string') {
            if (list === '')
                Game._error('pickRule list is an empty string');

            type = 'pick';

        } else if (Array.isArray(list)) {
            if (list.length === 0)
                Game._error('pickRule list is empty');

            var item = list[0];
            if (item instanceof Game.Location) {
                type = 'pickLocation';
                list = board.convertLocationsToString(list);
            } else if (item instanceof Game.Card) {
                type = 'pickCard';
                list = board.convertCardsToString(list);
            } else {
                type = 'pick';
            }
        } else {
            Game._error('pickRule list type is not a string or array - ' + list)
        }

        return Game.extend({
            list: '',
            quantity: Game.Quantity.Exactly,
            count: 1,
            where: null,
            whereIndex: -1
        }, board.createRule(type), rule, {
            list: list
        });
    }

    export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): boolean {
        var pickCommand = < PickCommand > command;

        switch (command.type) {
            case 'pick':
                [].push.apply(results, pickCommand.values);
                return true;

            case 'pickLocation':
                [].push.apply(results, board.queryLocations(pickCommand.values.join(',')));
                return true;

            case 'pickCard':
                [].push.apply(results, board.queryCards(pickCommand.values.join(',')));
                return true;
        }

        return false;
    }

    // returns an array of valid BatchCommands
    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]): boolean {
        switch (rule.type) {
            case 'pick':
            case 'pickLocation':
            case 'pickCard':
                if (client instanceof Game.HumanClient)
                // don't build results, they will sent via Proxy.sendCommand()
                    new HTMLPick( < Game.HumanClient > client, < PickRule > rule);
                else
                    findValidPickCommands(client.getUser(), client.getBoard(), < PickRule > rule, results);
                return true;
        }

        return false;
    }

    function findValidPickCommands(user: string, board: Game.Board, pickRule: PickRule, results: Game.BatchCommand[]) {
        var where: any = pickRule.where || function() {
            return true;
        }

        var pickList = getPickList(board, pickRule),
            numPickList = pickList.length;

        // go up to pickList because this represents the count, which can none (0) to all (numPickList)
        for (var i = 0; i <= numPickList; ++i) {
            if (!PluginHelper.isCountComplete(pickRule.quantity, pickRule.count, i))
                continue;

            var indices = [];
            for (var j = 0; j < i; ++j)
                indices.push(j);

            var possibles = [];
            for (var j = 0; j < numPickList; ++j)
                possibles.push(j);

            do {
                var values = [];

                for (var k = 0; k < i; ++k) {
                    var pick = pickList[indices[k]];

                    // use name and id because the location structures on this client will be
                    // different from the location structurs on other clients, or on the server
                    switch (pickRule.type) {
                        case 'pick':
                            values.push(pick);
                            break;
                        case 'pickLocation':
                            values.push(pick.name);
                            break;
                        case 'pickCard':
                            values.push(pick.id);
                            break;
                    }
                }

                var batch: Game.BatchCommand = {
                    ruleId: pickRule.id,
                    commands: {}
                }
                batch.commands[user] = [{
                    type: pickRule.type,
                    values: values
                }];
                results.push(batch);

            } while (PluginHelper.nextCombination(indices, possibles));
        }
    }

    function getPickList(board: Game.Board, pickRule: PickRule): any[] {
        var where: any = pickRule.where || function() {
            return true;
        }

        var list = [];
        var rawList: any = pickRule.list;
        if (typeof pickRule.list === 'string')
            rawList = ( < string > pickRule.list).split(',');
        if (!Array.isArray(rawList))
            rawList = [rawList];

        switch (pickRule.type) {
            case 'pick':
                list = rawList;
                break;
            case 'pickLocation':
                list = board.queryLocations(rawList.join(','));
                break;
            case 'pickCard':
                list = board.queryCards(rawList.join(','));
                break;
        }


        return list.filter(where);
    }

    export class HTMLPick {
        private user: string;
        private pickList: any[] = [];
        private lastRuleId: number = 0;
        private board: Game.Board;
        private highlightElems: HTMLElement[] = [];
        private proxy: Game.BaseClientProxy = null;
        private mapping: Game.HTMLMapping = null;
        private pickHandler = this.onPickLocation.bind(this);

        CLASS_HIGHLIGHT: string = 'highlight';

        constructor(private client: Game.HumanClient, pickRule: PickRule) {
            this.user = client.getUser();
            this.proxy = client.getProxy();
            this.board = client.getBoard();
            this.mapping = client.mapping;

            this.showHTMLPick(pickRule);
        }

        private createPickCommand(type: string, values: any): PickCommand {
            return Game.extend({
                type: type,
                values: values
            });
        }

        private onPickLocation(e) {
            var location = this.mapping.getLocationFromElem(e.currentTarget);
            var i = this.pickList.indexOf(location);
            if (i === -1)
                return;

            // TODO check the number of picks
            this.pickList = [];
            this.clearHighlights();

            var batch: Game.BatchCommand = {
                ruleId: this.lastRuleId,
                commands: {}
            };
            batch.commands[this.user] = [this.createPickCommand('pickLocation', [location.name])];
            this.proxy.sendCommands(batch);
        }

        private showHTMLPick(pickRule: PickRule) {
            this.pickList = getPickList(this.board, pickRule);

            if (this.pickList.length === 0) {
                Game._error('no items in ' + pickRule.type + ' list - ' + pickRule.list + ', rule - ' + pickRule.where);
                return;
            }

            for (var i = 0; i < this.pickList.length; ++i) {
                var pick = this.pickList[i];

                switch (pickRule.type) {
                    case 'pick':
                        break;

                    case 'pickLocation':
                        var element = this.mapping.getElemFromLocationId(pick.id);
                        this.highlightElement(element);
                        break;
                    case 'pickCard':
                        var element = this.mapping.getElemFromCardId(pick.id);
                        this.highlightElement(element);
                        break;
                }
            }

            this.lastRuleId = pickRule.id;
        }

        private highlightElement(element: HTMLElement) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
            element.addEventListener("click", this.pickHandler);
        }

        private clearHighlights() {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
                element.removeEventListener("click", this.pickHandler);
            }

            this.highlightElems = [];
        }
    }
}

declare
var exports: any;
declare
var browserRequire: any;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.pick = PickPlugin;


// var list = [0];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1, 2];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1, 2, 3];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
