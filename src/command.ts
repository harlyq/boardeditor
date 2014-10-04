/// <reference path="game.ts" />
class BaseCommand {
    constructor(public ruleId ? : number) {}
}

interface MoveSummary {
    ruleId: number;
    cardId: number;
    toId: number;
    toIndex: number;
}

class MoveCommand extends BaseCommand {
    constructor(ruleId ? : number, public card ? : GameCard, public to ? : GameLocation, public toIndex ? : number) {
        super(ruleId);
    }

    fromSummary(game: Game, summary: MoveSummary): boolean {
        this.ruleId = summary.ruleId;

        this.to = game.findLocation(summary.toId);
        if (!this.to)
            return false; // invalid to

        this.card = game.findCard(summary.cardId);
        if (!this.card)
            return false; // undefined card

        this.toIndex = summary.toIndex;

        return true;
    }

    toSummary(): MoveSummary {
        var summary: MoveSummary = {
            ruleId: this.ruleId,
            cardId: -1,
            toId: -1,
            toIndex: -1
        }
        summary.cardId = (this.card ? this.card.id : -1);
        summary.toId = (this.to ? this.to.id : -1);
        summary.toIndex = this.toIndex;

        return summary;
    }
}

class PickCommand extends BaseCommand {
    ruleId: number;
    options: number[];
}
