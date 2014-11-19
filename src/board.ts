/// <reference path="_dependencies.ts" />
module Game {
    var LABEL_PREFIX = '.'
    var LABEL_PREFIX_LENGTH = LABEL_PREFIX.length;

    export function _applyMixins(derived: any, bases: any[]) {
        bases.forEach(base => {
            Object.getOwnPropertyNames(base.prototype).forEach(name => {
                derived.prototype[name] = base.prototype[name];
            })
        });
    }

    export function _error(msg): boolean {
        console.error(msg);
        debugger;
        return false;
    }

    export function _assert(cond, msg ? ): boolean {
        console.assert(cond, msg);
        debugger;
        return false;
    }

    export function extend(base: any, ...others: any[]): any {
        for (var i = 0; i < others.length; ++i) {
            var other = others[i];
            for (var j in other) {
                if (!other.hasOwnProperty(j))
                    continue;

                base[j] = other[j];
            }
        }
        return base;
    }

    export function isNumeric(value: any) {
        return !Array.isArray(value) && value - parseFloat(value) >= 0;
    }

    // returns a list of a's that exist in b
    export function union(a: any, b: any): any[] {
        if (!a || !b)
            return [];

        if (typeof a === 'string')
            a = a.split(',');
        if (typeof b === 'string')
            b = b.split(',');

        if (!Array.isArray(a))
            a = [a];
        if (!Array.isArray(b))
            b = [b];

        var c = [];
        for (var i = 0; i < a.length; ++i) {
            var value = a[i];
            if (b.indexOf(value) !== -1)
                c.push(value);
        }
        return c;
    }

    export enum Quantity {
        Exactly, AtMost, AtLeast, MoreThan, LessThan, All
    }

    export enum Position {
        Default, Top, Bottom, Random
    }

    export interface BaseCommand {
        type ? : string;
    }

    export interface BaseRule {
        type ? : string;
        id ? : number;
        user ? : string;
    }

    export interface BatchCommand {
        ruleId: number;
        commands: {
            [user: string]: BaseCommand[] // commands per user
        };
    }

    export function createBatchCommand(id: number, user: string, commands ? : any[]): BatchCommand {
        var batch: Game.BatchCommand = {
            ruleId: id,
            commands: {}
        };
        batch.commands[user] = commands;
        return batch;
    }

    export interface ConvertInfo {
        type: string; // card, location, region, string, unknown
        value: string; // string of ids
    }


    //----------------------------------------------------------------
    export class LabelMixin {
        public labels: string[];

        addLabel(label: string): void {
            var i = this.labels.indexOf(label);
            if (i === -1)
                this.labels.push(label);
        }

        removeLabel(label: string): void {
            var i = this.labels.indexOf(label);
            if (i !== -1)
                this.labels.splice(i, 1);
        }

        containsLabel(label: string): boolean {
            for (var i = 0; i < this.labels.length; ++i) {
                if (this.labels[i] === label)
                    return true;
            }
            return false;
        }

        getLabels(): string[] {
            return this.labels;
        }

        // // LabelMixin
        // public labels: string[] = [];
        // addLabel: (label: string) => void;
        // removeLabel: (label: string) => void;
        // containsLabel: (label: string) => boolean;
        // getLabels: () => string[];
    }

    //----------------------------------------------------------------
    export class RegionMixin {
        public regions: Region[];

        addRegion(region: Region): void {
            var i = this.regions.indexOf(region);
            if (i === -1)
                this.regions.push(region);
        }

        removeRegion(region: Region): void {
            var i = this.regions.indexOf(region);
            if (i !== -1)
                this.regions.splice(i, 1);
        }

        containsRegion(region: Region): boolean;
        containsRegion(name: string): boolean;
        containsRegion(regionOrName: any): boolean {
            if (typeof regionOrName === 'string') {
                for (var i = 0; i < this.regions.length; ++i) {
                    if (this.regions[i].name === regionOrName)
                        return true;
                }
            } else if (regionOrName instanceof Region) {
                for (var i = 0; i < this.regions.length; ++i) {
                    if (this.regions[i] === regionOrName)
                        return true;
                }
            }
            return false;
        }

        // // RegionMixin
        // public regions: Region[] = [];
        // addRegion: (region: Region) => void;
        // removeRegion: (region: Region) => void;
        // containsRegion: (regionOrName: any) => boolean;
    }

    //----------------------------------------------------------------
    export class VariableMixin {
        public variables: {
            [key: string]: any
        };

        setVariables(variables: {
            [key: string]: any
        }) {
            for (var i in variables)
                this.variables[i] = variables[i];
        }

        copyVariables(variables: {
            [key: string]: any
        }): {
            [key: string]: any
        } {
            var results: any = {};
            for (var i in variables)
                results[i] = this.variables[i];
            return results;
        }

        setVariable(name: string, value: any) {
            this.variables[name] = value;
        }

        getAlias(value: string): string {
            var parts = value.split('.');
            for (var i = 0; i < parts.length; ++i) {
                var part = parts[i];
                if (typeof part === 'string' && part[0] === '$') {
                    var alias = part.substr(1);
                    if (alias in this.variables)
                        parts[i] = this.variables[alias];
                }
            }
            return parts.join('.');
        }

        getVariable(name: string): any {
            return this.variables[name];
        }

        getVariables(): any {
            return this.variables;
        }

        // // VariableMixin
        // public variables: {
        //     [key: string]: any
        // } = {};
        // setVariables: (variables: {[key: string]: any}) => void;
        // copyVariables: (variables:  {[key: string]: any}) => {[key: string]: any};
        // setVariable: (name: string, value: any) => void;
        // getAlias: (value: string) => string;
        // getVariable: (name: string) => any;
        // getVariables: () => any;
    }

    //----------------------------------------------------------------
    export class Region implements LabelMixin {
        constructor(public name: string) {}

        // LabelMixin
        public labels: string[] = [];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];

        matches(query: string): boolean {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else
                return this.name === query;
        }
    }

    _applyMixins(Region, [LabelMixin]);

    //----------------------------------------------------------------
    export class Location implements LabelMixin, RegionMixin, VariableMixin {
        private cards: Card[] = [];
        private fromPosition: Position = Position.Top;
        private toPosition: Position = Position.Top;

        constructor(public name: string, public id: number, variables ? : {
            [key: string]: any
        }) {
            this.setVariables(variables);
        }

        // LabelMixin
        public labels: string[] = [];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];

        // RegionMixin
        public regions: Region[] = [];
        addRegion: (region: Region) => void;
        removeRegion: (region: Region) => void;
        containsRegion: (regionOrName: any) => boolean;

        // VariableMixin
        public variables: {
            [key: string]: any
        } = {};
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        matches(query: string): boolean {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else if (isNumeric(query))
                return this.id === parseInt(query);
            else
                return this.name === query;
        }

        addCard(card: Card, toPosition: Position = Position.Default): number {
            if (toPosition === Position.Default)
                toPosition = this.toPosition;

            var numCards = this.cards.length;
            var i = numCards;
            switch (toPosition) {
                case Position.Default:
                case Position.Top:
                    i = numCards;
                    break;
                case Position.Bottom:
                    i = 0;
                    break;
                case Position.Random:
                    i = ~~(Math.random() * numCards);
                    break;
            }

            this.insertCardInternal(i, card);

            return i;
        }

        addCards(cardList: Card[]) {
            for (var i = 0; i < cardList.length; ++i)
                this.addCard(cardList[i]);
        }

        removeCard(card: Card) {
            if (card.location !== this)
                return; // card not in the correct location

            var i = this.cards.indexOf(card);
            if (i === -1)
                return; // card is not in this location?!

            this.cards.splice(i, 1);
            card.location = null;
        }

        removeAllCards() {
            for (var i = 0; i < this.cards.length; ++i)
                this.removeCard(this.cards[i]);
        }

        insertCard(card: Card, i: number) {
            if (i < 0) {
                var numCards = this.cards.length;

                switch (this.toPosition) {
                    case Position.Default:
                    case Position.Top:
                        i = numCards;
                        break;
                    case Position.Bottom:
                        i = 0;
                        break;
                    case Position.Random:
                        i = ~~(Math.random() * numCards);
                        break;
                }
            }

            this.insertCardInternal(i, card);
        }

        private insertCardInternal(index: number, card: Card) {
            // override card properties with location properties
            var cardVariables = card.variables;
            for (var k in this.variables) {
                cardVariables[k] = this.variables[k];
            }

            if (card.location !== null)
                card.location.removeCard(card);

            this.cards.splice(index, 0, card);
            card.location = this;
        }

        containsCard(card: Card) {
            return this.cards.indexOf(card) !== -1;
        }

        findCard(cardId: number): Card {
            for (var i = 0; i < this.cards.length; ++i) {
                if (this.cards[i].id === cardId)
                    return this.cards[i];
            }

            return null;
        }

        getCard(fromPosition: Position = Position.Default): Card {
            var numCards = this.cards.length;
            if (numCards === 0)
                return null;

            if (fromPosition === Position.Default)
                fromPosition = this.fromPosition;

            switch (fromPosition) {
                case Position.Default:
                case Position.Top:
                    return this.cards[numCards - 1];
                    break;
                case Position.Bottom:
                    return this.cards[0];
                    break;
                case Position.Random:
                    return this.cards[~~(Math.random() * numCards)];
                    break;
            }
        }

        getCardByIndex(i: number): Card {
            if (i < 0 || i >= this.cards.length)
                return null;

            return this.cards[i];
        }

        getCards(): Card[] {
            return this.cards;
        }

        getNumCards(): number {
            return this.cards.length;
        }

        // getVisibility(userId: number): Location.Visibility {
        //     var visibility = this.visibility[userId];
        //     if (typeof visibility == 'undefined')
        //         visibility = Location.Visibility.None;

        //     return visibility;
        // }

        shuffle() {
            var numCards = this.cards.length;
            for (var i = 0; i < numCards; ++i) {
                var card = this.cards[i];
                var j = ~~(Math.random() * numCards);
                var other = this.cards[j];
                this.cards[i] = other;
                this.cards[j] = card;
            }
        }

        save(): any {
            var obj = {
                type: 'Location',
                name: this.name,
                id: this.id,
                // visibility: this.visibility,
                cards: []
            };

            for (var i = 0; i < this.cards.length; ++i)
                obj.cards.push(this.cards[i].save());
        }

        load(obj: any) {
            if (obj.type !== 'Location')
                return;

            this.name = obj.name;
            this.id = obj.id;
            // this.visibility = obj.visibility;
            this.cards = [];

            for (var i = 0; i < obj.cards.length; ++i) {
                var card = new Card('', 0);
                card.load(obj.cards[i]);
                this.cards.push(card);
            }
        }
    }

    export module Location {
        // for a Visibility of faceUp or ownwards, the userId will given all card details
        export enum Visibility {
            None, Count, FaceDown, FaceUp, Flip, Any
        };
    }

    _applyMixins(Location, [LabelMixin, RegionMixin, VariableMixin]);

    //----------------------------------------------------------------
    export class Deck implements VariableMixin {
        private cards: Card[] = [];

        constructor(public name: string, public id: number, variables ? : {
            [key: string]: any
        }) {
            if (variables) {
                for (var i in variables)
                    this.variables[i] = variables[i];
            }
        }

        // VariableMixin
        public variables: {
            [key: string]: any
        } = {};
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        addCard(card: Card): Deck {
            // apply the deck properties - if not present on the card
            var cardVariables = card.variables;
            for (var k in this.variables) {
                if (!cardVariables.hasOwnProperty(k))
                    cardVariables[k] = this.variables[k];
            }

            this.cards.push(card);
            return this;
        }

        getCards(): Card[] {
            return this.cards;
        }

        matches(query: string): boolean {
            return this.id === parseInt(query);
        }

        save(): any {
            return {
                type: 'Deck',
                name: this.name,
                id: this.id,
                variables: this.variables
            };
        }

        // TODO work how how to bind cards to decks
        load(obj: any) {
            if (obj.type !== 'Deck')
                return;

            this.name = obj.name;
            this.id = obj.id;
            this.variables = obj.variables;
        }
    }

    _applyMixins(Deck, [VariableMixin]);

    //----------------------------------------------------------------
    export class Card implements LabelMixin, RegionMixin, VariableMixin {
        public location: Location = null; // back pointer, do not dereference, used by Location

        static UNKNOWN = -1;

        // id may be -1, typically for cards that are facedown and cannot be flipped
        constructor(public name: string, public id: number, variables ? : {
            [key: string]: any
        }) {
            if (variables) {
                for (var i in variables)
                    this.variables[i] = variables[i];
            }
        }

        // LabelMixin
        public labels: string[] = [];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];

        // RegionMixin
        public regions: Region[] = [];
        addRegion: (region: Region) => void;
        removeRegion: (region: Region) => void;
        containsRegion: (regionOrName: any) => boolean;

        // VariableMixin
        public variables: {
            [key: string]: any
        } = {};
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        matches(query: string): boolean {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else if (isNumeric(query))
                return this.id === parseInt(query);
            else
                return this.name === query;
        }

        save(): any {
            return {
                type: 'Card',
                name: this.name,
                id: this.id,
                variables: this.variables
            };
        }

        load(obj: any) {
            if (obj.type !== 'Card')
                return;

            this.name = obj.name;
            this.id = obj.id;
            this.variables = obj.variables;
        }
    }

    _applyMixins(Card, [LabelMixin, RegionMixin, VariableMixin]);

    //----------------------------------------------------------------
    export class User {
        public serverId: number;

        constructor(public name: string, public id: number) {}

        save(): any {
            return {
                type: 'User',
                name: this.name,
                id: this.id
            };
        }

        load(obj: any) {
            if (obj.type !== 'User')
                return;

            this.name = obj.name;
            this.id = obj.id;
        }
    }

    //----------------------------------------------------------------
    export class UniqueList {
        private values: any[];
        private removed: boolean[] = []; // one index for each value
        public length: number = 0;

        constructor(args: any[]) {
            this.values = args;
            this.length = args.length;
            for (var i = 0; i < args.length; ++i)
                this.removed[i] = false;
        }

        push(value: any): boolean {
            return this.add(value);
        }

        remove(value: any): boolean {
            var i = this.values.indexOf(value);
            if (i === -1)
                return false; // value not present

            if (this.removed[i])
                return false; // value is hidden, cannot be removed again

            this.removed[i] = true;
            --this.length;

            return true;
        }

        add(value: any): boolean {
            if (this.indexOf(value))
                return false; // already present (and not removed)

            var i = this.values.indexOf(value);
            if (i !== -1)
                this.values.splice(i, 1); // delete old removed value

            i = this.values.length;
            this.values.push(value);
            this.removed[i] = false;
            ++this.length;

            return true;
        }

        indexOf(value: any) {
            for (var i = 0; i < this.values.length; ++i) {
                if (this.values[i] === value)
                    return (this.removed[i] ? -1 : i);
            }
            return -1;
        }

        get(index: number): any {
            if (index < 0 || index >= this.length)
                return undefined; // outside of bounds

            for (var i = 0, k = 0; i < this.values.length; ++i) {
                if (this.removed[i])
                    continue;

                if (k === index)
                    return this.values[i];

                k++;
            }
            _assert('invalid logic');

            return undefined; // should never happen
        }

        next(value: any, loop: boolean = true): any {
            if (this.length === 0)
                return undefined; // no entries available

            var i = this.values.indexOf(value);
            if (i === -1)
                return undefined; // value was never in the list

            do {
                i = this.nextIndex(i, loop);
            } while (i >= 0 && this.removed[i]);

            if (i === -1)
                return undefined; // no next value

            return this.values[i];
        }

        private nextIndex(i: number, loop: boolean): number {
            i++;
            if (i >= this.values.length) {
                if (!loop)
                    i = -1;
                else
                    i = 0;
            }
            return i;
        }
    }

    //----------------------------------------------------------------
    export class Board implements VariableMixin {
        private locations: Location[] = [];
        private decks: Deck[] = [];
        private cards: Card[] = [];
        private users: User[] = [];
        private regions: Region[] = [];
        private uniqueId: number = 0;
        private lastRuleId: number = 0;

        // VariableMixin
        public variables: {
            [key: string]: any
        } = {};
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        createList(...args: any[]): UniqueList {
            if (args.length === 1 && Array.isArray(args[0]))
                args = args[0]; // user passed an array, treat this as the list

            return new UniqueList(args);
        }

        createRule(type: string): BaseRule {
            return {
                id: this.uniqueId++,
                type: type,
                user: 'BANK'
            };
        }

        createLocation(name: string, locationId: number, variables ? : {
            [key: string]: any
        }): Location {
            var location = new Location(name, locationId, variables);
            this.locations.push(location);
            return location;
        }

        createDeck(name: string, deckId: number, variables ? : {
            [key: string]: any
        }): Deck {
            var deck = new Deck(name, deckId, variables);
            this.decks.push(deck);
            return deck;
        }

        createCard(name: string, cardId: number, deck: Deck, variables ? : {
            [key: string]: any
        }): Card {
            var card = new Card(name, cardId, variables);
            this.cards.push(card);

            if (deck)
                deck.addCard(card);

            return card;
        }

        createUser(name: string, userId: number): User {
            var user = new User(name, userId);
            this.users.push(user);
            return user;
        }

        createRegion(name: string): Region {
            var region = new Region(name);
            this.regions.push(region);
            return region;
        }

        getNumLocations(): number {
            return this.locations.length;
        }

        getNumCards(): number {
            return this.cards.length;
        }

        findLocationByName(name: string): Location {
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].name === name)
                    return this.locations[i];
            }
            return null;
        }

        findLocationsByLabel(label: string): Location[] {
            var locations: Location[] = [];
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].containsLabel(label))
                    locations.push(this.locations[i]);
            }
            return locations;
        }

        findLocationById(locationId: number): Location {
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].id === locationId)
                    return this.locations[i];
            }
            return null;
        }

        findDeckById(deckId: number): Deck {
            // decks are often represented by a negative id
            if (deckId < 0)
                deckId = -deckId;

            for (var i = 0; i < this.decks.length; ++i) {
                if (this.decks[i].id === deckId)
                    return this.decks[i];
            }
            return null;
        }

        findDeckByCardId(cardId: number): Deck {
            for (var i = 0; i < this.decks.length; ++i) {
                var deck = this.decks[i];
                for (var j = 0; j < deck.getCards().length; ++j) {
                    var card = deck.getCards()[j];
                    if (card.id === cardId)
                        return deck;
                }
            }
            return null;
        }

        findCardById(cardId: number): Card {
            for (var i = 0; i < this.cards.length; ++i) {
                if (this.cards[i].id === cardId)
                    return this.cards[i];
            }
            return null;
        }

        findUserById(userId: number): User {
            for (var i = 0; i < this.users.length; ++i) {
                if (this.users[i].id === userId)
                    return this.users[i];
            }
            return null;
        }

        findUserByName(name: string): User {
            for (var i = 0; i < this.users.length; ++i) {
                if (this.users[i].name === name)
                    return this.users[i];
            }
            return null;
        }

        findRegionByName(name: string): Region {
            for (var i = 0; i < this.regions.length; ++i) {
                if (this.regions[i].name === name)
                    return this.regions[i];
            }
            return null;
        }

        queryFirstDeck(query: string): Deck {
            if (!query)
                return null;

            var decks = this.queryDecks(query, true);
            if (decks.length === 0)
                return null;
            return decks[0];
        }

        queryDecks(query: string, quitOnFirst: boolean = false): Deck[] {
            if (!query)
                return [];

            var tags = query.split(',');
            var decks: Deck[] = [];

            for (var j = 0; j < this.decks.length; ++j) {
                var deck = this.decks[j];

                for (var i = 0; i < tags.length; ++i) {
                    var tag = tags[i].trim();
                    if (deck.matches(tag)) {
                        decks.push(deck);
                        if (quitOnFirst)
                            return decks;

                        break;
                    }
                }
            }

            return decks;
        }

        queryFirstCard(query: string): Card {
            if (!query)
                return null;

            var cards = this.queryCards(query, true);
            if (cards.length === 0)
                return null;
            return cards[0];
        }

        queryCards(query: string, quitOnFirst: boolean = false): Card[] {
            if (!query)
                return [];

            var tags = query.split(',');
            var cards: Card[] = [];

            for (var j = 0; j < this.cards.length; ++j) {
                var card = this.cards[j];

                for (var i = 0; i < tags.length; ++i) {
                    var tag = tags[i].trim();
                    if (card.matches(tag)) {
                        cards.push(card);
                        if (quitOnFirst)
                            return cards;

                        break;
                    }
                }
            }

            return cards;
        }

        queryFirstLocation(query: string): Location {
            var locations = this.queryLocations(query, true);
            if (locations.length === 0)
                return null;
            return locations[0];
        }

        queryLocations(query: string, quitOnFirst: boolean = false): Location[] {
            if (!query)
                return [];

            var tags = query.split(',');
            var locations: Location[] = [];

            for (var j = 0; j < this.locations.length; ++j) {
                var location = this.locations[j];

                for (var i = 0; i < tags.length; ++i) {
                    var tag = tags[i].trim();
                    if (location.matches(tag)) {
                        locations.push(location);
                        if (quitOnFirst)
                            return locations;

                        break;
                    }
                }
            }

            return locations;
        }

        getUsersById(query: string): User[] {
            if (!query)
                return [];

            var ids = query.split(',');
            var users: User[] = [];
            for (var i = 0; i < ids.length; ++i)
                users.push(this.findUserById(parseInt(ids[i])));

            return users;
        }

        queryUsers(query: string): User[] {
            if (!query)
                return [];

            var names = query.split(',');
            var users: User[] = [];
            for (var i = 0; i < name.length; ++i)
                users.push(this.findUserByName(names[i]));

            return users;
        }

        queryRegions(query: string): Region[] {
            if (!query)
                return [];

            var names = query.split(',');
            var regions: Region[] = [];
            for (var i = 0; i < names.length; ++i)
                regions.push(this.findRegionByName(names[i]));
            return regions;
        }

        queryThings(query: string): any[] {
            var things = [];

            things = this.queryLocations(query);
            if (things.length === 0) {
                things = this.queryCards(query);
                if (things.length === 0)
                    things = this.queryRegions(query);
            }

            return things;
        }

        // CONVERSION FUNCTIONS
        convertToIdString(key: any): ConvertInfo {
            var isKeyArray = Array.isArray(key),
                type = 'unknown',
                value = '';

            if (isKeyArray && key.length === 0) {
                Game._error('key is an empty array');
            } else if (key instanceof Game.Card || (isKeyArray && key[0] instanceof Game.Card)) {
                type = 'card';
                value = this.convertCardsToIdString(key);
            } else if (key instanceof Game.Location || (isKeyArray && key[0] instanceof Game.Location)) {
                type = 'location';
                value = this.convertLocationsToIdString(key);
            } else if (key instanceof Game.Region || (isKeyArray && key[0] instanceof Game.Region)) {
                type = 'region';
                // value = board.convertRegionsToIdString(key);
            } else if (isKeyArray) {
                type = 'string';
                value = key.join(',');
            } else if (key) {
                type = 'string';
                value = key.toString();
            }

            if (type === 'string') {
                var things = this.queryThings(key);
                if (things.length > 0)
                    return this.convertToIdString(things);
            }

            return {
                type: type,
                value: value
            };
        }

        convertLocationsToIdString(other: any): string {
            var str = '';
            if (other instanceof Game.Location)
                str = other.id.toString();
            else if (Array.isArray(other)) {
                for (var i = 0; i < other.length; ++i) {
                    var value = other[i];
                    if (i > 0)
                        str += ',';
                    if (value instanceof Game.Location)
                        str += value.id;
                    else if (typeof value === 'string')
                        str += value;
                    else if (typeof value === 'number')
                        str += value.toString();
                }
            } else if (typeof other === 'string') {
                var locations = this.queryLocations(other);
                return this.convertLocationsToIdString(locations);
            }

            return str;
        }

        convertCardsToIdString(other: any): string {
            var str = '';
            if (other instanceof Game.Card)
                str = other.id.toString();
            else if (Array.isArray(other)) {
                for (var i = 0; i < other.length; ++i) {
                    var value = other[i];
                    if (i > 0)
                        str += ',';
                    if (value instanceof Game.Card)
                        str += value.id;
                    else if (typeof value === 'string')
                        str += value;
                    else if (typeof value === 'number')
                        str += value.toString();
                }
            } else if (typeof other === 'string') {
                var cards = this.queryCards(other);
                return this.convertCardsToIdString(cards);
            }

            return str;
        }

        print() {
            for (var i = 0; i < this.locations.length; ++i) {
                var location = this.locations[i];
                var str = location.name + '(' + location.id + '): ';
                for (var j = 0; j < location.getCards().length; ++j) {
                    var card = location.getCards()[j];
                    if (j > 0)
                        str += ',';
                    str += card.id;
                }

                console.log(str);
            }
        }

        getDecks(): Deck[] {
            return this.decks;
        }

        getLocations(): Location[] {
            return this.locations;
        }

        getCards(): Card[] {
            return this.cards;
        }

        save(): any {
            var obj = {
                type: 'Board',
                locations: [],
                decks: [],
                cards: [],
                users: []
            };

            for (var i = 0; i < this.locations.length; ++i)
                obj.locations.push(this.locations[i].save());

            for (var i = 0; i < this.decks.length; ++i)
                obj.decks.push(this.decks[i].save());

            for (var i = 0; i < this.cards.length; ++i)
                obj.cards.push(this.locations[i].save());

            for (var i = 0; i < this.users.length; ++i)
                obj.users.push(this.users[i].save());

        }

        load(obj: any) {
            if (obj.type !== 'Board')
                return;

            this.locations = [];
            this.decks = [];
            this.cards = [];
            this.users = [];

            for (var i = 0; i < obj.locations.length; ++i) {
                var location = new Location('', 0, {});
                location.load(obj.locations[i]);
                this.locations.push(location);
            }

            for (var i = 0; i < obj.decks.length; ++i) {
                var deck = new Deck('', 0);
                deck.load(obj.decks[i]);
                this.decks.push(deck);
            }

            for (var i = 0; i < obj.cards.length; ++i) {
                var card = new Card('', 0);
                card.load(obj.cards[i]);
                this.cards.push(card);
            }

            for (var i = 0; i < obj.users.length; ++i) {
                var user = new User('', 0);
                user.load(obj.users[i]);
                this.users.push(user);
            }
        }
    }

    _applyMixins(Board, [VariableMixin]);
}
