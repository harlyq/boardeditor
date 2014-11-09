function LoveLetter_Setup() {
    var setup = {};
    var maxPlayers = 4;

    setup.whereList = [];

    setup.setupFunc = function(board) {
        var id = 1;
        board.createLocation('pile', id++);

        for (var i = 0; i < maxPlayers; ++i) {
            board.createLocation('hand' + i, id++).addLabel('p' + i);
            board.createLocation('discard' + i, id++).addLabel('p' + i);
        }

        var deck1 = board.createDeck('deck1', id++, {
            back: '#back',
            facedown: 'true'
        });

        // front, back and facedown should just be values
        var k = 1;
        for (var i = 0; i < 5; ++i)
            board.createCard("deck1." + k++, id++, deck1, {
                value: 'guard',
                front: '#f1'
            }).addLabel('card');

        for (var i = 0; i < 2; ++i) {
            board.createCard("deck1." + k++, id++, deck1, {
                value: 'priest',
                front: '#f2'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 'baron',
                front: '#f3'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 'handmaid',
                front: '#f4'
            }).addLabel('card');
            board.createCard("deck1." + k++, id++, deck1, {
                value: 'prince',
                front: '#f5'
            }).addLabel('card');
        }

        board.createCard("deck1." + k++, id++, deck1, {
            value: 'king',
            front: '#f6'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            value: 'countess',
            front: '#f7'
        }).addLabel('card');
        board.createCard("deck1." + k++, id++, deck1, {
            value: 'princess',
            front: '#f8'
        }).addLabel('card');
    }

    return setup;
}
