var LABEL_PREFIX = '.'
var LABEL_PREFIX_LENGTH = LABEL_PREFIX.length;

enum LocationPosition {
    Default, Top, Bottom, Random
}

class GameLocation {
    cards: GameCard[] = [];
    labels: string[] = [];
    fromPosition: LocationPosition = LocationPosition.Top;
    toPosition: LocationPosition = LocationPosition.Top;

    constructor(public name: string, public id: number, public visibility: {
        [userId: number]: GameLocation.Visibility
    }) {}

    matches(tag: string): boolean {
        if (tag.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
            return this.containsLabel(tag.substr(LABEL_PREFIX_LENGTH));
        else
            return this.name === tag;
    }

        addLabel(label: string): GameLocation {
        var i = this.labels.indexOf(label);
        if (i === -1)
            this.labels.push(label);

        return this;
    }

        removeLabel(label: string): GameLocation {
        var i = this.labels.indexOf(label);
        if (i !== -1)
            this.labels.splice(i, 1);

        return this;
    }

        containsLabel(label: string): boolean {
        for (var i = 0; i < this.labels.length; ++i) {
            if (this.labels[i] === label)
                return true;
        }
        return false;
    }

        addCard(card: GameCard, toPosition: LocationPosition = LocationPosition.Default): number {
        if (toPosition === LocationPosition.Default)
            toPosition = this.toPosition;

        var numCards = this.cards.length;
        var index = numCards;
        switch (toPosition) {
            case LocationPosition.Default:
            case LocationPosition.Top:
                index = numCards;
                break;
            case LocationPosition.Bottom:
                index = 0;
                break;
            case LocationPosition.Random:
                index = ~~(Math.random() * numCards);
                break;
        }

        if (card.location)
            card.location.removeCard(card);

        this.cards.splice(index, 0, card);
        card.location = this;

        return index;
    }

        removeCard(card: GameCard) {
        if (card.location !== this)
            return; // card not in the correct location

        var i = this.cards.indexOf(card);
        if (i === -1)
            return; // card is not in this location?!

        this.cards.splice(i, 1);
        card.location = null;
    }

        insertCard(card: GameCard, i: number) {
        if (i < 0)
            i = 0;
        if (i >= this.cards.length)
            i = this.cards.length - 1;

        if (card.location !== null)
            card.location.removeCard(card);

        this.cards.splice(i, 0, card);
        card.location = this;
    }

        containsCard(card: GameCard) {
        return this.cards.indexOf(card) !== -1;
    }

        findCard(cardId: number): GameCard {
        for (var i = 0; i < this.cards.length; ++i) {
            if (this.cards[i].id === cardId)
                return this.cards[i];
        }

        return null;
    }

        getCard(fromPosition: LocationPosition = LocationPosition.Default): GameCard {
        var numCards = this.cards.length;
        if (numCards === 0)
            return null;

        if (fromPosition === LocationPosition.Default)
            fromPosition = this.fromPosition;

        switch (fromPosition) {
            case LocationPosition.Default:
            case LocationPosition.Top:
                return this.cards[numCards - 1];
                break;
            case LocationPosition.Bottom:
                return this.cards[0];
                break;
            case LocationPosition.Random:
                return this.cards[~~(Math.random() * numCards)];
                break;
        }
    }

        getCardByIndex(i: number): GameCard {
        if (i < 0 || i >= this.cards.length)
            return null;

        return this.cards[i];
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
    location: GameLocation = null; // back pointer, do not dereference, used by GameLocation

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
    variables: GameVariable[] = [];

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

        createVariable(name: string, value ? : any): GameVariable {
        var variable = new GameVariable(value);
        variable.setName(name);
        this.variables.push(variable);
        return variable;
    }

        getNumLocations(): number {
        return this.locations.length;
    }

        getNumCards(): number {
        return this.cards.length;
    }

        findLocationByName(name: string): GameLocation {
        for (var i = 0; i < this.locations.length; ++i) {
            if (this.locations[i].name === name)
                return this.locations[i];
        }
        return null;
    }

        findLocationsByLabel(label: string): GameLocation[] {
        var locations: GameLocation[] = [];
        for (var i = 0; i < this.locations.length; ++i) {
            if (this.locations[i].containsLabel(label))
                locations.push(this.locations[i]);
        }
        return locations;
    }

        findLocation(locationId: number): GameLocation {
        for (var i = 0; i < this.locations.length; ++i) {
            if (this.locations[i].id === locationId)
                return this.locations[i];
        }
        return null;
    }

        findCard(cardId: number): GameCard {
        for (var i = 0; i < this.cards.length; ++i) {
            if (this.cards[i].id === cardId)
                return this.cards[i];
        }
        return null;
    }

        findUser(userId: number): GameUser {
        for (var i = 0; i < this.users.length; ++i) {
            if (this.users[i].id === userId)
                return this.users[i];
        }
        return null;
    }

        findUserByName(name: string): GameUser {
        for (var i = 0; i < this.users.length; ++i) {
            if (this.users[i].name === name)
                return this.users[i];
        }
        return null;
    }

        findVariable(name: string): GameVariable {
        for (var i = 0; i < this.variables.length; ++i) {
            if (this.variables[i].name === name)
                return this.variables[i];
        }
        return null;
    }

        queryCards(cards: string): GameCard[] {
        var ids = cards.split(',');
        var gameCards: GameCard[] = [];

        for (var i = 0; i < ids.length; ++i)
            gameCards.push(this.findCard(parseInt(ids[i])));

        return gameCards;
    }

        queryLocations(query: string): GameLocation[] {
        var tags = query.split(',');
        var gameLocations: GameLocation[] = [];

        for (var j = 0; j < this.locations.length; ++j) {
            var location = this.locations[j];

            for (var i = 0; i < tags.length; ++i) {
                var tag = tags[i];
                if (location.matches(tag)) {
                    gameLocations.push(location);
                    break;
                }
            }
        }

        return gameLocations;
    }

        getUsersById(users: string): GameUser[] {
        var ids = users.split(',');
        var gameUsers: GameUser[] = [];
        for (var i = 0; i < ids.length; ++i)
            gameUsers.push(this.findUser(parseInt(ids[i])));

        return gameUsers;
    }

        getUsersByName(users: string): GameUser[] {
        var names = users.split(',');
        var gameUsers: GameUser[] = [];
        for (var i = 0; i < name.length; ++i)
            gameUsers.push(this.findUserByName(names[i]));

        return gameUsers;
    }

        getVariablesByName(variables: string): GameVariable[] {
        var names = variables.split(',');
        var gameVariables: GameVariable[] = [];
        for (var i = 0; i < names.length; ++i)
            gameVariables.push(this.findVariable(names[i]));

        return gameVariables;
    }

        resolve(list: string): string {
        var names = list.split(',');
        for (var j = 0; j < names.length; ++j) {
            var parts = names[j].split('.');
            for (var i = 0; i < parts.length; ++i) {
                if (parts[i][0] === '$') {
                    var alias = this.findVariable(parts[i].substr(1));
                    parts[i] = alias.toString();
                }
            }
            names[j] = parts.join('.');
        }
        return names.join(',');
    }

        save(): any {
        var obj = {
            type: 'Game',
            locations: [],
            cards: [],
            users: [],
            variables: []
        };

        for (var i = 0; i < this.locations.length; ++i)
            obj.locations.push(this.locations[i].save());

        for (var i = 0; i < this.cards.length; ++i)
            obj.cards.push(this.locations[i].save());

        for (var i = 0; i < this.users.length; ++i)
            obj.users.push(this.users[i].save());

        for (var i = 0; i < this.variables.length; ++i)
            obj.variables.push(this.variables[i].save());
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

        for (var i = 0; i < obj.variables.length; ++i) {
            var variable = new GameVariable('');
            variable.load(obj.variables[i]);
            this.variables.push(variable);
        }
    }
}

class GameVariable {
    // use seperate index and data lists, as it is easier to iterate, index and count
    // 'index' can have duplicates, but 'data' will not
    private index: number[] = [];
    private data: string[] = [];
    public name: string = '';

    constructor(variable ? : any) {
        if (typeof variable !== 'undefined')
            this.set(variable);
    }

    setName(name: string) {
        this.name = name;
    }

    clone(): GameVariable {
        var variable = new GameVariable();
        return variable.copy(this);
    }

    copy(other: GameVariable): GameVariable {
        this.index = other.index;
        this.data = other.data;
        return this;
    }

    set(variable: any): GameVariable {
        if (variable instanceof GameVariable) {
            return this.copy( < GameVariable > variable);
        }

        this.index.length = 0;
        this.data.length = 0;
        this.add(variable);

        return this;
    }

    toArray(): string[] {
        var list: string[] = [];
        for (var i = 0; i < this.index.length; ++i) {
            list.push(this.data[this.index[i]]);
        }
        return list;
    }

    toString(): string {
        if (this.index.length === 0)
            return '';

        return this.data[this.index[0]];
    }

    toNumber(): number {
        if (this.index.length === 0)
            return Number.NaN;

        return parseFloat(this.data[this.index[0]]);
    }

    toBoolean(): boolean {
        return this.index.length > 0;
    }

    join(seperator: string): string {
        var str = '';
        for (var i = 0; i < this.index.length; ++i) {
            if (i > 0)
                str += seperator;

            str += this.data[this.index[i]];
        }
        return str;
    }

    sum(): number {
        var total = 0;
        for (var i = 0; i < this.index.length; ++i) {
            var val = parseFloat(this.data[this.index[i]]);
            if (!isNaN(val))
                total += val;
        }
        return total;
    }

    product(): number {
        var total = 1;
        for (var i = 0; i < this.index.length; ++i) {
            var val = parseFloat(this.data[this.index[i]]);
            if (!isNaN(val))
                total *= val;
        }
        return total;
    }

    at(i: number): string {
        if (typeof this.index[i] === 'undefined')
            return undefined;

        return this.data[this.index[i]];
    }

    count(): number {
        return this.data.length;
    }

    add(variable: any): GameVariable {
        if (variable instanceof GameVariable) {
            variable = variable.toArray();
        } else if (Array.isArray(variable)) {
            // do nothing
        } else if (typeof variable === 'string') {
            // the string 'a,b' is split into a list 'a' and 'b'
            variable = variable.split(',');
        } else {
            variable = [variable.toString()];
        } // else object????

        for (var i = 0; i < variable.length; ++i)
            this.addItem(variable[i]);

        return this;
    }

    private addItem(value: string) {
        // if a value already exsits, add it's index to the end of the index list
        var i = this.data.indexOf(value);
        if (i !== -1) {
            var j = this.index.indexOf(i);
            this.index.push(i);
            return;
        }

        this.index.push(this.data.length);
        this.data.push(value);
    }

    remove(variable: any): GameVariable {
        if (variable instanceof GameVariable) {
            variable = variable.toArray();
        } else if (Array.isArray(variable)) {
            // do nothing
        } else if (typeof variable === 'string') {
            variable = variable.split(',')
        } else {
            variable = [variable.toString()];
        }

        for (var i = 0; i < variable.length; ++i)
            this.removeItem(variable[i]);

        return this;
    }

    // if the value exists, we remove the index, but not the actual data,
    // this means that the iterator functions still work, even if the
    // variable has been removed
    private removeItem(value: string) {
        var i = this.data.indexOf(value);
        if (i !== -1) {
            var j = this.index.lastIndexOf(i); // remove from the end
            if (j !== -1)
                this.index.splice(j, 1);
        }
    }

    union(variable: any): GameVariable {
        this.add(variable);

        var i = 0;
        while (i < this.index.length) {
            var j = this.index.lastIndexOf(i);
            if (i !== j)
                this.index.splice(j, 1); // remove from the end
            else
                i++;
        }

        return this;
    }

    clear(): GameVariable {
        this.data.length = 0;
        this.index.length = 0;
        return this;
    }

    indexOf(variable: any): number {
        var value = new GameVariable(variable).toString();
        for (var i = 0; i < this.index.length; ++i) {
            if (this.data[this.index[i]] === value)
                return i;
        }
        return -1;
    }

    private indexOfData(variable: any): number {
        var value = new GameVariable(variable).toString();
        for (var i = 0; i < this.data.length; ++i) {
            if (this.data[i] === value)
                return i;
        }
        return -1;
    }

    find(isTrue: (value: string, i ? : number) => boolean): GameVariable {
        for (var i = 0; i < this.index.length; ++i) {
            if (isTrue(this.data[this.index[i]], i))
                return new GameVariable(this.data[i]);
        }

        return new GameVariable();
    }

    forEach(func: (value: string, i ? : number) => void) {
        for (var i = 0; i < this.index.length; ++i)
            func(this.data[this.index[i]], i);
    }

    // assumes no duplicates
    next(list: any): GameVariable {
        if (!(list instanceof GameVariable))
            list = new GameVariable(list);

        var listVariable = ( < GameVariable > list);
        var i = listVariable.indexOfData(this.toString);
        if (i === -1 || i === this.data.length)
            return new GameVariable();

        return new GameVariable(this.data[i + 1]);
    }


    // assumes no duplicates
    prev(list: any): GameVariable {
        if (!(list instanceof GameVariable))
            list = new GameVariable(list);

        var listVariable = ( < GameVariable > list);
        var i = listVariable.indexOfData(this.toString);
        if (i <= 0)
            return new GameVariable();

        return new GameVariable(this.data[i - 1]);
    }

    save(): any {
        return {
            type: 'Variable',
            name: this.name,
            index: this.index,
            data: this.data
        };
    }

    load(obj: any) {
        if (obj.type !== 'Variable')
            return;

        this.name = obj.name;
        this.index = obj.index;
        this.data = obj.data;
    }
}
