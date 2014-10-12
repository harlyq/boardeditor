(function() {
    var uniqueId = 1;

    Game.Board.prototype.move = function*(rule) {
        rule.from = this.convertLocation(rule.from);
        rule.to = this.convertLocation(rule.to);

        return yield Game.extend({
            type: 'move',
            id: uniqueId++
        }, Game.default_MoveRule, rule);
    };

    Game.Board.prototype.pick = function*(rule) {
        return yield Game.extend({
            type: 'pick',
            id: uniqueId++
        }, Game.default_PickRule, rule);
    };

    Game.Board.prototype.pickLocation = function*(rule) {
        rule.list = this.convertLocation(rule.list);

        return yield Game.extend({
            type: 'pickLocation',
            id: uniqueId++
        }, Game.default_PickRule, rule);
    };

    Game.Board.prototype.pickCard = function*(rule) {
        rule.list = this.convertCard(rule.list);

        return yield Game.extend({
            type: 'pickCard',
            id: uniqueId++
        }, Game.default_PickRule, rule);
    };

    Game.Board.prototype.setVariable = function*(name, value) {
        return yield {
            type: 'setVariable',
            id: uniqueId++,
            name: name,
            value: value,
            user: 'BANK'
        };
    };
})();

// for commonjs
if (typeof exports !== 'undefined') {
    exports.GameServer = Game.GameServer;
    exports.BankClient = Game.BankClient;
    exports.createLocalProxy = Game.createLocalProxy;
    exports.createRESTClientProxy = Game.createRESTClientProxy;
}
