/// <reference path='game.d.ts' />
/// <reference path='pluginhelper.d.ts' />

var PickPlugin;
(function (PickPlugin) {
    var Game = require('./game');
    var PluginHelper = require('./pluginhelper');

    function createRule(board, rule) {
        var type = '', list = rule.list;

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
                list = board.convertLocationsToIdString(list);
            } else if (item instanceof Game.Card) {
                type = 'pickCard';
                list = board.convertCardsToIdString(list);
            } else {
                type = 'pick';
            }
        } else {
            Game._error('pickRule list type is not a string or array - ' + list);
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
    PickPlugin.createRule = createRule;

    function updateBoard(board, command, results) {
        var pickCommand = command;

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
    PickPlugin.updateBoard = updateBoard;

    // returns an array of valid BatchCommands
    function performRule(client, rule, results) {
        switch (rule.type) {
            case 'pick':
            case 'pickLocation':
            case 'pickCard':
                if (client instanceof Game.HTMLClient)
                    // don't build results, they will sent via Transport.sendCommand()
                    new HTMLPick(client, rule);
                else
                    findValidPickCommands(client.getBoard(), rule, results);
                return true;
        }

        return false;
    }
    PickPlugin.performRule = performRule;

    function findValidPickCommands(board, pickRule, results) {
        var where = pickRule.where || function () {
            return true;
        };

        var pickList = getPickList(board, pickRule), numPickList = pickList.length;

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

                var commands = [{
                        type: pickRule.type,
                        values: values
                    }];
                results.push(commands);
            } while(PluginHelper.nextCombination(indices, possibles));
        }
    }

    function getPickList(board, pickRule) {
        var where = pickRule.where || function () {
            return true;
        };

        var list = [];
        var rawList = pickRule.list;
        if (typeof pickRule.list === 'string')
            rawList = pickRule.list.split(',');
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

    var HTMLPick = (function () {
        function HTMLPick(client, pickRule) {
            this.client = client;
            this.pickList = [];
            this.lastRuleId = 0;
            this.highlightElems = [];
            this.pickHandler = this.onPickLocation.bind(this);
            this.CLASS_HIGHLIGHT = 'highlight';
            this.board = client.getBoard();
            this.mapping = client.getMapping();
            this.pickType = pickRule.type;

            this.showHTMLPick(pickRule);
        }
        HTMLPick.prototype.createPickCommand = function (type, values) {
            return Game.extend({
                type: type,
                values: values
            });
        };

        HTMLPick.prototype.onPickLocation = function (e) {
            var thing = this.mapping.getThingFromElem(e.currentTarget);
            var i = this.pickList.indexOf(thing);
            if (i === -1)
                return;

            // TODO check the number of picks
            this.pickList = [];
            this.clearHighlights();

            var commands = [this.createPickCommand(this.pickType, [thing.id])];
            this.client.sendUserCommands(this.lastRuleId, commands);
        };

        HTMLPick.prototype.showHTMLPick = function (pickRule) {
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
        };

        HTMLPick.prototype.highlightElement = function (element) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
            element.addEventListener("click", this.pickHandler);
        };

        HTMLPick.prototype.clearHighlights = function () {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
                element.removeEventListener("click", this.pickHandler);
            }

            this.highlightElems = [];
        };
        return HTMLPick;
    })();
    PickPlugin.HTMLPick = HTMLPick;
})(PickPlugin || (PickPlugin = {}));

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
