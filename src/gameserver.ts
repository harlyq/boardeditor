/// <reference path="game.ts" />
function extend(base: any, other: any): any {
    for (var i in other)
        base[i] = other[i];
}

// server has perfect knowledge of the game.  validates all moves.
class GameServer {
    game: Game = null;
    moves: GameMove[] = [];

    newGame() {
        this.moves.length = 0;
    }

    moveCard(move: GameMove) {
        if (!this.validate(move))
            return;

        this.moves.push(move);
        move.id = this.moves.length;

        var from = this.game.findLocation(move.fromId),
            to = this.game.findLocation(move.toId),
            card = this.game.findCard(move.cardId);

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
                from = this.game.findLocation(move.fromId),
                to = this.game.findLocation(move.toId),
                card = this.game.findCard(move.cardId),
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
        return this.game.findLocation(msg.fromId) !== null && this.game.findLocation(msg.toId) !== null;
    }
}
