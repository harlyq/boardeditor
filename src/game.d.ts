declare
var exports: any;
declare

function browserRequire(): any;
declare

function require(filename: string): any;

declare module Game {
    export function extend(base: any, ...others: any[]): any;

    export function isNumeric(value: any);

    export function union(a: any, b: any): any[];

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

    export function createBatchCommand(id: number, user: string, commands ? : any[]): BatchCommand;

    export interface ConvertInfo {
        type: string; // card, location, region, string, unknown
        value: string; // string of ids
    }

    // export class LabelMixin {
    //     // public labels: string[];
    //     // addLabel: (label: string) => void;
    //     // removeLabel: (label: string) => void;
    //     containsLabel: (label: string) => boolean;
    //     getLabels: () => string[];
    // }

    // export class RegionMixin {
    //     // public regions: Region[];
    //     // addRegion: (region: Region) => void;
    //     // removeRegion: (region: Region) => void;
    //     containsRegion: (regionOrName: any) => boolean;
    // }

    // export class VariableMixin {
    //     // public variables: {
    //     //     [key: string]: any
    //     // };
    //     // setVariables: (variables: {
    //     //     [key: string]: any
    //     // }) => void;
    //     copyVariables: (variables: {
    //         [key: string]: any
    //     }) => {
    //         [key: string]: any
    //     };
    //     // setVariable: (name: string, value: any) => void;
    //     getAlias: (value: string) => string;
    //     getVariable: (name: string) => any;
    //     getVariables: () => any;
    // }

    export class Region /*implements LabelMixin*/ {
        // constructor(name: string);
        matches(query: string): boolean;

        // public labels: string[];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];
    }

    export class Location /*implements LabelMixin, RegionMixin, VariableMixin*/ {
        // constructor(name: string, id: number, variables ? : {
        //     [key: string]: any
        // });

        name: string;
        id: number;

        // public labels: string[];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];

        // public regions: Region[];
        addRegion: (region: Region) => void;
        removeRegion: (region: Region) => void;
        containsRegion: (regionOrName: any) => boolean;

        // public variables: {
        //     [key: string]: any
        // };
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        // setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        matches(query: string): boolean;
        addCard(card: Card, toPosition ? : Position): number;
        removeCard(card: Card);
        insertCard(card: Card, i: number);
        containsCard(card: Card);
        findCard(cardId: number): Card;
        getCard(fromPosition ? : Position): Card;
        getCardByIndex(i: number): Card;
        getCards(): Card[];
        getNumCards(): number;
        shuffle();

        // save(): any;
        // load(obj: any);
    }

    export class Deck /*implements VariableMixin*/ {
        // constructor(name: string, id: number, variables ? : {
        //     [key: string]: any
        // });

        name: string;
        id: number;

        // public variables: {
        //     [key: string]: any
        // };
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        // setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        // addCard(card: Card): Deck;
        getCards(): Card[];
        matches(query: string): boolean;

        // save(): any;
        // load(obj: any);
    }

    export class Card /*implements LabelMixin, RegionMixin, VariableMixin*/ {
        // constructor(name: string, id: number, variables ? : {
        //     [key: string]: any
        // });

        name: string;
        id: number;

        // public labels: string[];
        addLabel: (label: string) => void;
        removeLabel: (label: string) => void;
        containsLabel: (label: string) => boolean;
        getLabels: () => string[];

        // public regions: Region[];
        addRegion: (region: Region) => void;
        removeRegion: (region: Region) => void;
        containsRegion: (regionOrName: any) => boolean;

        // public variables: {
        //     [key: string]: any
        // };
        setVariables: (variables: {
            [key: string]: any
        }) => void;
        copyVariables: (variables: {
            [key: string]: any
        }) => {
            [key: string]: any
        };
        // setVariable: (name: string, value: any) => void;
        getAlias: (value: string) => string;
        getVariable: (name: string) => any;
        getVariables: () => any;

        matches(query: string): boolean;
        // save(): any;
        // load(obj: any);
    }

    export class User {
        name: string;
        id: number;

        // constructor(name: string, id: number);
        // save(): any;
        // load(obj: any);
    }

    export class UniqueList {
        public length: number;
        constructor(args: any[]);
        push(value: any): boolean;
        remove(value: any): boolean;
        add(value: any): boolean;
        indexOf(value: any);
        get(index: number): any;
        next(value: any, loop ? : boolean): any;
    }

    export class Board /*implements VariableMixin*/ {
        public variables: {
            [key: string]: any
        };
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

        // createList(...args: any[]): UniqueList;
        createRule(type: string): BaseRule;
        // createLocation(name: string, locationId: number, variables ? : {
        //     [key: string]: any
        // }): Location;
        // createDeck(name: string, deckId: number, variables ? : {
        //     [key: string]: any
        // }): Deck;
        // createCard(name: string, cardId: number, deck: Deck, variables ? : {
        //     [key: string]: any
        // }): Card;
        // createUser(name: string, userId: number): User;
        // createRegion(name: string): Region;
        getNumLocations(): number;
        getNumCards(): number;

        findLocationByName(name: string): Location;
        findLocationsByLabel(label: string): Location[];
        findLocationById(locationId: number): Location;
        findDeckById(deckId: number): Deck;
        findDeckByCardId(cardId: number): Deck;
        findCardById(cardId: number): Card;
        findUserById(userId: number): User;
        findUserByName(name: string): User;
        findRegionByName(name: string): Region;

        queryFirstDeck(query: string): Deck;
        queryDecks(query: string, quitOnFirst ? : boolean): Deck[];
        queryFirstCard(query: string): Card;
        queryCards(query: string, quitOnFirst ? : boolean): Card[];
        queryFirstLocation(query: string): Location;
        queryLocations(query: string, quitOnFirst ? : boolean): Location[];
        getUsersById(query: string): User[];
        queryUsers(query: string): User[];
        queryRegions(query: string): Region[];

        convertToIdString(key: any): ConvertInfo;
        convertLocationsToIdString(other: any): string;
        convertCardsToIdString(other: any): string;

        // print();
        getDecks(): Deck[];
        getLocations(): Location[];
        getCards(): Card[];

        // save(): any;
        // load(obj: any);
    }

    // export interface ProxyListener {
    //     // client listener's support
    //     onResolveRule ? : (rule: BaseRule) => BatchCommand;
    //     onBroadcastCommands ? : (batch: BatchCommand) => void;

    //     // server listener's support
    //     onSendCommands ? : (batch: BatchCommand) => void;
    //     getUser: () => string;
    // }

    export class Client /*implements ProxyListener*/ {
        // getProxy(): BaseClientProxy;
        getBoard(): Board;
        getUser(): string;
        sendUserCommands(ruleId: number, commands: BaseCommand[]);
    }

    export class HTMLClient extends Client {
        getMapping(): HTMLMapping;
    }

    export class HTMLMapping {
        getUser(): string;
        getBoardElem(): HTMLElement;

        getAlias(value: string): string;

        applyLabels(element: HTMLElement, labels: string[]);
        applyVariables(element: HTMLElement, variables: {
            [key: string]: any
        });
        copyVariables(element: HTMLElement, variables: {
            [key: string]: any
        });

        getDeckFromElem(deckElem: HTMLElement): Deck;
        getElemFromDeck(deck: Deck): HTMLElement;
        getElemFromDeckId(deckId: number): HTMLElement;
        getCardFromElem(cardElem: HTMLElement): Card;
        getElemFromCard(card: Card): HTMLElement;
        getElemFromCardId(cardId: number): HTMLElement;
        getElemsFromCardIds(idList: string): HTMLElement[];
        getElemsFromCards(cards: Card[]): HTMLElement[];
        getLocationFromElem(locationElem: HTMLElement): Location;
        getElemFromLocation(location: Location): HTMLElement;
        getElemFromLocationId(locationId: number): HTMLElement;
        getElemsFromLocationIds(idList: string): HTMLElement[];
        getElemsFromLocations(locations: Location[]): HTMLElement[];

    }

    export interface PluginInfo {
        createRule: (...args: any[]) => Game.BaseRule;
        performRule ? : (client: Game.Client, rule: Game.BaseRule, results: any[]) => boolean;
        updateBoard ? : (board: Game.Board, command: Game.BaseCommand, results: any[]) => any;
        updateHTML ? : (mapping: Game.HTMLMapping, command: Game.BaseCommand) => void;
    }

    export function bindPlugin(board: Board, name: string, info: any);
}
