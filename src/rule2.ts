/// <reference path="game.ts" />
/// <reference path="command.ts" />
/// <reference path="proxy.ts" />
enum Quantity {
    Exactly, AtMost, AtLeast, MoreThan, LessThan
}

enum RuleResponse {
    Pending, Complete, Error
}

class Rules {
    rules: BaseRule[] = [];

    add(rule: BaseRule): Rules {
        this.rules.push(rule);
        return this;
    }

        remove(rule: BaseRule): Rules {
        var i = this.rules.indexOf(rule);
        if (i !== -1)
            this.rules.splice(i, 1);
        return this;
    }
}

class BaseRule {
    id: number;
    static nextId: number = 1;

    constructor() {
        this.id = BaseRule.nextId++;
    }

    setOptions(options: any) {
        for (var i in options) {
            var privateI = '_' + i;
            this[privateI] = options[i];
        }
    }

    execute(game: Game, proxyManager: ProxyManager): RuleResponse {
        debugger; // derived class must call execute
        return RuleResponse.Error; // never call the base class
    }
}

// T template is the derived type, works around a lack of this typing in TypeScript
class CountRule < T > extends BaseRule {
    _position: LocationPosition = LocationPosition.Default;
    _user: string = 'BANK';
    _set: string;
    _quantity: Quantity = Quantity.Exactly;
    _count: number = 1;

    isCountValid(count: number): boolean {
        switch (this._quantity) {
            case Quantity.Exactly:
                return count === this._count;
            case Quantity.AtMost:
                return count <= this._count;
            case Quantity.AtLeast:
                return count >= this._count;
            case Quantity.MoreThan:
                return count > this._count;
            case Quantity.LessThan:
                return count < this._count;
        }
        return false;
    }

        exactly(val: number): T {
        this._quantity = Quantity.Exactly;
        this._count = val;
        return <T > < any > this;
    }

        atLeast(val: number): T {
        this._quantity = Quantity.AtLeast;
        this._count = val;
        return <T > < any > this;
    }

        atMost(val: number): T {
        this._quantity = Quantity.AtMost;
        this._count = val;
        return <T > < any > this;
    }

        moreThan(val: number): T {
        this._quantity = Quantity.MoreThan;
        this._count = val;
        return <T > < any > this;
    }

        lessThan(val: number): T {
        this._quantity = Quantity.LessThan;
        this._count = val;
        return <T > < any > this;
    }

        position(val: LocationPosition): T {
        this._position = val;
        return <T > < any > this;
    }

        user(val: string): T {
        this._user = val;
        return <T > < any > this;
    }

        set(val: string): T {
        this._set = val;
        return <T > < any > this;
    }
}

class MoveRule extends CountRule < MoveRule > {
    _from: string;
    _to: string;
    _cards: string;
    _fromPosition: LocationPosition = LocationPosition.Default;
    _toPosition: LocationPosition = LocationPosition.Default;
    _resolvedRule: MoveRule = null;

    constructor();
    constructor(options: any);
    constructor(from: string, to: string);
    constructor(optionsOrFrom ? : any, to ? : string) {
        super();

        if (typeof optionsOrFrom === 'object')
            this.setOptions(optionsOrFrom);
        else if (typeof optionsOrFrom === 'string')
            this._from = optionsOrFrom;
        if (typeof to === 'string')
            this._to = to;
    }

    execute(game: Game, proxyManager: ProxyManager): RuleResponse {
        if (!this._resolvedRule) {
            var from = game.resolve(this._from);
            var to = game.resolve(this._to);
            var cards = game.resolve(this._cards);
            var user = game.resolve(this._user);

            if (!from)
                return RuleResponse.Error; //this.error('Invalid from');

            if (!to)
                return RuleResponse.Error; //this.error('Invalid to');

            this._resolvedRule = this.clone().from(from).to(to).cards(cards).user(user);
        }

        var userProxy = proxyManager.getProxy(this._resolvedRule._user);
        if (!userProxy)
            return RuleResponse.Error; // this.error('User does not have a proxy')

        var commands = userProxy.askUser(this._resolvedRule);

        if (!this.isMoveValid(game, commands))
            return RuleResponse.Error; // this.error('Incorrect cards, or locations')

        this._resolvedRule = null;

        return RuleResponse.Complete;
    }

        isMoveValid(game: Game, commands: BaseCommand[]): boolean {
        var totalCards: GameCard[] = [];
        for (var i = 0; i < commands.length; ++i) {
            if (!(commands[i] instanceof MoveCommand))
                return false;

            var command = < MoveCommand > commands[i];
            var from = command.card.location;

            if (!from)
                return false; // card is not in the game

            if (!from.matches(this._resolvedRule._from))
                return false; // from does not match the rule

            if (!command.to.matches(this._resolvedRule._to))
                return false; // from does not match the rule

            totalCards.push(command.card);
        }

        if (!this.isCountValid(totalCards.length))
            return false; // incorrect number of cards

        return true;
    }

        clone(): MoveRule {
        return new MoveRule().copy(this);
    }

        copy(other: MoveRule): MoveRule {
        for (var i in other) {
            this[i] = other[i];
        }
        return this;
    }

        from(val: string): MoveRule {
        this._from = val;
        return this;
    }

        to(val: string): MoveRule {
        this._to = val;
        return this;
    }

        cards(val: string): MoveRule {
        this._cards = val;
        return this;
    }

        fromPosition(position: LocationPosition): MoveRule {
        this._fromPosition = position;
        return this;
    }

        toPosition(position: LocationPosition): MoveRule {
        this._toPosition = position;
        return this;
    }
}

function move(...args: any[]): MoveRule {
    var f = MoveRule.bind.apply(MoveRule, [null].concat(args));
    return new f();
}

class PickRule extends CountRule < PickRule > {
    _variable: string;
    _list: string;

    constructor();
    constructor(options: any);
    constructor(variable: string, list: string);
    constructor(optionsOrVariable ? : any, list ? : string) {
        super();

        if (typeof optionsOrVariable === 'object')
            this.setOptions(optionsOrVariable);
        else if (typeof optionsOrVariable === 'string')
            this._variable = optionsOrVariable;
        if (typeof list === 'string')
            this._list = list;
    }

    execute(game: Game, proxyManager: ProxyManager): RuleResponse {
        var list = game.resolve(this._list);
        //var result = game.getPick();

        return RuleResponse.Error;
    }

        variable(val: string): PickRule {
        this._variable = val;
        return this;
    }

        list(val: string): PickRule {
        this._list = val;
        return this;
    }

        clone(): PickRule {
        return new PickRule().copy(this);
    }

        copy(other: PickRule): PickRule {
        for (var i in other) {
            this[i] = other[i];
        }
        return this;
    }
}

function pick(...args: any[]): PickRule {
    var f = PickRule.bind.apply(PickRule, [null].concat(args));
    return new f();
}

var move1 = move({
    from: "one",
    to: "two"
}).exactly(2).user("me").toPosition(LocationPosition.Top);
