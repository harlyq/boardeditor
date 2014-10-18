function mancala() {
    var NUM_PLAYERS = 2;
    var NUM_PITS = 6;
    var NUM_STONES_PER_PIT = 4;
    var NUM_STONES = NUM_PLAYERS * NUM_PITS * NUM_STONES_PER_PIT;
    var PLAYER1 = 0;
    var PLAYER2 = 1;
    var currentPlayer = PLAYER2;
    var playerName = ['PLAYER1', 'PLAYER2'];

    var pits = [];
    var store = []
    var chain = []
    var pitNames = [];

    chain[PLAYER1] = [];
    chain[PLAYER2] = [];

    var whereList = [whereAtLeastOneStone]; // must contain all where conditions

    function whereAtLeastOneStone(from, to) {
        return from.getNumCards() > 0;
    }

    function setup(board) {
        var id = 1;
        for (var i = 0; i < NUM_STONES; ++i) {
            var card = board.createCard(id++, 'front', 'back', true);
            card.addLabel('stones');
        }
        for (var i = 0; i < NUM_PITS; ++i) {
            board.createLocation('red.' + String.fromCharCode(65 + i), id++).addLabel('red');
            board.createLocation('blue.' + String.fromCharCode(65 + i), id++).addLabel('blue');
        }
        board.createLocation('red.store', id++).addLabel('red');
        board.createLocation('blue.store', id++).addLabel('blue');
        board.createLocation('hidden', id++);

        board.createUser('BANK', -1);
        board.createUser(playerName[PLAYER1], PLAYER1);
        board.createUser(playerName[PLAYER2], PLAYER2);
    }

    function* newGame(board) {
        yield board.waitMove({
            cards: '.stones',
            to: 'hidden',
            count: NUM_STONES
        });

        for (var i = 0; i < NUM_PITS; ++i) {
            yield board.waitMove({
                from: 'hidden',
                to: 'red.' + String.fromCharCode(65 + i),
                count: NUM_STONES_PER_PIT
            });
            yield board.waitMove({
                from: 'hidden',
                to: 'blue.' + String.fromCharCode(65 + i),
                count: NUM_STONES_PER_PIT
            });
        }

        var result =
            yield board.waitPick({
                list: [PLAYER1, PLAYER2]
            });
        currentPlayer = result[0];
        yield board.waitSetVariable('currentPlayer', playerName[currentPlayer]);

        store[PLAYER1] = board.queryFirstLocation('red.store');
        store[PLAYER2] = board.queryFirstLocation('blue.store');
        pitNames[PLAYER1] = 'red.A, red.B, red.C, red.D, red.E, red.F';
        pitNames[PLAYER2] = 'blue.A, blue.B, blue.C, blue.D, blue.E, blue.F';
        pits[PLAYER1] = board.queryLocations(pitNames[PLAYER1]);
        pits[PLAYER2] = board.queryLocations(pitNames[PLAYER2]);
        chain[PLAYER1] = pits[PLAYER1].concat(store[PLAYER1]).concat(pits[PLAYER2]);
        chain[PLAYER2] = pits[PLAYER2].concat(store[PLAYER2]).concat(pits[PLAYER1]);
    }

    function* rules(board) {
        while (true) {
            var result =
                yield board.waitPickLocation({
                    list: pitNames[currentPlayer],
                    where: whereAtLeastOneStone,
                    user: playerName[currentPlayer]
                });
            if (result.length === 0) {
                alert('no more choices'); // DOES NOT WORK ON SERVER
                return false; // no more choices
            }

            var picked = result[0];
            var nextPit = board.next(picked, chain[currentPlayer], true);
            var lastPit = nextPit;

            // place one stone in each consecutive pit (including the current player's store)
            while (picked.getNumCards() > 0) {
                yield board.waitMove({
                    from: picked,
                    to: nextPit
                });
                lastPit = nextPit;
                nextPit = board.next(nextPit, chain[currentPlayer], true);
            }

            // if the last stone is in the current player's store, then don't change players
            if (lastPit != store[currentPlayer]) {
                var i = pits[currentPlayer].indexOf(lastPit);
                if (i !== -1 && lastPit.getNumCards() === 1) {
                    // if the last stone was in an empty pit for the current player, then take
                    // the opponent's stones from the opposite pit
                    var otherPlayer = 1 - currentPlayer;
                    yield board.waitMove({
                        from: pits[otherPlayer][NUM_PITS - i - 1],
                        to: store[currentPlayer],
                        quantity: Game.Quantity.All
                    });
                }

                // next player
                currentPlayer = 1 - currentPlayer;
                yield board.waitSetVariable('currentPlayer', playerName[currentPlayer]);
            }

            // if any one of the players has no pits then end the game
            var sum1 = pits[PLAYER1].reduce(function(prev, curr) {
                return prev + curr.getNumCards();
            }, 0);
            var sum2 = pits[PLAYER2].reduce(function(prev, curr) {
                return prev + curr.getNumCards();
            }, 0);
            if (sum1 === 0 || sum2 === 0) {
                alert('game over');
                return;
            }
        }
    }

    return {
        setupFunc: setup,
        rulesGen: rules,
        newGameGen: newGame,
        whereList: whereList
    };
}

// for commonjs
if (typeof exports !== 'undefined') {
    var theGame = mancala();
    exports.setupFunc = theGame.setupFunc;
    exports.rulesGen = theGame.rulesGen;
    exports.newGameGen = theGame.newGameGen;
    exports.whereList = theGame.whereList;
}
