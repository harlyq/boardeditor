/// <reference path="game.d.ts" />

interface SwapRule extends Game.BaseRule {
    from: any;
    to: any;
}

module SwapModule {
    var Game = require('./game');

    export function createRule(board: Game.Board, rule: SwapRule): Game.BaseRule {
        // user is always BANK
        var fromString = board.convertLocationsToIdString(rule.from),
            toString = board.convertLocationsToIdString(rule.to);

        if (!fromString)
            Game._error('swap from is not a valid location - ' + rule.from);

        if (!toString)
            Game._error('swap to is not a valid location - ' + rule.to);

        if (fromString.split(',').length > 1)
            Game._error('swap can only move cards from a single location - ' + rule.from + ' - ids - ' + fromString);

        if (toString.split(',').length > 1)
            Game._error('swap can only move cards to a single location - ' + rule.to + ' - ids - ' + toString);

        return Game.extend(board.createRule('swap'), {
            from: fromString,
            to: toString
        });
    }

    // convert swap into move commands because the BANK has access to a complete board, but other
    // players may have imperfect knowledge.
    export function performRule(client: Game.Client, rule: Game.BaseRule, results: any[]): boolean {
        if (rule.type !== 'swap')
            return;

        var board = client.getBoard(),
            swapRule = < SwapRule > (rule),
            from = board.queryFirstLocation(swapRule.from),
            to = board.queryFirstLocation(swapRule.to);

        if (!from)
            Game._error('from is empty in swap');

        if (!to)
            Game._error('to is empty in swap');

        var fromCards = from.getCards(),
            toCards = to.getCards();

        if (fromCards.length === 0)
            Game._error('there are no cards to swap at this from location (id) - ' + swapRule.from);

        if (toCards.length === 0)
            Game._error('there are no cards to swap at this to location (id) - ' + swapRule.to);

        var commands = [];
        for (var i = 0; i < fromCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: fromCards[i].id,
                fromId: -1,
                toId: parseInt(swapRule.to, 10),
                index: -1
            });
        for (var i = 0; i < toCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: toCards[i].id,
                fromId: -1,
                toId: parseInt(swapRule.from, 10),
                index: -1
            });

        results.push(commands);

        return true;
    }

    // export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): boolean {
    // export function updateHTML(mapping: Game.HTMLMapping, command: Game.BaseCommand) {
}

if (typeof browserRequire === 'undefined')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.swap = SwapModule;
