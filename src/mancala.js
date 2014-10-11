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
            board.createLocation('p1_' + String.fromCharCode(65 + i), id++);
            board.createLocation('p2_' + String.fromCharCode(65 + i), id++);
        }
        board.createLocation('p1_store', id++);
        board.createLocation('p2_store', id++);
        board.createLocation('hidden', id++);

        board.createUser('BANK', -1);
        board.createUser(playerName[PLAYER1], PLAYER1);
        board.createUser(playerName[PLAYER2], PLAYER2);
    }

    function* newGame(board) {
        yield * board.move({
            cards: '.stones',
            to: 'hidden',
            count: NUM_STONES
        });

        for (var i = 0; i < NUM_PITS; ++i) {
            yield * board.move({
                from: 'hidden',
                to: 'p1_' + String.fromCharCode(65 + i),
                count: NUM_STONES_PER_PIT
            });
            yield * board.move({
                from: 'hidden',
                to: 'p2_' + String.fromCharCode(65 + i),
                count: NUM_STONES_PER_PIT
            });
        }

        var result =
            yield * board.pick({
                list: [PLAYER1, PLAYER2]
            });
        currentPlayer = result[0];
        yield * board.setVariable('currentPlayer', playerName[currentPlayer]);

        store[PLAYER1] = board.queryLocation('p1_store');
        store[PLAYER2] = board.queryLocation('p2_store');
        pitNames[PLAYER1] = 'p1_A, p1_B, p1_C, p1_D, p1_E, p1_F';
        pitNames[PLAYER2] = 'p2_A, p2_B, p2_C, p2_D, p2_E, p2_F';
        pits[PLAYER1] = board.queryLocation(pitNames[PLAYER1]);
        pits[PLAYER2] = board.queryLocation(pitNames[PLAYER2]);
        chain[PLAYER1] = pits[PLAYER1].concat(store[PLAYER1]).concat(pits[PLAYER2]);
        chain[PLAYER2] = pits[PLAYER2].concat(store[PLAYER2]).concat(pits[PLAYER1]);
    }

    function* rules(board) {
        for (var turn = 0; turn < 10; ++turn) {
            var result =
                yield * board.pickLocation({
                    list: pitNames[currentPlayer],
                    where: whereAtLeastOneStone,
                    user: playerName[currentPlayer]
                });
            if (result.length === 0)
                return false; // no more choices

            var picked = result[0];
            var nextPit = board.next(picked, chain[currentPlayer], true);
            var lastPit = nextPit;

            // place one stone in each consecutive pit (including the current player's store)
            while (picked.getNumCards() > 0) {
                yield * board.move({
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
                    yield * board.move({
                        from: lastPit,
                        to: pits[otherPlayer][NUM_PITS - i],
                        quantity: Game.Quantity.All
                    });
                }

                // next player
                currentPlayer = 1 - currentPlayer;
                yield * board.setVariable('currentPlayer', playerName[currentPlayer]);
            }
        }
    }

    var game = {};
    game.setupFunc = setup;
    game.rulesGen = rules;
    game.newGameGen = newGame;
    game.whereList = whereList;
    return game;
}
