(function() {
    var Game = require('./game')
    var setup = require('./loveletter_setup');

    var currentPlayer = 0;
    var userNames = ['PLAYER1', 'PLAYER2', 'PLAYER3', 'PLAYER4'];
    var numPlayers = userNames.length;
    var allPlayers;

    function getFirstLocation(pickedLocations) {
        for (var k in pickedLocations) {
            if (pickedLocations[k].length > 0)
                return pickedLocations[k][0];
        }
        return null;
    }

    function getFirstMove(moves) {
        for (var k in moves) {
            if (moves[k].length > 0)
                return moves[k][0];
        }
        return null;
    }

    setup.newGameGen = function*(board) {
        allPlayers = board.createList(0, 1, 2, 3);

        yield board.waitMove({
            cards: '.card',
            to: 'pile',
            quantity: Game.Quantity.All
        });

        yield board.waitShuffle({
            location: 'pile'
        });

        for (var i = 0; i < allPlayers.length; ++i) {
            yield board.waitSet({
                key: board.queryFirstLocation('hand' + i),
                value: {
                    facedown: false
                },
                user: userNames[i]
            });

            yield board.waitMove({
                from: 'pile',
                to: 'hand' + i
            });
        }

        currentPlayer = allPlayers.get(~~(Math.random() * allPlayers.length));
    }

    setup.rulesGen = function*(board) {
        while (board.queryFirstLocation('pile').getNumCards() > 0) {
            yield board.waitMove({
                from: 'pile',
                to: 'hand' + currentPlayer,
            });

            var moves =
                yield board.waitMove({
                    from: 'hand' + currentPlayer,
                    fromPosition: Game.Position.Random,
                    to: 'discard' + currentPlayer,
                    user: userNames[currentPlayer]
                });

            var card = getFirstMove(moves).card;
            yield * cardAction(card, Game, board);

            currentPlayer = allPlayers.next(currentPlayer);
        }
    }

    function* cardAction(card, Game, board) {
        var otherPlayers = [];
        for (var i = 0; i < allPlayers.length; ++i) {
            var player = allPlayers.get(i);
            if (player === currentPlayer)
                continue;

            var hand = board.queryFirstLocation('hand' + player);
            var discard = board.queryFirstLocation('discard' + player);
            var topCard = discard.getCard(Game.Position.Top);
            if ((!topCard || topCard.getVariable('who') !== 'handmaid'))
                otherPlayers.push(hand);
        }

        switch (card.getVariable('who')) {
            case 'guard':
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        // user: userNames[currentPlayer]
                    });
                var name = getFirstLocation(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);
                break;

            case 'priest':
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstLocation(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);
                var pickedHand = 'hand' + pickedPlayer;
                var cards = board.queryFirstLocation(pickedHand).getCards();

                yield board.waitSetTemporary({
                    key: cards,
                    value: {
                        facedown: false
                    },
                    user: userNames[currentPlayer],
                    timeout: 1
                });

                break;

            case 'baron':
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstLocation(pickedLocations).name;
                var otherPlayer = parseInt(name.match(/(\d+)$/)[0], 10);
                var myHand = board.queryFirstLocation('hand' + currentPlayer);
                var myCard = myHand.getCardByIndex(0);
                var otherHand = board.queryFirstLocation('hand' + otherPlayer);
                var otherCard = otherHand.getCardByIndex(0);

                yield board.waitSetTemporary({
                    key: [myCard, otherCard],
                    value: {
                        facedown: false
                    },
                    user: [userNames[otherPlayer], userNames[currentPlayer]].join(','),
                    timeout: 1
                });

                if (myCard.getVariable('value') > otherCard.getVariable('value'))
                    allPlayers.remove(otherPlayer);
                else
                    allPlayers.remove(currentPlayer);
                break;

            case 'handmaid':
                break;

            case 'prince':
                var allHands = [];
                for (var i = 0; i < allPlayers.length; ++i) {
                    var player = allPlayers.get(i);
                    allHands.push(board.queryFirstLocation('hand' + player));
                }

                var pickedLocations =
                    yield board.waitPick({
                        list: allHands,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstLocation(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);
                break;

            case 'king':
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstLocation(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);
                break;

            case 'countess':
                break;

            case 'princess':
                break;
        }
    }

    if (typeof browserRequire === 'function')
        exports = browserRequire();

    if (typeof exports !== 'undefined') {
        for (var k in setup)
            exports[k] = setup[k];
    }

})();
