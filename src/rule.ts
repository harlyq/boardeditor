function createRule(type: string): BaseRule {
    switch (type) {
        case 'MoveRule':
            return new MoveRule();
        case 'LocationIdRule':
            return new LocationIdRule();
        case 'LocationNameRule':
            return new LocationNameRule();
        case 'PickRule':
            return new PickRule();
        case 'CountRule':
            return new CountRule();
        case 'SequenceRule':
            return new SequenceRule();
    }
}

enum Quality {
    Exactly, AtMost, AtLeast, LessThan, MoreThan
}

class BaseRule {
    _type: string = '';
    _unique: number = 0;

    static _nextUnique: number = 1;

    constructor() {
        this._unique = BaseRule._nextUnique++;
    }

    isResolved(env: any): boolean {
        return false;
    }

    indexOf(options: BaseRule[]): number {
        for (var i = 0; i < options.length; ++i) {
            if (options[i]._unique === this._unique)
                return i;
        }
        return -1;
    }

    save(): any {
        return this;
    }

    load(obj: any) {
        if (Array.isArray(obj)) {
            for (var i = 0; i < obj.length; ++i)
                this.assign(obj, i);
        } else {
            for (var i in obj)
                this.assign(obj, i);
        }
    }

    private assign(obj: any, i: any) {
        if (Array.isArray(obj[i])) {
            this[i] = [];
            this[i].load(obj[i]);
        } else if (typeof obj[i] === 'object') {
            this[i] = createRule[obj[i].type];
            this[i].load(obj[i]);
        } else {
            this[i] = obj[i];
        }
    }
}

class MoveRule extends BaseRule {
    _user: UserRule;
    _count: CountRule = new CountRule();
    _from: LocationRule;
    _to: LocationRule;

    constructor() {
        super();
        this._type = 'MoveRule';
    }

    isResolved(env: any): boolean {
        return this._user.isResolved(env) &&
            this._count.isResolved(env) &&
            this._from.isResolved(env) &&
            this._to.isResolved(env);
    }

    user(rule: UserRule): MoveRule {
        this._user = rule;
        return this;
    }

    count(rule: CountRule): MoveRule {
        this._count = rule;
        return this;
    }

    from(rule: LocationRule): MoveRule {
        this._from = rule;
        return this;
    }

    to(rule: LocationRule): MoveRule {
        this._to = rule;
        return this;
    }


}

class CountRule extends BaseRule {
    _quality: Quality = Quality.Exactly;
    _amount: number = 1; // VariableRule?
    _isRandom: boolean = false;
    _isUserPick: boolean = false;

    constructor() {
        super();
        this._type = 'CountRule';
    }

    isResolved(env: any): boolean {
        return this._quality === Quality.Exactly || !this._isUserPick;
    }

    isCountValid(env: any, value: number): boolean {
        var amount = this._amount;
        switch (this._quality) {
            case Quality.Exactly:
                return value === amount;
            case Quality.AtMost:
                return value <= amount;
            case Quality.AtLeast:
                return value >= amount;
            case Quality.LessThan:
                return value < amount;
            case Quality.MoreThan:
                return value > amount;
        }
        return false;
    }

    quality(value: Quality): CountRule {
        this._quality = value;
        return this;
    }

    amount(value: number): CountRule {
        this._amount = value;
        return this;
    }

    isRandom(value: boolean): CountRule {
        this._isRandom = value;
        return this;
    }

    isUserPick(value: boolean): CountRule {
        this._isUserPick = value;
        return this;
    }
}


class LocationRule extends BaseRule {
    isLocationValid(env: any, name: string, id: number): boolean {
        return false;
    }
}

class LocationIdRule extends LocationRule {
    _id: number;

    constructor() {
        super();
        this._type = 'LocationIdRule';
    }

    isResolved(env: any): boolean {
        return true;
    }

    isLocationValid(env: any, name: string, id: number): boolean {
        return id === this._id;
    }

    id(value: number): LocationIdRule {
        this._id = value;
        return this;
    }
}

class LocationNameRule extends LocationRule {
    _name: string;

    constructor() {
        super();
        this._type = 'LocationNameRule';
    }

    isResolved(env: any): boolean {
        return true; // TODO this may sometimes be false
    }

    isLocationValid(env: any, name: string, id: number): boolean {
        var nameParts = this._name.split('.');
        nameParts.map(function(name) {
            return (env[name] ? env[name] : name);
        });
        var internalName = nameParts.join('.');

        // TODO some type of matching algorithm * ?
        return name === internalName;
    }

    name(value: string): LocationNameRule {
        this._name = value;
        return this;
    }
}

class PickRule extends BaseRule {
    _count: CountRule = new CountRule();
    _options: BaseRule[] = [];
    _allowDuplicate: boolean = false;

    constructor() {
        super();
        this._type = 'PickRule';
    }

    isResolved(env: any): boolean {
        return this._count.isResolved(env) && this._options.every(function(option) {
            return option.isResolved(env);
        });
    }

    isOptionValid(env: any, options: BaseRule[]): boolean {
        if (!this._count)
            return false;

        if (!this._allowDuplicate) {
            for (var i = options.length - 1; i >= 0; --i) {
                if (options[i].indexOf(options) !== i)
                    return false; // duplicate found

                if (options[i].indexOf(this._options) === -1)
                    return false; // option was not part of original set
            }
        }

        return this._count.isCountValid(env, options.length);
    }

    count(rule: CountRule): PickRule {
        this._count = rule;
        return this;
    }

    options(rules: BaseRule[]): PickRule {
        this._options = rules;
        return this;
    }

    allowDuplicate(value: boolean): PickRule {
        this._allowDuplicate = value;
        return this;
    }
}

class SequenceRule extends BaseRule {
    _actions: BaseRule[] = [];

    constructor() {
        super();
        this._type = 'SequenceRule';
    }

    isResolved(env: any): boolean {
        return this._actions.every(function(option) {
            return option.isResolved(env);
        });
    }

    actions(rules: BaseRule[]): SequenceRule {
        this._actions = rules;
        return this;
    }
}

class UserRule extends BaseRule {}

class UserIdRule extends UserRule {
    _id: number;

    constructor() {
        super();
        this._type = 'UserIdRule';
    }

    isResolved(env: any): boolean {
        return true;
    }

    id(value: number): UserIdRule {
        this._id = value;
        return this;
    }
}

class UserNameRule extends UserRule {
    _name: string;

    constructor() {
        super();
        this._type = 'UserNameRule';
    }

    isResolved(env: any): boolean {
        return true;
    }

    name(value: string): UserNameRule {
        this._name = value;
        return this;
    }
}

class LabelRule extends BaseRule {
    _label: string;

    constructor() {
        super();
        this._type = 'LabelRule';
    }

    isResolved(env: any): boolean {
        return true;
    }

    label(value: string): LabelRule {
        this._label = value;
        return this;
    }
}

class GotoRule extends BaseRule {
    _label: string;

    constructor() {
        super();
        this._type = 'SuperRule';
    }

    isResolved(env: any): boolean {
        return true;
    }

    label(value: string): GotoRule {
        this._label = value;
        return this;
    }
}

var location01 = new LocationNameRule().name('location01');
var player1_hand = new LocationNameRule().name('player1.hand');
var player2_hand = new LocationNameRule().name('player2.hand');

var game =
    new SequenceRule()
    .actions([
        new MoveRule()
        .from(location01)
        .to(player1_hand),

        new MoveRule()
        .from(location01)
        .to(player2_hand)
    ])

console.log(game.save());
