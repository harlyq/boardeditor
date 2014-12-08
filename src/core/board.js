/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    var LABEL_PREFIX = '.';
    var LABEL_PREFIX_LENGTH = LABEL_PREFIX.length;

    function _applyMixins(derived, bases) {
        bases.forEach(function (base) {
            Object.getOwnPropertyNames(base.prototype).forEach(function (name) {
                derived.prototype[name] = base.prototype[name];
            });
        });
    }
    BoardSystem._applyMixins = _applyMixins;

    function _error(msg) {
        console.error(msg);
        debugger;
        return false;
    }
    BoardSystem._error = _error;

    function _assert(cond, msg) {
        console.assert(cond, msg);
        debugger;
        return false;
    }
    BoardSystem._assert = _assert;

    function extend(base) {
        var others = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            others[_i] = arguments[_i + 1];
        }
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
    BoardSystem.extend = extend;

    function isNumeric(value) {
        return !Array.isArray(value) && value - parseFloat(value) >= 0;
    }
    BoardSystem.isNumeric = isNumeric;

    // returns a list of a's that exist in b
    function union(a, b) {
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
    BoardSystem.union = union;

    (function (Quantity) {
        Quantity[Quantity["Exactly"] = 0] = "Exactly";
        Quantity[Quantity["AtMost"] = 1] = "AtMost";
        Quantity[Quantity["AtLeast"] = 2] = "AtLeast";
        Quantity[Quantity["MoreThan"] = 3] = "MoreThan";
        Quantity[Quantity["LessThan"] = 4] = "LessThan";
        Quantity[Quantity["All"] = 5] = "All";
    })(BoardSystem.Quantity || (BoardSystem.Quantity = {}));
    var Quantity = BoardSystem.Quantity;

    (function (Position) {
        Position[Position["Default"] = 0] = "Default";
        Position[Position["Top"] = 1] = "Top";
        Position[Position["Bottom"] = 2] = "Bottom";
        Position[Position["Random"] = 3] = "Random";
    })(BoardSystem.Position || (BoardSystem.Position = {}));
    var Position = BoardSystem.Position;

    ;

    function createBatchCommand(id, user, commands) {
        var batch = {
            ruleId: id,
            commands: {}
        };
        batch.commands[user] = commands;
        return batch;
    }
    BoardSystem.createBatchCommand = createBatchCommand;

    //----------------------------------------------------------------
    var LabelMixin = (function () {
        function LabelMixin() {
        }
        LabelMixin.prototype.addLabel = function (label) {
            var i = this.labels.indexOf(label);
            if (i === -1)
                this.labels.push(label);
        };

        LabelMixin.prototype.removeLabel = function (label) {
            var i = this.labels.indexOf(label);
            if (i !== -1)
                this.labels.splice(i, 1);
        };

        LabelMixin.prototype.containsLabel = function (label) {
            for (var i = 0; i < this.labels.length; ++i) {
                if (this.labels[i] === label)
                    return true;
            }
            return false;
        };

        LabelMixin.prototype.getLabels = function () {
            return this.labels;
        };
        return LabelMixin;
    })();
    BoardSystem.LabelMixin = LabelMixin;

    //----------------------------------------------------------------
    var RegionMixin = (function () {
        function RegionMixin() {
        }
        RegionMixin.prototype.addRegion = function (region) {
            var i = this.regions.indexOf(region);
            if (i === -1)
                this.regions.push(region);
        };

        RegionMixin.prototype.removeRegion = function (region) {
            var i = this.regions.indexOf(region);
            if (i !== -1)
                this.regions.splice(i, 1);
        };

        RegionMixin.prototype.containsRegion = function (regionOrName) {
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
        };
        return RegionMixin;
    })();
    BoardSystem.RegionMixin = RegionMixin;

    //----------------------------------------------------------------
    var VariableMixin = (function () {
        function VariableMixin() {
        }
        VariableMixin.prototype.setVariables = function (variables) {
            for (var i in variables)
                this.variables[i] = variables[i];
        };

        VariableMixin.prototype.copyVariables = function (variables) {
            var results = {};
            for (var i in variables)
                results[i] = this.variables[i];
            return results;
        };

        VariableMixin.prototype.setVariable = function (name, value) {
            this.variables[name] = value;
        };

        VariableMixin.prototype.getAlias = function (value) {
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
        };

        VariableMixin.prototype.getVariable = function (name) {
            return this.variables[name];
        };

        VariableMixin.prototype.getVariables = function () {
            return this.variables;
        };
        return VariableMixin;
    })();
    BoardSystem.VariableMixin = VariableMixin;

    //----------------------------------------------------------------
    var Region = (function () {
        function Region(name) {
            this.name = name;
            // LabelMixin
            this.labels = [];
        }
        Region.prototype.matches = function (query) {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else
                return this.name === query;
        };
        return Region;
    })();
    BoardSystem.Region = Region;

    _applyMixins(Region, [LabelMixin]);

    //----------------------------------------------------------------
    var Location = (function () {
        function Location(name, id, variables) {
            this.name = name;
            this.id = id;
            this.cards = [];
            this.fromPosition = 1 /* Top */;
            this.toPosition = 1 /* Top */;
            // LabelMixin
            this.labels = [];
            // RegionMixin
            this.regions = [];
            // VariableMixin
            this.variables = {};
            this.setVariables(variables);
        }
        Location.prototype.matches = function (query) {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else if (isNumeric(query))
                return this.id === parseInt(query);
            else
                return this.name === query;
        };

        Location.prototype.addCard = function (card, toPosition) {
            if (typeof toPosition === "undefined") { toPosition = 0 /* Default */; }
            if (toPosition === 0 /* Default */)
                toPosition = this.toPosition;

            var numCards = this.cards.length;
            var i = numCards;
            switch (toPosition) {
                case 0 /* Default */:
                case 1 /* Top */:
                    i = numCards;
                    break;
                case 2 /* Bottom */:
                    i = 0;
                    break;
                case 3 /* Random */:
                    i = ~~(Math.random() * numCards);
                    break;
            }

            this.insertCardInternal(i, card);

            return i;
        };

        Location.prototype.addCards = function (cardList) {
            for (var i = 0; i < cardList.length; ++i)
                this.addCard(cardList[i]);
        };

        Location.prototype.removeCard = function (card) {
            if (card.location !== this)
                return;

            var i = this.cards.indexOf(card);
            if (i === -1)
                return;

            this.cards.splice(i, 1);
            card.location = null;
        };

        Location.prototype.removeAllCards = function () {
            for (var i = 0; i < this.cards.length; ++i)
                this.removeCard(this.cards[i]);
        };

        Location.prototype.insertCard = function (card, i) {
            if (i < 0) {
                var numCards = this.cards.length;

                switch (this.toPosition) {
                    case 0 /* Default */:
                    case 1 /* Top */:
                        i = numCards;
                        break;
                    case 2 /* Bottom */:
                        i = 0;
                        break;
                    case 3 /* Random */:
                        i = ~~(Math.random() * numCards);
                        break;
                }
            }

            this.insertCardInternal(i, card);
        };

        Location.prototype.insertCardInternal = function (index, card) {
            // override card properties with location properties
            var cardVariables = card.variables;
            for (var k in this.variables) {
                cardVariables[k] = this.variables[k];
            }

            if (card.location !== null)
                card.location.removeCard(card);

            this.cards.splice(index, 0, card);
            card.location = this;
        };

        Location.prototype.containsCard = function (card) {
            return this.cards.indexOf(card) !== -1;
        };

        Location.prototype.findCard = function (cardId) {
            for (var i = 0; i < this.cards.length; ++i) {
                if (this.cards[i].id === cardId)
                    return this.cards[i];
            }

            return null;
        };

        Location.prototype.getCard = function (fromPosition) {
            if (typeof fromPosition === "undefined") { fromPosition = 0 /* Default */; }
            var numCards = this.cards.length;
            if (numCards === 0)
                return null;

            if (fromPosition === 0 /* Default */)
                fromPosition = this.fromPosition;

            switch (fromPosition) {
                case 0 /* Default */:
                case 1 /* Top */:
                    return this.cards[numCards - 1];
                    break;
                case 2 /* Bottom */:
                    return this.cards[0];
                    break;
                case 3 /* Random */:
                    return this.cards[~~(Math.random() * numCards)];
                    break;
            }
        };

        Location.prototype.getCardByIndex = function (i) {
            if (i < 0 || i >= this.cards.length)
                return null;

            return this.cards[i];
        };

        Location.prototype.getCards = function () {
            return this.cards;
        };

        Location.prototype.getNumCards = function () {
            return this.cards.length;
        };

        // getVisibility(userId: number): Location.Visibility {
        //     var visibility = this.visibility[userId];
        //     if (typeof visibility == 'undefined')
        //         visibility = Location.Visibility.None;
        //     return visibility;
        // }
        Location.prototype.shuffle = function () {
            var numCards = this.cards.length;
            for (var i = 0; i < numCards; ++i) {
                var card = this.cards[i];
                var j = ~~(Math.random() * numCards);
                var other = this.cards[j];
                this.cards[i] = other;
                this.cards[j] = card;
            }
        };

        Location.prototype.save = function () {
            var obj = {
                type: 'Location',
                name: this.name,
                id: this.id,
                // visibility: this.visibility,
                cards: []
            };

            for (var i = 0; i < this.cards.length; ++i)
                obj.cards.push(this.cards[i].save());
        };

        Location.prototype.load = function (obj) {
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
        };
        return Location;
    })();
    BoardSystem.Location = Location;

    (function (Location) {
        // for a Visibility of faceUp or ownwards, the userId will given all card details
        (function (Visibility) {
            Visibility[Visibility["None"] = 0] = "None";
            Visibility[Visibility["Count"] = 1] = "Count";
            Visibility[Visibility["FaceDown"] = 2] = "FaceDown";
            Visibility[Visibility["FaceUp"] = 3] = "FaceUp";
            Visibility[Visibility["Flip"] = 4] = "Flip";
            Visibility[Visibility["Any"] = 5] = "Any";
        })(Location.Visibility || (Location.Visibility = {}));
        var Visibility = Location.Visibility;
        ;
    })(BoardSystem.Location || (BoardSystem.Location = {}));
    var Location = BoardSystem.Location;

    _applyMixins(Location, [LabelMixin, RegionMixin, VariableMixin]);

    //----------------------------------------------------------------
    var Deck = (function () {
        function Deck(name, id, variables) {
            this.name = name;
            this.id = id;
            this.cards = [];
            // VariableMixin
            this.variables = {};
            if (variables) {
                for (var i in variables)
                    this.variables[i] = variables[i];
            }
        }
        Deck.prototype.addCard = function (card) {
            // apply the deck properties - if not present on the card
            var cardVariables = card.variables;
            for (var k in this.variables) {
                if (!cardVariables.hasOwnProperty(k))
                    cardVariables[k] = this.variables[k];
            }

            this.cards.push(card);
            return this;
        };

        Deck.prototype.getCards = function () {
            return this.cards;
        };

        Deck.prototype.matches = function (query) {
            return this.id === parseInt(query);
        };

        Deck.prototype.save = function () {
            return {
                type: 'Deck',
                name: this.name,
                id: this.id,
                variables: this.variables
            };
        };

        // TODO work how how to bind cards to decks
        Deck.prototype.load = function (obj) {
            if (obj.type !== 'Deck')
                return;

            this.name = obj.name;
            this.id = obj.id;
            this.variables = obj.variables;
        };
        return Deck;
    })();
    BoardSystem.Deck = Deck;

    _applyMixins(Deck, [VariableMixin]);

    //----------------------------------------------------------------
    var Card = (function () {
        // id may be -1, typically for cards that are facedown and cannot be flipped
        function Card(name, id, variables) {
            this.name = name;
            this.id = id;
            this.location = null;
            // LabelMixin
            this.labels = [];
            // RegionMixin
            this.regions = [];
            // VariableMixin
            this.variables = {};
            if (variables) {
                for (var i in variables)
                    this.variables[i] = variables[i];
            }
        }
        Card.prototype.matches = function (query) {
            if (query.substr(0, LABEL_PREFIX_LENGTH) === LABEL_PREFIX)
                return this.containsLabel(query.substr(LABEL_PREFIX_LENGTH));
            else if (isNumeric(query))
                return this.id === parseInt(query);
            else
                return this.name === query;
        };

        Card.prototype.save = function () {
            return {
                type: 'Card',
                name: this.name,
                id: this.id,
                variables: this.variables
            };
        };

        Card.prototype.load = function (obj) {
            if (obj.type !== 'Card')
                return;

            this.name = obj.name;
            this.id = obj.id;
            this.variables = obj.variables;
        };
        Card.UNKNOWN = -1;
        return Card;
    })();
    BoardSystem.Card = Card;

    _applyMixins(Card, [LabelMixin, RegionMixin, VariableMixin]);

    //----------------------------------------------------------------
    var User = (function () {
        function User(name, id) {
            this.name = name;
            this.id = id;
        }
        User.prototype.save = function () {
            return {
                type: 'User',
                name: this.name,
                id: this.id
            };
        };

        User.prototype.load = function (obj) {
            if (obj.type !== 'User')
                return;

            this.name = obj.name;
            this.id = obj.id;
        };
        return User;
    })();
    BoardSystem.User = User;

    //----------------------------------------------------------------
    var UniqueList = (function () {
        function UniqueList(args) {
            this.removed = [];
            this.length = 0;
            this.values = args;
            this.length = args.length;
            for (var i = 0; i < args.length; ++i)
                this.removed[i] = false;
        }
        UniqueList.prototype.push = function (value) {
            return this.add(value);
        };

        UniqueList.prototype.remove = function (value) {
            var i = this.values.indexOf(value);
            if (i === -1)
                return false;

            if (this.removed[i])
                return false;

            this.removed[i] = true;
            --this.length;

            return true;
        };

        UniqueList.prototype.add = function (value) {
            if (this.indexOf(value))
                return false;

            var i = this.values.indexOf(value);
            if (i !== -1)
                this.values.splice(i, 1); // delete old removed value

            i = this.values.length;
            this.values.push(value);
            this.removed[i] = false;
            ++this.length;

            return true;
        };

        UniqueList.prototype.indexOf = function (value) {
            for (var i = 0; i < this.values.length; ++i) {
                if (this.values[i] === value)
                    return (this.removed[i] ? -1 : i);
            }
            return -1;
        };

        UniqueList.prototype.get = function (index) {
            if (index < 0 || index >= this.length)
                return undefined;

            for (var i = 0, k = 0; i < this.values.length; ++i) {
                if (this.removed[i])
                    continue;

                if (k === index)
                    return this.values[i];

                k++;
            }
            _assert('invalid logic');

            return undefined;
        };

        UniqueList.prototype.next = function (value, loop) {
            if (typeof loop === "undefined") { loop = true; }
            if (this.length === 0)
                return undefined;

            var i = this.values.indexOf(value);
            if (i === -1)
                return undefined;

            do {
                i = this.nextIndex(i, loop);
            } while(i >= 0 && this.removed[i]);

            if (i === -1)
                return undefined;

            return this.values[i];
        };

        UniqueList.prototype.nextIndex = function (i, loop) {
            i++;
            if (i >= this.values.length) {
                if (!loop)
                    i = -1;
                else
                    i = 0;
            }
            return i;
        };
        return UniqueList;
    })();
    BoardSystem.UniqueList = UniqueList;

    //----------------------------------------------------------------
    var Board = (function () {
        function Board() {
            this.locations = [];
            this.decks = [];
            this.cards = [];
            this.users = [];
            this.regions = [];
            this.uniqueId = 0;
            this.lastRuleId = 0;
            // VariableMixin
            this.variables = {};
        }
        Board.prototype.createList = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            if (args.length === 1 && Array.isArray(args[0]))
                args = args[0]; // user passed an array, treat this as the list

            return new UniqueList(args);
        };

        Board.prototype.createRule = function (type) {
            return {
                id: this.uniqueId++,
                type: type,
                user: 'BANK'
            };
        };

        Board.prototype.createLocation = function (name, locationId, variables) {
            var location = new Location(name, locationId, variables);
            this.locations.push(location);
            return location;
        };

        Board.prototype.createDeck = function (name, deckId, variables) {
            var deck = new Deck(name, deckId, variables);
            this.decks.push(deck);
            return deck;
        };

        Board.prototype.createCard = function (name, cardId, deck, variables) {
            var card = new Card(name, cardId, variables);
            this.cards.push(card);

            if (deck)
                deck.addCard(card);

            return card;
        };

        Board.prototype.createUser = function (name, userId) {
            var user = new User(name, userId);
            this.users.push(user);
            return user;
        };

        Board.prototype.createRegion = function (name) {
            var region = new Region(name);
            this.regions.push(region);
            return region;
        };

        Board.prototype.getNumLocations = function () {
            return this.locations.length;
        };

        Board.prototype.getNumCards = function () {
            return this.cards.length;
        };

        Board.prototype.findLocationByName = function (name) {
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].name === name)
                    return this.locations[i];
            }
            return null;
        };

        Board.prototype.findLocationsByLabel = function (label) {
            var locations = [];
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].containsLabel(label))
                    locations.push(this.locations[i]);
            }
            return locations;
        };

        Board.prototype.findLocationById = function (locationId) {
            for (var i = 0; i < this.locations.length; ++i) {
                if (this.locations[i].id === locationId)
                    return this.locations[i];
            }
            return null;
        };

        Board.prototype.findDeckById = function (deckId) {
            // decks are often represented by a negative id
            if (deckId < 0)
                deckId = -deckId;

            for (var i = 0; i < this.decks.length; ++i) {
                if (this.decks[i].id === deckId)
                    return this.decks[i];
            }
            return null;
        };

        Board.prototype.findDeckByCardId = function (cardId) {
            for (var i = 0; i < this.decks.length; ++i) {
                var deck = this.decks[i];
                for (var j = 0; j < deck.getCards().length; ++j) {
                    var card = deck.getCards()[j];
                    if (card.id === cardId)
                        return deck;
                }
            }
            return null;
        };

        Board.prototype.findCardById = function (cardId) {
            for (var i = 0; i < this.cards.length; ++i) {
                if (this.cards[i].id === cardId)
                    return this.cards[i];
            }
            return null;
        };

        Board.prototype.findUserById = function (userId) {
            for (var i = 0; i < this.users.length; ++i) {
                if (this.users[i].id === userId)
                    return this.users[i];
            }
            return null;
        };

        Board.prototype.findUserByName = function (name) {
            for (var i = 0; i < this.users.length; ++i) {
                if (this.users[i].name === name)
                    return this.users[i];
            }
            return null;
        };

        Board.prototype.findRegionByName = function (name) {
            for (var i = 0; i < this.regions.length; ++i) {
                if (this.regions[i].name === name)
                    return this.regions[i];
            }
            return null;
        };

        Board.prototype.queryFirstDeck = function (query) {
            if (!query)
                return null;

            var decks = this.queryDecks(query, true);
            if (decks.length === 0)
                return null;
            return decks[0];
        };

        Board.prototype.queryDecks = function (query, quitOnFirst) {
            if (typeof quitOnFirst === "undefined") { quitOnFirst = false; }
            if (!query)
                return [];

            var tags = query.split(',');
            var decks = [];

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
        };

        Board.prototype.queryFirstCard = function (query) {
            if (!query)
                return null;

            var cards = this.queryCards(query, true);
            if (cards.length === 0)
                return null;
            return cards[0];
        };

        Board.prototype.queryCards = function (query, quitOnFirst) {
            if (typeof quitOnFirst === "undefined") { quitOnFirst = false; }
            if (!query)
                return [];

            var tags = query.split(',');
            var cards = [];

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
        };

        Board.prototype.queryFirstLocation = function (query) {
            var locations = this.queryLocations(query, true);
            if (locations.length === 0)
                return null;
            return locations[0];
        };

        Board.prototype.queryLocations = function (query, quitOnFirst) {
            if (typeof quitOnFirst === "undefined") { quitOnFirst = false; }
            if (!query)
                return [];

            var tags = query.split(',');
            var locations = [];

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
        };

        Board.prototype.getUsersById = function (query) {
            if (!query)
                return [];

            var ids = query.split(',');
            var users = [];
            for (var i = 0; i < ids.length; ++i)
                users.push(this.findUserById(parseInt(ids[i])));

            return users;
        };

        Board.prototype.queryUsers = function (query) {
            if (!query)
                return [];

            var names = query.split(',');
            var users = [];
            for (var i = 0; i < name.length; ++i)
                users.push(this.findUserByName(names[i]));

            return users;
        };

        Board.prototype.queryRegions = function (query) {
            if (!query)
                return [];

            var names = query.split(',');
            var regions = [];
            for (var i = 0; i < names.length; ++i)
                regions.push(this.findRegionByName(names[i]));
            return regions;
        };

        Board.prototype.queryThings = function (query) {
            var things = [];

            things = this.queryLocations(query);
            if (things.length === 0) {
                things = this.queryCards(query);
                if (things.length === 0)
                    things = this.queryRegions(query);
            }

            return things;
        };

        // CONVERSION FUNCTIONS
        Board.prototype.convertToIdString = function (key) {
            var isKeyArray = Array.isArray(key), type = 'unknown', value = '';

            if (isKeyArray && key.length === 0) {
                _error('key is an empty array');
            } else if (key instanceof Card || (isKeyArray && key[0] instanceof Card)) {
                type = 'card';
                value = this.convertCardsToIdString(key);
            } else if (key instanceof Location || (isKeyArray && key[0] instanceof Location)) {
                type = 'location';
                value = this.convertLocationsToIdString(key);
            } else if (key instanceof Region || (isKeyArray && key[0] instanceof Region)) {
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
        };

        Board.prototype.convertLocationsToIdString = function (other) {
            var str = '';
            if (other instanceof Location)
                str = other.id.toString();
            else if (Array.isArray(other)) {
                for (var i = 0; i < other.length; ++i) {
                    var value = other[i];
                    if (i > 0)
                        str += ',';
                    if (value instanceof Location)
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
        };

        Board.prototype.convertCardsToIdString = function (other) {
            var str = '';
            if (other instanceof Card)
                str = other.id.toString();
            else if (Array.isArray(other)) {
                for (var i = 0; i < other.length; ++i) {
                    var value = other[i];
                    if (i > 0)
                        str += ',';
                    if (value instanceof Card)
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
        };

        Board.prototype.print = function () {
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
        };

        Board.prototype.getDecks = function () {
            return this.decks;
        };

        Board.prototype.getLocations = function () {
            return this.locations;
        };

        Board.prototype.getCards = function () {
            return this.cards;
        };

        Board.prototype.save = function () {
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
        };

        Board.prototype.load = function (obj) {
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
        };
        return Board;
    })();
    BoardSystem.Board = Board;

    _applyMixins(Board, [VariableMixin]);
})(BoardSystem || (BoardSystem = {}));
