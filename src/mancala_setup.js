// This file contains no yields
function mancalaSetup() {
    var NUM_PLAYERS = 2;
    var NUM_PITS = 6;
    var NUM_STONES_PER_PIT = 4;
    var NUM_STONES = NUM_PLAYERS * NUM_PITS * NUM_STONES_PER_PIT;
    var PLAYER1 = 0;
    var PLAYER2 = 1;
    var playerName = ['PLAYER1', 'PLAYER2'];

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

    return {
        whereList: whereList,
        setupFunc: setup,
        whereAtLeastOneStone: whereAtLeastOneStone // having to expose each where function is complicated
    }
}

// for commonjs
if (typeof exports !== 'undefined') {
    var theSetup = mancalaSetup()
    exports.setupFunc = theSetup.setupFunc;
    exports.whereList = theSetup.whereList;
    exports.whereAtLeastOneStone = theSetup.whereAtLeastOneStone;
}
