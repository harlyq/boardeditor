/// <reference path="game.ts" />
enum LocationPosition {
    top, bottom, random
};

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

// var addSetters = function(klass: any) {
//     for (var privateI in klass) {
//         if (privateI[0] === '_') {
//             var i = privateI.substr(1);

//             if (i in klass['__proto__'])
//                 continue;

//             klass['__proto__'][i] = function(val) {
//                 this['_' + i] = val;
//                 return this;
//             };
//         }
//     }
// }

// TODO Typescript needs a *this* type!
class CountRule extends BaseRule {
    _position: LocationPosition = LocationPosition.top;
    _user: string = 'BANK';
    _set: string;
    _only: number = 1;
    _atLeast: number;
    _atMost: number;

    isCountValid(count: number): boolean {
        if (this._atMost in this)
            return count <= this._atMost;
        if (this._atLeast in this)
            return count >= this._atLeast;
        if (this._only in this)
            return count === this._only;
        return false;
    }

    only(val: number): CountRule {
        this._only = val;
        return this;
    }

    atLeast(val: number): CountRule {
        this._atLeast = val;
        return this;
    }

    atMost(val: number): CountRule {
        this._atMost = val;
        return this;
    }

    position(val: LocationPosition): CountRule {
        this._position = val;
        return this;
    }

    user(val: string): CountRule {
        this._user = val;
        return this;
    }

    set(val: string): CountRule {
        this._set = val;
        return this;
    }
}

class MoveRule extends CountRule {
    _from: string;
    _to: string;

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

    execute(game: Game) {
        var from = game.resolve(this._from);
        var to = game.resolve(this._to);
    }

    isPickValid(list: string): boolean {
        var picks = list.split(',');

        return this.isCountValid(picks.length);
    }

    from(val: string): MoveRule {
        this._from = val;
        return this;
    }

    to(val: string): MoveRule {
        this._to = val;
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
}

function pick(...args: any[]): PickRule {
    var f = PickRule.bind.apply(PickRule, [null].concat(args));
    return new f();
}

var move1 = move({
    from: "one",
    to: "two"
}).only(2).user("me");
