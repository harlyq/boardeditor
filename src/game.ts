class GameLocation {
    cards: GameCard[];

    constructor(public name: string, public id: number, public visibility: {
        [userId: number]: GameLocation.Visibility
    }) {}

    addCard(card: GameCard) {
        this.cards.push(card);
    }

    removeCard(card: GameCard) {
        var i = this.cards.indexOf(card);
        if (i !== -1)
            this.cards.splice(i, 1);
    }

    getCard(): GameCard {
        var numCards = this.cards.length;
        if (numCards === 0)
            return null;

        return this.cards[numCards - 1];
    }

    getVisibility(userId: number): GameLocation.Visibility {
        var visibility = this.visibility[userId];
        if (typeof visibility == 'undefined')
            visibility = GameLocation.Visibility.None;

        return visibility;
    }
}

module GameLocation {
    // for a Visibility of faceUp or ownwards, the userId will given all card details
    export enum Visibility {
        None, Count, FaceDown, FaceUp, Flip, Any
    };
}

class GameCard {
    static UNKNOWN = -1;

    // id may be -1, typically for cards that are facedown and cannot be flipped
    constructor(public id: number, public front: string, public back: string, public facedown: boolean) {}
}

interface GameMove {
    id: number; // unique id, starts from 1
    fromId: number; // GameLocation
    toId: number; // GameLocation
    cardId: number; // GameCard, may be -1 if card is irrelevant
}
