function LoveLetter_Setup() {
    var setup = {};
    var maxPlayers = 4;

    setup.whereList = [];

    setup.setupFunc = function(board) {
        var id = 1;
        board.createLocation('pile', id++, {
            facedown: 'true'
        });

        for (var i = 0; i < maxPlayers; ++i) {
            board.createLocation('hand' + i, id++, {
                facedown: false
            }).addLabel('p' + i);
            board.createLocation('discard' + i, id++, {
                facedown: false
            }).addLabel('p' + i);
        }

        var deck1 = board.createDeck('deck1', id++, {
            back: '#back',
            facedown: 'true'
        });

        // front, back and facedown should just be values
        var k = 1;
        for (var i = 0; i < 5; ++i)
            board.createCard("deck1." + k++, id++, deck1, {
                who: 'guard',
                value: 1,
                front: '#f1'
            }).addLabel('card');

        for (var i = 0; i < 2; ++i) {
            board.createCard("deck1." + k++, id++, deck1, {
                who: 'priest',
                value: 2,
                front: '#f2'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                who: 'baron',
                value: 3,
                front: '#f3'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                who: 'handmaid',
                value: 4,
                front: '#f4'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                who: 'prince',
                value: 5,
                front: '#f5'
            }).addLabel('card');
        }

        board.createCard("deck1." + k++, id++, deck1, {
            who: 'king',
            value: 6,
            front: '#f6'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            who: 'countess',
            value: 7,
            front: '#f7'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            who: 'princess',
            value: 8,
            front: '#f8'
        }).addLabel('card');
    }

    return setup;
}
