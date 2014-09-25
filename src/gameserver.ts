/// <reference path="game.ts" />

function extend(base: any, other: any): any {
    for (var i in other)
        base[i] = other[i];
}

// server has perfect knowledge of the game.  validates all moves.
class GameServer {
    locations: GameLocation[] = [];
    cards: GameCard[] = [];
    moves: GameMove[] = [];

    createLocation(name: string, id: number, visibility: {
        [userId: number]: GameLocation.Visibility
    }): GameLocation {
        var location = new GameLocation(name, id, visibility);
        this.locations.push(location);
        return location;
    }

    createCard(id: number, front: string, back: string, facedown: boolean): GameCard {
        var card = new GameCard(id, front, back, facedown);
        this.cards.push(card);
        return card;
    }

    newGame() {
        this.moves.length = 0;
    }

    findLocation(id: number): GameLocation {
        for (var i = 0; i < this.locations.length; ++i) {
            if (this.locations[i].id === id)
                return this.locations[i];
        }
        return null;
    }

    findCard(id: number): GameCard {
        for (var i = 0; i < this.cards.length; ++i) {
            if (this.cards[i].id === id)
                return this.cards[i];
        }
        return null;
    }

    moveCard(move: GameMove) {
        if (!this.validate(move))
            return;

        this.moves.push(move);
        move.id = this.moves.length;

        var from = this.findLocation(move.fromId),
            to = this.findLocation(move.toId),
            card = this.findCard(move.cardId);

        if (!card && from) {
            card = from.getCard();
            move.cardId = card.id;
        }

        from.removeCard(card);
        to.addCard(card);
    }

    getMoves(userId: number, lastMove: number): GameMove[] {
        var userMoves = [];
        for (var i = lastMove + 1; i < this.moves.length; ++i) {
            var move = this.moves[i],
                from = this.findLocation(move.fromId),
                to = this.findLocation(move.toId),
                card = this.findCard(move.cardId),
                toVisibility = to.getVisibility(userId),
                fromVisibility = from.getVisibility(userId),
                newMove = extend({}, move);

            if (fromVisibility === GameLocation.Visibility.None && toVisibility === GameLocation.Visibility.None)
                continue; // user knows nothing about these locations, so hide the move

            if (fromVisibility < GameLocation.Visibility.FaceUp && toVisibility < GameLocation.Visibility.FaceUp)
                newMove.cardId = -1; // user knows the locations, but not the card, so hide the card

            userMoves.push(newMove);
        }

        return userMoves;
    }

    validate(msg: GameMove): boolean {
        return this.findLocation(msg.fromId) !== null && this.findLocation(msg.toId) !== null;
    }
}
