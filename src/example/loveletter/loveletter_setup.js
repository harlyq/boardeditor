var setup = (function() {
    var setup = {};
    var maxPlayers = 4;

    var BoardSystem = require('./boardsystem')
    var corePlugins = require('./coreplugins');

    setup.whereList = [];

    setup.setupFunc = function(board) {
        BoardSystem.bindPlugin(board, 'waitPick', corePlugins, 'pick');
        BoardSystem.bindPlugin(board, 'waitShuffle', corePlugins, 'shuffle');
        BoardSystem.bindPlugin(board, 'waitSet', corePlugins, 'set');
        BoardSystem.bindPlugin(board, 'waitMove', corePlugins, 'move');
        BoardSystem.bindPlugin(board, 'waitSetTemporary', corePlugins, 'setTemporary');
        BoardSystem.bindPlugin(board, 'waitSendMessage', corePlugins, 'sendMessage');
        BoardSystem.bindPlugin(board, 'waitLabel', corePlugins, 'label');
        BoardSystem.bindPlugin(board, 'waitDelay', corePlugins, 'delay');
        BoardSystem.bindPlugin(board, 'waitSwap', corePlugins, 'swap');

        var id = 1;
        board.createLocation('pile', id++, {
            facedown: 'true'
        });

        for (var i = 0; i < maxPlayers; ++i) {
            board.createLocation('token' + i, id++);
            board.createLocation('hand' + i, id++, {
                facedown: true
            });
            board.createLocation('discard' + i, id++, {
                facedown: false
            });
        }

        board.createLocation('tokenPile', id++).addLabel('hidden');
        board.createLocation('picktype', id++).addLabel('hidden');

        var deck3 = board.createDeck('deck3', id++);
        for (var i = 1; i <= 9; ++i)
            board.createCard('deck3.' + i, id++, deck3).addLabel('token');

        var deck2 = board.createDeck('deck2', id++);
        for (var i = 1; i <= 8; ++i)
            board.createCard('deck2.' + i, id++, deck2, {
                facedown: false,
                value: i,
                front: '#f' + i
            }).addLabel('cardType');

        var deck1 = board.createDeck('deck1', id++, {
            back: '#back',
            facedown: 'true'
        });

        // front, back and facedown should just be values
        var k = 1;
        for (var i = 0; i < 5; ++i)
            board.createCard("deck1." + k++, id++, deck1, {
                value: 1,
                front: '#f1'
            }).addLabel('card');

        for (var i = 0; i < 2; ++i) {
            board.createCard("deck1." + k++, id++, deck1, {
                value: 2,
                front: '#f2'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 3,
                front: '#f3'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 4,
                front: '#f4'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 5,
                front: '#f5'
            }).addLabel('card');
        }

        board.createCard("deck1." + k++, id++, deck1, {
            value: 6,
            front: '#f6'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            value: 7,
            front: '#f7'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            value: 8,
            front: '#f8'
        }).addLabel('card');
    }

    return setup;
})();

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    for (k in setup)
        exports[k] = setup[k];
}
