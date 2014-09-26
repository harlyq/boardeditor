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

    save(): any {
        var obj = {
            type: 'GameLocation',
            name: this.name,
            id: this.id,
            visibility: this.visibility,
            cards: []
        };

        for (var i = 0; i < this.cards.length; ++i)
            obj.cards.push(this.cards[i].save());
    }

    load(obj: any) {
        if (obj.type !== 'GameLocation')
            return;

        this.name = obj.name;
        this.id = obj.id;
        this.visibility = obj.visibility;
        this.cards = [];

        for (var i = 0; i < obj.cards.length; ++i) {
            var card = new GameCard(0, '', '', false);
            card.load(obj.cards[i]);
            this.cards.push(card);
        }
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

    save(): any {
        return {
            type: 'GameCard',
            id: this.id,
            front: this.front,
            back: this.back,
            facedown: this.facedown
        };
    }

    load(obj: any) {
        if (obj.type !== 'GameCard')
            return;

        this.id = obj.id;
        this.front = obj.front;
        this.back = obj.back;
        this.facedown = obj.facedown;
    }
}

interface GameMove {
    id ? : number; // unique id, starts from 1
    fromId: number; // GameLocation
    toId: number; // GameLocation
    cardId: number; // GameCard, may be -1 if card is irrelevant
}

class GameUser {
    serverId: number;

    constructor(public name: string, public id: number) {}

    save(): any {
        return {
            type: 'GameUser',
            name: this.name,
            id: this.id
        };
    }

    load(obj: any) {
        if (obj.type !== 'GameUser')
            return;

        this.name = obj.name;
        this.id = obj.id;
    }
}

class Game {
    locations: GameLocation[] = [];
    cards: GameCard[] = [];
    users: GameUser[] = [];

    createLocation(name: string, locationId: number, visibility: {
        [userId: number]: GameLocation.Visibility
    }): GameLocation {
        var location = new GameLocation(name, locationId, visibility);
        this.locations.push(location);
        return location;
    }

    createCard(cardId: number, front: string, back: string, facedown: boolean): GameCard {
        var card = new GameCard(cardId, front, back, facedown);
        this.cards.push(card);
        return card;
    }

    createUser(name: string, userId: number): GameUser {
        var user = new GameUser(name, userId);
        this.users.push(user);
        return user;
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

    findUser(id: number): GameUser {
        for (var i = 0; i < this.users.length; ++i) {
            if (this.users[i].id === id)
                return this.users[i];
        }
        return null;
    }

    save(): any {
        var obj = {
            type: 'Game',
            locations: [],
            cards: [],
            users: []
        };

        for (var i = 0; i < this.locations.length; ++i)
            obj.locations.push(this.locations[i].save());

        for (var i = 0; i < this.cards.length; ++i)
            obj.cards.push(this.locations[i].save());

        for (var i = 0; i < this.users.length; ++i)
            obj.users.push(this.users[i].save());
    }

    load(obj: any) {
        if (obj.type !== 'Game')
            return;

        this.locations = [];
        this.cards = [];
        this.users = [];

        for (var i = 0; i < obj.locations.length; ++i) {
            var location = new GameLocation('', 0, {});
            location.load(obj.locations[i]);
            this.locations.push(location);
        }

        for (var i = 0; i < obj.cards.length; ++i) {
            var card = new GameCard(0, '', '', false);
            card.load(obj.cards[i]);
            this.cards.push(card);
        }

        for (var i = 0; i < obj.users.length; ++i) {
            var user = new GameUser('', 0);
            user.load(obj.users[i]);
            this.users.push(user);
        }
    }
}
