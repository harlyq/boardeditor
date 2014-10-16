/// <reference path="_dependencies.ts" />
module Game {
    var LABEL_PREFIX = '.'
    var LABEL_PREFIX_LENGTH = LABEL_PREFIX.length;

    export function _error(msg) {
        console.error(msg);
        debugger;
    }

    export function _assert(cond, msg ? ) {
        console.assert(cond, msg);
        debugger;
    }

    export function extend(base: any, ...others: any[]): any {
        for (var i = 0; i < others.length; ++i) {
            var other = others[i];
            for (var j in other)
                base[j] = other[j];
        }
        return base;
    }

    function isNumeric(value: any) {
        return !Array.isArray(value) && value - parseFloat(value) >= 0;
    }

    export enum Quantity {
        Exactly, AtMost, AtLeast, MoreThan, LessThan, All
    }

    export enum Position {
        Default, Top, Bottom, Random
    }

    export interface BaseCommand {
        type: string;
    }

    export interface BaseRule {
        id ? : number;
        type ? : string;
        user ? : string;
    }

    export interface MoveRule extends BaseRule {
        from: any;
        fromPosition ? : Position;
        to: any;
        toPosition ? : Position;
        cards ? : string;
        where ? : number;
        whereIndex ? : number; // internal, use where instead
        hint ? : string;
        user ? : string;
        quantity ? : Quantity;
        count ? : number;
    }

    export var default_MoveRule = {
        from: '',
        fromPosition: Position.Default,
        to: '',
        toPosition: Position.Default,
        cards: '',
        where: null,
        whereIndex: -1,
        hint: '',
        user: 'BANK',
        quantity: Quantity.Exactly,
        count: 1
    };

    export interface MoveCommand extends BaseCommand {
        cardId: number;
        toId: number;
        index: number;
    }

    export interface PickRule extends BaseRule {
        list: any;
        quantity ? : Quantity;
        count ? : number;
        where ? : number;
        whereIndex ? : number; // internal, use where instead
    }

    export var default_PickRule = {
        list: '',
        quantity: Quantity.Exactly,
        count: 1,
        where: null,
        whereIndex: -1,
        user: 'BANK'
    };

    export interface PickCommand extends BaseCommand {
        values: any[]; // picked items
    }

    export interface SetRule extends BaseRule {
        name: string;
        value: any;
    }

    export interface SetCommand extends BaseCommand {
        name: string;
        value: any;
    }

    export interface BatchCommand {
        ruleId: number;
        commands: BaseCommand[];
    }

    //----------------------------------------------------------------
    export class Location {
        cards: Card[] = [];
        labels: string[] = [];
        fromPosition: Position = Position.Top;
        toPosition: Position = Position.Top;

        constructor(public name: string, public id: number, public visibility ? : {
            [userId: number]: Location.Visibility
        }) {}

        matches(query: string): boolean {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else if (isNumeric(query))
                return this.id === parseInt(query);
            else
                return this.name === query;
        }

            addLabel(label: string): Location {
            var i = this.labels.indexOf(label);
            if (i === -1)
                this.labels.push(label);

            return this;
        }

            removeLabel(label: string): Location {
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

            addCard(card: Card, toPosition: Position = Position.Default): number {
            if (toPosition === Position.Default)
                toPosition = this.toPosition;

            var numCards = this.cards.length;
            var index = numCards;
            switch (toPosition) {
                case Position.Default:
                case Position.Top:
                    index = numCards;
                    break;
                case Position.Bottom:
                    index = 0;
                    break;
                case Position.Random:
                    index = ~~(Math.random() * numCards);
                    break;
            }

            if (card.location)
                card.location.removeCard(card);

            this.cards.splice(index, 0, card);
            card.location = this;

            return index;
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

            insertCard(card: Card, i: number) {
            if (i < 0)
                i = 0;

            if (card.location !== null)
                card.location.removeCard(card);

            this.cards.splice(i, 0, card);
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

            getNumCards(): number {
            return this.cards.length;
        }

            getVisibility(userId: number): Location.Visibility {
            var visibility = this.visibility[userId];
            if (typeof visibility == 'undefined')
                visibility = Location.Visibility.None;

            return visibility;
        }

            save(): any {
            var obj = {
                type: 'Location',
                name: this.name,
                id: this.id,
                visibility: this.visibility,
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
            this.visibility = obj.visibility;
            this.cards = [];

            for (var i = 0; i < obj.cards.length; ++i) {
                var card = new Card(0, '', '', false);
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

    //----------------------------------------------------------------
    export class Card {
        location: Location = null; // back pointer, do not dereference, used by Location
        labels: string[] = [];

        static UNKNOWN = -1;

        // id may be -1, typically for cards that are facedown and cannot be flipped
        constructor(public id: number, public front: string, public back: string, public facedown: boolean) {}

        matches(query: string): boolean {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else
                return this.id === parseInt(query);
        }

            addLabel(label: string): Card {
            var i = this.labels.indexOf(label);
            if (i === -1)
                this.labels.push(label);

            return this;
        }

            removeLabel(label: string): Card {
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

            save(): any {
            return {
                type: 'Card',
                id: this.id,
                front: this.front,
                back: this.back,
                facedown: this.facedown
            };
        }

            load(obj: any) {
            if (obj.type !== 'Card')
                return;

            this.id = obj.id;
            this.front = obj.front;
            this.back = obj.back;
            this.facedown = obj.facedown;
        }
    }

    //----------------------------------------------------------------
    export class User {
        serverId: number;

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
    export class Board {
        locations: Location[] = [];
        cards: Card[] = [];
        users: User[] = [];
        variables: {
            [key: string]: any
        } = {};
        uniqueId: number = 0;

        createLocation(name: string, locationId: number, visibility ? : {
            [userId: number]: Location.Visibility
        }): Location {
            var location = new Location(name, locationId, visibility);
            this.locations.push(location);
            return location;
        }

            createCard(cardId: number, front: string, back: string, facedown: boolean): Card {
            var card = new Card(cardId, front, back, facedown);
            this.cards.push(card);
            return card;
        }

            createUser(name: string, userId: number): User {
            var user = new User(name, userId);
            this.users.push(user);
            return user;
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

            findLocation(locationId: number): Location {
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].id === locationId)
                    return this.locations[i];
            }
            return null;
        }

            findCard(cardId: number): Card {
            for (var i = 0; i < this.cards.length; ++i) {
                if (this.cards[i].id === cardId)
                    return this.cards[i];
            }
            return null;
        }

            findUser(userId: number): User {
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

            queryFirstCard(query: string): Card {
            var cards = this.queryCards(query, true);
            if (cards.length === 0)
                return null;
            return cards[0];
        }

            queryCards(query: string, quitOnFirst: boolean = false): Card[] {
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
            var ids = query.split(',');
            var users: User[] = [];
            for (var i = 0; i < ids.length; ++i)
                users.push(this.findUser(parseInt(ids[i])));

            return users;
        }

            queryUsers(query: string): User[] {
            var names = query.split(',');
            var users: User[] = [];
            for (var i = 0; i < name.length; ++i)
                users.push(this.findUserByName(names[i]));

            return users;
        }

            setLocalVariable(name: string, value: any) {
            this.variables[name] = value;
        }

            applyVariables(value: string): string {
            var parts = value.split('.');
            for (var i = 0; i < parts.length; ++i) {
                var alias = parts[i];
                if (alias in this.variables)
                    parts[i] = this.variables[alias];
            }
            return parts.join('.');
        }

        // typescript doesn't understand the yield keyword, so these functions are in boardx.js
            waitMove(rule: MoveRule): MoveRule {
            rule.from = this.convertLocation(rule.from);
            rule.to = this.convertLocation(rule.to);
            if (!rule.to)
                _error('to location is empty - ' + rule.to);
            if (!rule.from && !rule.cards)
                _error('from location is empty and no cards - ' + rule.from + ', ' + rule.cards);

            return Game.extend({
                type: 'move',
                id: this.uniqueId++
            }, Game.default_MoveRule, rule);
        }

            waitPick(rule: PickRule): PickRule {
            if (!rule.list)
                _error('pick is empty - ' + rule.list);

            return Game.extend({
                type: 'pick',
                id: this.uniqueId++
            }, Game.default_PickRule, rule);
        }

            waitPickLocation(rule: PickRule): PickRule {
            rule.list = this.convertLocation(rule.list);
            if (!rule.list)
                _error('pick location is empty - ' + rule.list);

            return Game.extend({
                type: 'pickLocation',
                id: this.uniqueId++
            }, Game.default_PickRule, rule);
        }

            waitPickCard(rule: PickRule): PickRule {
            rule.list = this.convertCard(rule.list);
            if (!rule.list)
                _error('pick card is empty - ' + rule.list);

            return Game.extend({
                type: 'pickCard',
                id: this.uniqueId++
            }, Game.default_PickRule, rule);
        }

            waitSetVariable(name: string, value: any): SetRule {
            return {
                type: 'setVariable',
                id: this.uniqueId++,
                name: name,
                value: value,
                user: 'BANK'
            };
        }

            performCommand(command: BaseCommand): any {
            switch (command.type) {
                case 'move':
                    var moveCommand = < MoveCommand > command;
                    var to = this.findLocation(moveCommand.toId);
                    var card = this.findCard(moveCommand.cardId);
                    to.insertCard(card, moveCommand.index);
                    break;
                case 'pick':
                    var pickCommand = < PickCommand > command;
                    return pickCommand.values;
                    break;
                case 'pickLocation':
                    var pickCommand = < PickCommand > command;
                    return this.queryLocations(pickCommand.values.join(','));
                    break;
                case 'pickCard':
                    var pickCommand = < PickCommand > command;
                    return this.queryCards(pickCommand.values.join(','));
                    break;
                case 'setVariable':
                    var setCommand = < SetCommand > command;
                    this.variables[setCommand.name] = setCommand.value;
                    return setCommand.value;
            }
            return null;
        }

            getVariable(name: string): any {
            return this.variables[name];
        }

            next < T > (value: T, list: T[], loop: boolean = false): T {
            var i = list.indexOf(value) + 1;
            if (loop)
                i = i % list.length;

            if (i > list.length)
                return undefined;

            return list[i];
        }

            prev < T > (value: T, list: T[], loop: boolean = false) {
            var i = list.indexOf(value);
            if (i === -1) {
                if (!loop)
                    return undefined;
                i = list.length - 1;
            } else {
                i = i - 1;
                if (i < 0) {
                    if (!loop)
                        return undefined;
                    i = list.length - 1;
                }
            }

            return list[i];
        }

            convertLocation(other: any): string {
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
            } else if (typeof other === 'string')
                str = other;

            return str;
        }

            convertCard(other: any): string {
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
            } else if (typeof other === 'string')
                str = other;

            return str;
        }

            print() {
            for (var i = 0; i < this.locations.length; ++i) {
                var location = this.locations[i];
                var str = location.name + '(' + location.id + '): ';
                for (var j = 0; j < location.cards.length; ++j) {
                    var card = location.cards[j];
                    if (j > 0)
                        str += ',';
                    str += card.id;
                }

                console.log(str);
            }
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
            if (obj.type !== 'Board')
                return;

            this.locations = [];
            this.cards = [];
            this.users = [];

            for (var i = 0; i < obj.locations.length; ++i) {
                var location = new Location('', 0, {});
                location.load(obj.locations[i]);
                this.locations.push(location);
            }

            for (var i = 0; i < obj.cards.length; ++i) {
                var card = new Card(0, '', '', false);
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
}
