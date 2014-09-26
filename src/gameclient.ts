/// <reference path="game.ts" />
class GameClient {
    game: Game = null;
    showMoves: boolean = true;

    requestMove(cardId: number, fromId: number, toId: number) {
        var msg: GameMove = {
            cardId: cardId,
            fromId: fromId,
            toId: toId
        };
    }

    applyMoves(moves: GameMove[]) {
        for (var i = 0; i < moves.length; ++i)
            this.applyMove(moves[i]);
    }

    applyMove(move: GameMove) {
        var from = this.game.findLocation(move.fromId),
            to = this.game.findLocation(move.toId),
            card = this.game.findCard(move.cardId);

        if (!card)
            card = from.getCard();

        from.removeCard(card);
        to.addCard(card);
    }
}
