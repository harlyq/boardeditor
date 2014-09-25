/// <reference path="game.ts" />
class GameClient {
    updateBoard() {

    }

    moveCard(cardId: number, from: GameLocation, to: GameLocation) {
        var msg = {
            cardId: cardId,
            from: from,
            to: to
        };
    }
}
