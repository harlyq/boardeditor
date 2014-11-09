function LoveLetter_Game(setup) {
    var currentPlayer = 0;
    var userNames = ['PLAYER1', 'PLAYER2', 'PLAYER3', 'PLAYER4'];
    var numPlayers = userNames.length;

    require('./pickplugin.js');
    require('./shuffleplugin.js');
    require('./setplugin.js');
    require('./moveplugin.js');
    require('./settemporaryplugin.js');

    setup.newGameGen = function*(Game, board) {
        Game.setPlugin(board, 'waitPick', 'pick');
        Game.setPlugin(board, 'waitShuffle', 'shuffle');
        Game.setPlugin(board, 'waitSet', 'set');
        Game.setPlugin(board, 'waitMove', 'move');
        Game.setPlugin(board, 'waitSetTemporary', 'setTemporary');

        yield board.waitMove({
            cards: '.card',
            to: 'pile',
            quantity: Game.Quantity.All
        });

        yield board.waitShuffle({
            location: 'pile'
        });

        for (var i = 0; i < numPlayers; ++i) {
            yield board.waitMove({
                from: 'pile',
                to: 'hand' + i
            });
        }

        currentPlayer = ~~(Math.random() * numPlayers);
        yield board.waitSet({
            key: 'currentPlayer',
            value: userNames[currentPlayer]
        });
    }

    setup.rulesGen = function*(Game, board) {
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

            var card = moves[0].card;
            yield * cardAction(card, Game, board);

            currentPlayer = (currentPlayer + 1) % numPlayers;
            yield board.waitSet({
                key: 'currentPlayer',
                value: userNames[currentPlayer]
            });
        }
    }

    function* cardAction(card, Game, board) {
        var otherPlayers = [];
        for (var i = 0; i < numPlayers; ++i) {
            var iDiscard = board.queryFirstLocation('discard' + i);
            var topCard = iDiscard.getCard(Game.Position.Top);
            if ((!topCard || topCard.getVariable('value') !== 'handmaid') && i !== currentPlayer)
                otherPlayers.push(iDiscard);
        }

        switch (card.getVariable('value')) {
            case 'guard':
                var pickedLocation =
                    yield board.waitPick({
                        list: otherPlayers,
                        // user: userNames[currentPlayer]
                    });
                var pickedPlayer = parseInt(pickedLocation[0][0].name.substr(7));
                break;

            case 'priest':
                var pickedLocation =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var pickedPlayer = parseInt(pickedLocation[0][0].name.substr(7));
                var pickedHand = 'hand' + pickedPlayer;
                var cards = board.queryFirstLocation(pickedHand).getCards();

                yield board.waitSetTemporary({
                    key: cards,
                    value: {
                        facedown: true
                    },
                    user: userNames[currentPlayer],
                    timeout: 1
                });

                break;

            case 'baron':
                var pickedLocation =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var pickedPlayer = parseInt(pickedLocation[0][0].name.substr(7));
                var myHand = board.queryFirstLocation('hand' + currentPlayer);
                var otherHand = board.queryFirstLocation('hand' + pickedPlayer);
                break;

            case 'handmaid':
                break;

            case 'prince':
                var allPlayers = [];
                for (var i = 0; i < numPlayers; ++i)
                    allPlayers.push(board.queryFirstLocation('discard' + i));

                var pickedLocation =
                    yield board.waitPick({
                        list: allPlayers,
                        user: userNames[currentPlayer]
                    });
                var pickedPlayer = parseInt(pickedLocation[0][0].name.substr(7));
                break;

            case 'king':
                var pickedLocation =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var pickedPlayer = parseInt(pickedLocation[0][0].name.substr(7));
                break;

            case 'countess':
                break;

            case 'princess':
                break;
        }
    }

    return setup;
}

if (typeof exports !== 'undefined') {}
