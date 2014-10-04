/// <reference path="game.ts" />
/// <reference path="rule2.ts" />
/// <reference path="command.ts" />

var getRandom = function < T > (list: T[]): T {
    return list[~~(Math.random() * list.length)];
}

class GameClient {
    game: Game = null;
    showMoves: boolean = true;

    // requestMove(cardId: number, fromId: number, toId: number) {
    //     var msg: GameMove = {
    //         cardId: cardId,
    //         fromId: fromId,
    //         toId: toId
    //     };
    // }

    // applyMoves(moves: GameMove[]) {
    //     for (var i = 0; i < moves.length; ++i)
    //         this.applyMove(moves[i]);
    // }

    // applyMove(move: GameMove) {
    //     var from = this.game.findLocation(move.fromId),
    //         to = this.game.findLocation(move.toId),
    //         card = this.game.findCard(move.cardId);

    //     if (!card)
    //         card = from.getCard();

    //     from.removeCard(card);
    //     to.addCard(card);
    // }

    askUser(rule: BaseRule): BaseCommand[] {
        return []; // base class does nothing
    }
}


class BankClient extends GameClient {
    askUser(rule: BaseRule): BaseCommand[] {
        if (rule instanceof MoveRule)
            return this.askMove( < MoveRule > rule);
        else if (rule instanceof PickRule)
            return this.askPick( < PickRule > rule);

        return [];
    }

    private askMove(moveRule: MoveRule): MoveCommand[] {
        var fromLocations = this.game.queryLocations(moveRule._from);
        var toLocations = this.game.queryLocations(moveRule._to);
        var maxCards = this.game.getNumCards();
        var commands: MoveCommand[] = [];

        for (var i = 0; i < maxCards; ++i) {
            var from = getRandom(fromLocations);
            var to = getRandom(toLocations);

            var card = from.getCard(moveRule._fromPosition);
            from.removeCard(card);
            var index = to.addCard(card, moveRule._toPosition);

            var moveCommand = new MoveCommand(moveRule.id, card, to, index);
            commands.push(moveCommand);
        }

        return commands;
    }

    private askPick(pickRule: BaseRule): PickCommand[] {
        return [];
    }
}

class AIClient extends GameClient {

}

class HumanClient extends GameClient {

}
