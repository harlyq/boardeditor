(function() {
    var uniqueId = 1;

    function convertLocation(other) {
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

    function convertCard(other) {
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

    Game.Board.prototype.move = function*(rule) {
        rule.from = convertLocation(rule.from);
        rule.to = convertLocation(rule.to);

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
        rule.list = convertLocation(rule.list);

        return yield Game.extend({
            type: 'pickLocation',
            id: uniqueId++
        }, Game.default_PickRule, rule);
    };

    Game.Board.prototype.pickCard = function*(rule) {
        rule.list = convertCard(rule.list);

        return yield Game.extend({
            type: 'pickCard',
            id: uniqueId++
        }, Game.default_PickRule, rule);
    };
})();
