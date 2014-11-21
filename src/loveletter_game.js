(function() {
    var Game = require('./game')
    var setup = require('./loveletter_setup');

    var currentPlayer = 0,
        userNames = ['PLAYER1', 'PLAYER2', 'PLAYER3', 'PLAYER4'],
        numPlayers = userNames.length,
        allPlayers,
        tokens = [], // number of tokens per player
        NUM_WINNING_TOKENS = 3

    var GUARD = 1,
        PRIEST = 2,
        BARON = 3,
        HANDMAID = 4,
        PRINCE = 5,
        KING = 6,
        COUNTESS = 7,
        PRINCESS = 8;

    function getFirstEntry(obj) {
        for (var k in obj) {
            if (obj[k].length > 0)
                return obj[k][0];
        }
        return null;
    }

    setup.newGameGen = function*(board) {
        yield board.waitMove({
            cards: '.token',
            to: 'tokenPile',
            quantity: Game.Quantity.All
        });

        tokens = [0, 0, 0, 0];
    }

    setup.rulesGen = function*(board) {
        var winner = -1;
        while (winner === -1) {
            yield * startRound(board);

            yield * nextRound(board);

            for (var i = 0; winner < 0 && i < tokens.length; ++i) {
                if (tokens[i] >= NUM_WINNING_TOKENS)
                    winner = i;
            }

            if (winner >= 0) {
                yield board.waitSendMessage({
                    message: 'winner',
                    detail: {
                        player: winner
                    }
                });
            } else {
                yield board.waitDelay({
                    seconds: 5
                });

                yield board.waitSendMessage({
                    message: 'nextRound'
                });
            }
        }
    }

    function* startRound(board) {
        allPlayers = board.createList(0, 1, 2, 3);

        yield board.waitMove({
            cards: '.card',
            to: 'pile',
            quantity: Game.Quantity.All
        });

        yield board.waitMove({
            cards: '.cardType',
            to: 'picktype',
            quantity: Game.Quantity.All
        });

        yield board.waitShuffle({
            location: 'pile'
        });

        for (var i = 0; i < allPlayers.length; ++i) {
            // hide hand for all users
            yield board.waitSet({
                key: board.queryFirstLocation('hand' + i),
                value: {
                    facedown: true
                }
            });

            // show hand for individual user
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

    function* nextRound(board) {
        while (allPlayers.length > 1 && board.queryFirstLocation('pile').getNumCards() > 0) {
            yield board.waitMove({
                from: 'pile',
                to: 'hand' + currentPlayer,
            });

            var moves = [];
            var cardsInHand = board.queryFirstLocation('hand' + currentPlayer).getCards();
            var cardValues = cardsInHand.map(function(item) {
                return item.getVariable('value');
            });
            var countessIndex = cardValues.indexOf(COUNTESS);

            if (countessIndex !== -1 && (cardValues.indexOf(KING) !== -1 || cardValues.indexOf(PRINCE) !== -1)) {
                // if the Countess is with the King or Prince, always discard the Countess
                moves =
                    yield board.waitMove({
                        cards: cardsInHand[countessIndex],
                        to: 'discard' + currentPlayer,
                        user: userNames[currentPlayer]
                    });
            } else {
                moves =
                    yield board.waitMove({
                        from: 'hand' + currentPlayer,
                        fromPosition: Game.Position.Random,
                        to: 'discard' + currentPlayer,
                        user: userNames[currentPlayer]
                    });
            }

            var card = getFirstEntry(moves).card;
            yield * cardAction(board, card);

            currentPlayer = allPlayers.next(currentPlayer);
        }

        var winner,
            highestValue = 0;

        // player with the highest value is the winner
        for (var i = 0; i < allPlayers.length; ++i) {
            var player = allPlayers.get(i),
                hand = board.queryFirstLocation('hand' + player),
                value = hand.getCard(0).getVariable('value');

            if (value > highestValue) {
                highestValue = value;
                winner = player;
            }
        }

        // show all users hands
        for (var i = 0; i < numPlayers; ++i)
            yield board.waitSet({
                key: board.queryFirstLocation('hand' + player),
                value: {
                    facedown: false
                }
            });

        yield board.waitMove({
            from: 'tokenPile',
            to: 'token' + winner
        });
        tokens[winner] ++;
    }

    function* cardAction(board, card) {
        var otherPlayers = [], // list of locations
            handmaidPlayers = []; // list of player indices, doesn't include the current player

        for (var i = 0; i < allPlayers.length; ++i) {
            var player = allPlayers.get(i);
            if (player === currentPlayer)
                continue;

            var hand = board.queryFirstLocation('hand' + player);
            var discard = board.queryFirstLocation('discard' + player);
            var topCard = discard.getCard(Game.Position.Top);

            // player's who just discarded the handmaid cannot be selected
            if (!topCard || topCard.getVariable('value') !== HANDMAID)
                otherPlayers.push(hand);
            else if (topCard)
                handmaidPlayers.push(player);
        }

        switch (card.getVariable('value')) {
            case GUARD:
                // pick a card type and another player, if that player has holding that card type
                // then they are out
                if (otherPlayers.length === 0)
                    break; // no other players to check

                yield board.waitLabel({
                    key: 'picktype',
                    labels: {
                        hidden: false
                    },
                    user: userNames[currentPlayer]
                });

                var pickedType =
                    yield board.waitPick({
                        list: board.queryCards('.cardType'),
                        user: userNames[currentPlayer]
                    });
                var value = getFirstEntry(pickedType).getVariable('value');

                yield board.waitLabel({
                    key: 'picktype',
                    labels: {
                        hidden: true
                    },
                    user: userNames[currentPlayer]
                });

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstEntry(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);

                var pickedHand = board.queryFirstLocation('hand' + pickedPlayer);
                if (pickedHand.getCard(0).getVariable('value') === value)
                    yield * removePlayer(board, pickedPlayer);
                break;

            case PRIEST:
                // look at another player's card
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstEntry(pickedLocations).name;
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

            case BARON:
                // pick another player and compare cards, the player with the lower value is out
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstEntry(pickedLocations).name;
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

                var myValue = myCard.getVariable('value'),
                    otherValue = otherCard.getVariable('value');
                if (myValue > otherValue)
                    yield * removePlayer(board, otherPlayer);
                else if (otherValue > myValue)
                    yield * removePlayer(board, currentPlayer);
                break;

            case HANDMAID:
                break;

            case PRINCE:
                // pick a player (can be yourself) and they discard their hand and take a new card

                // if there are no cards left in the pile, then the Prince does nothing
                if (board.queryFirstLocation('pile').getNumCards() === 0)
                    return;

                var allHands = [];
                for (var i = 0; i < allPlayers.length; ++i) {
                    var player = allPlayers.get(i);
                    if (handmaidPlayers.indexOf(player) !== -1)
                        continue; // can't pick player's who have discarded the handmaid

                    allHands.push(board.queryFirstLocation('hand' + player));
                }

                var pickedLocations =
                    yield board.waitPick({
                        list: allHands,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstEntry(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);

                var discarded =
                    yield board.waitMove({
                        from: 'hand' + pickedPlayer,
                        to: 'discard' + pickedPlayer,
                        quantity: Game.Quantity.All
                    });
                var discardedCard = getFirstEntry(discarded).card;
                yield * checkDiscarded(board, pickedPlayer, discardedCard);

                // if the pickedPlayer discarded the PRINCESS then they are instantly out of 
                // the game
                if (allPlayers.indexOf(pickedPlayer) !== -1) {
                    yield board.waitMove({
                        from: 'pile',
                        to: 'hand' + pickedPlayer
                    });
                }
                break;

            case KING:
                // swap your hand with another player
                if (otherPlayers.length === 0)
                    break; // no other players to check

                var pickedLocations =
                    yield board.waitPick({
                        list: otherPlayers,
                        user: userNames[currentPlayer]
                    });
                var name = getFirstEntry(pickedLocations).name;
                var pickedPlayer = parseInt(name.match(/(\d+)$/)[0], 10);

                yield board.waitSwap({
                    from: 'hand' + currentPlayer,
                    to: 'hand' + pickedPlayer
                });
                break;

            case COUNTESS:
                break;

            case PRINCESS:
                yield * checkDiscarded(board, currentPlayer, card);
                break;
        }
    }

    function* removePlayer(board, player) {
        allPlayers.remove(player);

        yield board.waitSendMessage({
            message: 'removePlayer',
            detail: {
                player: player
            }
        });
    }

    function* checkDiscarded(board, player, card) {
        // if a player discards the PRINCESS then they are out
        if (card.getVariable('value') === PRINCESS)
            yield * removePlayer(board, player);
    }

    if (typeof browserRequire === 'function')
        exports = browserRequire();

    if (typeof exports !== 'undefined') {
        for (var k in setup)
            exports[k] = setup[k];
    }

})();
