/// <reference path="boardsystem.d.ts" />

var SwapModule;
(function (SwapModule) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, rule) {
        // user is always BANK
        var fromString = board.convertLocationsToIdString(rule.from), toString = board.convertLocationsToIdString(rule.to);

        if (!fromString)
            BoardSystem._error('swap from is not a valid location - ' + rule.from);

        if (!toString)
            BoardSystem._error('swap to is not a valid location - ' + rule.to);

        if (fromString.split(',').length > 1)
            BoardSystem._error('swap can only move cards from a single location - ' + rule.from + ' - ids - ' + fromString);

        if (toString.split(',').length > 1)
            BoardSystem._error('swap can only move cards to a single location - ' + rule.to + ' - ids - ' + toString);

        return BoardSystem.extend(board.createRule('swap'), {
            from: fromString,
            to: toString
        });
    }
    SwapModule.createRule = createRule;

    // convert swap into move commands because the BANK has access to a complete board, but other
    // players may have imperfect knowledge.
    function performRule(client, rule, results) {
        if (rule.type !== 'swap')
            return;

        var board = client.getBoard(), swapRule = (rule), from = board.queryFirstLocation(swapRule.from), to = board.queryFirstLocation(swapRule.to);

        if (!from)
            BoardSystem._error('from is empty in swap');

        if (!to)
            BoardSystem._error('to is empty in swap');

        var fromCards = from.getCards(), toCards = to.getCards();

        if (fromCards.length === 0)
            BoardSystem._error('there are no cards to swap at this from location (id) - ' + swapRule.from);

        if (toCards.length === 0)
            BoardSystem._error('there are no cards to swap at this to location (id) - ' + swapRule.to);

        var commands = [], toId = parseInt(swapRule.to, 10), fromId = parseInt(swapRule.from, 10);

        for (var i = 0; i < fromCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: fromCards[i].id,
                fromId: fromId,
                toId: toId,
                index: -1
            });

        for (var i = 0; i < toCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: toCards[i].id,
                fromId: toId,
                toId: fromId,
                index: -1
            });

        results.push(commands);

        return true;
    }
    SwapModule.performRule = performRule;
})(SwapModule || (SwapModule = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.swap = SwapModule;
