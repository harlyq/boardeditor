/// <reference path="command.ts" />
/// <reference path="game.ts" />
enum Quantity {
    Exactly, AtMost, AtLeast, MoreThan, LessThan
}

enum RuleResponse {
    Pending, Complete, Error
}

enum LocationPosition {
    Default, Top, Bottom, Random
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

    execute(game: Game) {
        debugger; // derived class must call execute
    }
}

// TODO Typescript needs a *this* type!
class CountRule extends BaseRule {
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

        exactly < T extends CountRule > (val: number): T {
        this._quantity = Quantity.Exactly;
        this._count = val;
        return <T > this;
    }

        atLeast < T extends CountRule > (val: number): T {
        this._quantity = Quantity.AtLeast;
        this._count = val;
        return <T > this;
    }

        atMost < T extends CountRule > (val: number): T {
        this._quantity = Quantity.AtMost;
        this._count = val;
        return <T > this;
    }

        moreThan < T extends CountRule > (val: number): T {
        this._quantity = Quantity.MoreThan;
        this._count = val;
        return <T > this;
    }

        lessThan < T extends CountRule > (val: number): T {
        this._quantity = Quantity.LessThan;
        this._count = val;
        return <T > this;
    }

        position < T extends CountRule > (val: LocationPosition): T {
        this._position = val;
        return <T > this;
    }

        user < T extends CountRule > (val: string): T {
        this._user = val;
        return <T > this;
    }

        set < T extends CountRule > (val: string): T {
        this._set = val;
        return <T > this;
    }
}

class MoveRule extends CountRule {
    _from: string;
    _to: string;
    _cards: string;
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

    execute(game: Game): RuleResponse {
        if (!this._resolvedRule) {
            var from = game.resolve(this._from);
            var to = game.resolve(this._to);
            var cards = game.resolve(this._cards);
            var user = game.resolve(this._user);

            if (!from)
                return RuleResponse.Error; //this.error('Invalid from');

            if (!to)
                return RuleResponse.Error; //this.error('Invalid to');

            this._resolvedRule = this.clone().from(from).to(to).cards(cards).user < MoveRule > (user);
        }

        // var userProxy = game.getUserProxy(this._resolvedRule.user);
        // var commands = userProxy.doRule(this._resolvedRule);

        // if (!this.isMoveComplete(game, commands))
        //     return RuleResponse.Pending;

        // if (!this.isMoveValid(game, commands))
        //     return RuleResponse.Error; // this.error('Incorrect cards, or locations')

        this._resolvedRule = null;

        return RuleResponse.Complete;
    }

        isMoveValid(game: Game, commands: MoveCommand[]): boolean {
        var totalCards: GameCard[] = [];
        for (var i = 0; i < commands.length; ++i) {
            var command = commands[i];

            var fromLocation = game.findLocation(command.from);
            if (!fromLocation || !fromLocation.matches(this._resolvedRule._from))
                return false; // invalid from

            var toLocation = game.findLocation(command.to);
            if (!toLocation || !toLocation.matches(this._resolvedRule._to))
                return false; // invalid to

            var cards: GameCard[] = [];
            for (var j = 0; j < command.cards.length; ++j) {
                var card = game.findCard(command.cards[j]);
                if (!card)
                    return false; // undefined card

                if (!fromLocation.containsCard(card))
                    return false; // card not from correct location

                cards.push(card);
            }
            if (cards.length === 0)
                return false; // invalid cards

            [].push.apply(totalCards, cards);
        }

        if (!this.isCountValid(totalCards.length))
            return false;

        return false;
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

        clone(): MoveRule {
        return new MoveRule().copy(this);
    }

        copy(other: MoveRule): MoveRule {
        for (var i in other) {
            this[i] = other[i];
        }
        return this;
    }
}

function move(...args: any[]): MoveRule {
    var f = MoveRule.bind.apply(MoveRule, [null].concat(args));
    return new f();
}

class PickRule extends CountRule {
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

    execute(game: Game) {
        var list = game.resolve(this._list);
        //var result = game.getPick();
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
}).exactly(2).user("me");
