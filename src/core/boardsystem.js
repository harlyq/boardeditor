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
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    var HTMLMapping = (function () {
        function HTMLMapping(board, user, boardElem) {
            this.board = board;
            this.user = user;
            this.boardElem = boardElem;
            this.locationToElem = {};
            this.deckToElem = {};
            this.cardToElem = {};
            this.lastRuleId = -1;
            this.parseElement(boardElem);
        }
        HTMLMapping.prototype.getUser = function () {
            return this.user;
        };

        HTMLMapping.prototype.getBoardElem = function () {
            return this.boardElem;
        };

        HTMLMapping.prototype.parseElement = function (boardElem) {
            var self = this;

            // bind layouts
            var layoutElements = boardElem.querySelectorAll('.layout');
            [].forEach.call(layoutElements, function (element) {
                var name = element.getAttribute('name');
                var altName = self.getAlias(name);

                var location = self.board.queryFirstLocation(altName);
                if (location) {
                    self.locationToElem[location.id] = element;
                    self.applyLabels(element, location.getLabels());
                    self.applyVariables(element, location.getVariables());
                } else {
                    BoardSystem._error('could not find location "' + name + '" alias "' + altName + '"');
                }
            });

            // bind decks
            this.board.getDecks().forEach(function (deck) {
                self.deckToElem[deck.id] = (boardElem.querySelector('.deck[name="' + deck.name + '"]'));
            });

            // bind cards
            this.board.getCards().forEach(function (card) {
                var element = (boardElem.querySelector('.card[name="' + card.name + '"]'));
                if (element) {
                    self.cardToElem[card.id] = element;
                    self.applyLabels(element, card.labels);
                    self.applyVariables(element, card.getVariables());
                } else {
                    BoardSystem._error('could not find element for card - ' + card.name);
                }
            });
        };

        HTMLMapping.prototype.getAlias = function (value) {
            if (!value)
                return '';

            // apply local variables first
            var parts = value.split('.');
            for (var i = 0; i < parts.length; ++i) {
                var part = parts[i];
                if (typeof part === 'string' && part[0] === '$') {
                    var alias = part.substr(1);
                    var variables = this.board.getVariables();
                    if (alias in variables)
                        parts[i] = variables[alias];
                }
            }

            // then global variables
            return this.board.getAlias(parts.join('.'));
        };

        HTMLMapping.prototype.applyLabels = function (element, labels) {
            for (var i = 0; i < labels.length; ++i)
                element.classList.add(labels[i]);
        };

        HTMLMapping.prototype.applyVariables = function (element, variables) {
            for (var i in variables)
                element.setAttribute(i, variables[i]);
        };

        HTMLMapping.prototype.copyVariables = function (element, variables) {
            var results = {};
            for (var i in variables)
                results[i] = element.getAttribute(i);

            return results;
        };

        HTMLMapping.prototype.getDeckFromElem = function (deckElem) {
            for (var i in this.deckToElem) {
                if (deckElem = this.deckToElem[i]) {
                    var deckId = parseInt(i);
                    return this.board.findDeckById(deckId);
                }
            }
        };

        HTMLMapping.prototype.getElemFromDeck = function (deck) {
            if (!deck)
                return null;

            return this.deckToElem[deck.id];
        };

        HTMLMapping.prototype.getElemFromDeckId = function (deckId) {
            return this.deckToElem[deckId];
        };

        HTMLMapping.prototype.getCardFromElem = function (cardElem) {
            for (var i in this.cardToElem) {
                if (cardElem === this.cardToElem[i]) {
                    var cardId = parseInt(i);
                    return this.board.findCardById(cardId);
                }
            }
            return null;
        };

        HTMLMapping.prototype.getElemFromCard = function (card) {
            if (!card)
                return null;

            return this.cardToElem[card.id];
        };

        HTMLMapping.prototype.getElemFromCardId = function (cardId) {
            return this.cardToElem[cardId];
        };

        HTMLMapping.prototype.getElemsFromCardIds = function (idList) {
            if (!idList)
                return [];

            var list = [];
            var cardIds = idList.split(',');
            for (var i = 0; i < cardIds.length; ++i) {
                var elem = this.cardToElem[cardIds[i]];
                if (elem)
                    list.push(elem);
            }

            return list;
        };

        HTMLMapping.prototype.getElemsFromCards = function (cards) {
            var list = [];
            for (var i = 0; i < cards.length; ++i) {
                var card = cards[i];
                list.push(card ? this.cardToElem[card.id] : null);
            }
            return list;
        };

        HTMLMapping.prototype.getLocationFromElem = function (locationElem) {
            for (var i in this.locationToElem) {
                if (locationElem === this.locationToElem[i]) {
                    var locationId = parseInt(i);
                    return this.board.findLocationById(locationId);
                }
            }
            return null;
        };

        HTMLMapping.prototype.getElemFromLocation = function (location) {
            if (!location)
                return null;

            return this.locationToElem[location.id];
        };

        HTMLMapping.prototype.getElemFromLocationId = function (locationId) {
            return this.locationToElem[locationId];
        };

        HTMLMapping.prototype.getElemsFromLocationIds = function (idList) {
            if (!idList)
                return [];

            var list = [];
            var locationIds = idList.split(',');
            for (var i = 0; i < locationIds.length; ++i) {
                var elem = this.locationToElem[locationIds[i]];
                if (elem)
                    list.push(elem);
            }

            return list;
        };

        HTMLMapping.prototype.getElemsFromLocations = function (locations) {
            var list = [];
            for (var i = 0; i < locations.length; ++i) {
                var location = locations[i];
                list.push(location ? this.locationToElem[location.id] : null);
            }
            return list;
        };

        HTMLMapping.prototype.getElemsFromIds = function (idList) {
            var elems = [];
            [].push.apply(elems, this.getElemsFromLocationIds(idList));
            [].push.apply(elems, this.getElemsFromCardIds(idList));
            return elems;
        };

        HTMLMapping.prototype.getThingFromElem = function (elem) {
            var thing = this.getLocationFromElem(elem);
            thing = thing || this.getCardFromElem(elem);

            return thing;
        };
        return HTMLMapping;
    })();
    BoardSystem.HTMLMapping = HTMLMapping;
})(BoardSystem || (BoardSystem = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BoardSystem;
(function (BoardSystem) {
    // var HTML_DEFINED = typeof window !== 'undefined';
    //--------------------------------------------
    var localTransportList = {};

    BoardSystem.createLocalServerTransport = function (user, handler) {
        var proxy = new LocalTransport(user, handler);
        localTransportList[user] = proxy;
        return proxy;
    };

    BoardSystem.createLocalClientTransport = function (user, handler) {
        var proxy = new LocalTransport(user, handler);
        var serverTransport = localTransportList[user];
        if (serverTransport) {
            proxy.setPair(serverTransport);
            serverTransport.setPair(proxy);
        }
        return proxy;
    };

    BoardSystem.createRESTServerTransport = function (user, handler) {
        return new RESTServerTransport(user, handler);
    };

    BoardSystem.createRESTClientTransport = function (user, handler, uri, pollTimeMS) {
        if (typeof uri === "undefined") { uri = 'message'; }
        if (typeof pollTimeMS === "undefined") { pollTimeMS = 2000; }
        return new RESTClientTransport(user, handler, uri, pollTimeMS);
    };

    BoardSystem.createMessageServerTransport = function (user, window, handler) {
        return new MessageTransport(user, window, handler);
    };

    BoardSystem.createMessageClientTransport = function (user, window, handler) {
        return new MessageTransport(user, window, handler);
    };

    //--------------------------------------------
    var BaseTransport = (function () {
        function BaseTransport(/*protected*/ user, handler) {
            this.user = user;
            this.handler = handler;
            if (typeof handler !== 'function')
                debugger;
        }
        /*protected*/
        BaseTransport.prototype.callHandler = function (msg) {
            this.handler(msg);
        };

        BaseTransport.prototype.sendMessage = function (msg) {
        };
        return BaseTransport;
    })();
    BoardSystem.BaseTransport = BaseTransport;

    //--------------------------------------------
    var LocalTransport = (function (_super) {
        __extends(LocalTransport, _super);
        function LocalTransport(user, handler) {
            _super.call(this, user, handler);
            this.isProcessing = false;
            this.pendingMessages = [];
        }
        LocalTransport.prototype.setPair = function (proxy) {
            this.pair = proxy;
        };

        LocalTransport.prototype.sendMessage = function (msg) {
            if (this.isProcessing) {
                this.pendingMessages.push(msg);
                return;
            }

            if (this.pair) {
                // the client may try to send a reply message while we are calling
                // it's handler, so queue the messages and send them after we've
                // finished with the client
                this.setProcessing(true);
                this.pair.setProcessing(true);
                this.pair.callHandler(msg);
                this.pair.setProcessing(false);
                this.setProcessing(false);
            }
        };

        LocalTransport.prototype.setProcessing = function (value) {
            this.isProcessing = value;
            if (!value)
                setTimeout(this.sendPending.bind(this), 0);
        };

        LocalTransport.prototype.sendPending = function () {
            for (var i = 0; i < this.pendingMessages.length; ++i)
                this.sendMessage(this.pendingMessages[i]);

            this.pendingMessages = [];
        };
        return LocalTransport;
    })(BaseTransport);
    BoardSystem.LocalTransport = LocalTransport;

    

    // needs require('body-parser').json() middleware
    var RESTServerTransport = (function (_super) {
        __extends(RESTServerTransport, _super);
        function RESTServerTransport(user, handler) {
            _super.call(this, user, handler);
            this.packets = [];
            this.lastId = -1;
        }
        RESTServerTransport.prototype.sendMessage = function (msg) {
            var packet = {
                id: ++this.lastId,
                msg: msg
            };
            this.packets.push(packet);
        };

        RESTServerTransport.prototype.onGet = function (req, res) {
            var user = req.param('user');
            var afterId = req.param('afterId');

            if (user !== this.user)
                return [];

            var responses = [];

            for (var i = 0; i < this.packets.length; ++i) {
                var packet = this.packets[i];
                if (packet.id > afterId)
                    responses.push(packet);
            }

            return responses;
        };

        RESTServerTransport.prototype.onPost = function (req, res) {
            var user = req.param('user');

            if (user !== this.user)
                return;

            this.callHandler(req.body);
        };
        return RESTServerTransport;
    })(BaseTransport);
    BoardSystem.RESTServerTransport = RESTServerTransport;

    var RESTClientTransport = (function (_super) {
        __extends(RESTClientTransport, _super);
        function RESTClientTransport(user, handler, uri, pollTimeMS) {
            if (typeof uri === "undefined") { uri = 'message'; }
            if (typeof pollTimeMS === "undefined") { pollTimeMS = 2000; }
            _super.call(this, user, handler);
            this.uri = uri;
            this.pollTimeMS = pollTimeMS;
            this.lastId = -1;

            var self = this;

            this.request = new XMLHttpRequest();
            this.request.onload = function () {
                self.onServerResponse(this.response);
            };

            this.periodicPoll();
        }
        RESTClientTransport.prototype.sendMessage = function (msg) {
            console.log('POST ' + this.uri + '?user=' + this.user);
            this.request.open('POST', this.uri + '?user=' + this.user);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send(JSON.stringify(msg));

            // there may be some new data after the POST
            this.pollServer();
        };

        RESTClientTransport.prototype.pollServer = function () {
            console.log('GET ' + this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.open('GET', this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send();
        };

        RESTClientTransport.prototype.onServerResponse = function (resp) {
            var packets = (JSON.parse(resp));

            for (var i = 0; i < packets.length; ++i) {
                var packet = packets[i];
                this.callHandler(packet.msg);
                this.lastId = packet.id;
            }
        };

        RESTClientTransport.prototype.periodicPoll = function () {
            this.pollServer();

            window.setTimeout(this.periodicPoll.bind(this), this.pollTimeMS);
        };
        return RESTClientTransport;
    })(BaseTransport);
    BoardSystem.RESTClientTransport = RESTClientTransport;

    

    var SortedPackets = (function () {
        function SortedPackets() {
            this.packets = [];
        }
        Object.defineProperty(SortedPackets.prototype, "length", {
            get: function () {
                return this.packets.length;
            },
            enumerable: true,
            configurable: true
        });

        SortedPackets.prototype.addSorted = function (packet) {
            this.packets.push(packet);
            this.packets.sort(function (a, b) {
                return a.id - b.id;
            });
        };

        SortedPackets.prototype.get = function (i) {
            if (i < 0 || i > this.packets.length)
                return undefined;

            return this.packets[i];
        };

        SortedPackets.prototype.clearFirst = function (i) {
            this.packets.splice(0, i);
        };
        return SortedPackets;
    })();

    var MessageTransport = (function (_super) {
        __extends(MessageTransport, _super);
        function MessageTransport(user, postWindow, handler) {
            _super.call(this, user, handler);
            this.postWindow = postWindow;
            this.lastSendId = -1;
            this.lastReceiveId = -1;
            this.packets = new SortedPackets();

            window.addEventListener('message', this.onReceiveMessage.bind(this));
        }
        MessageTransport.prototype.sendMessage = function (msg) {
            var packet = {
                id: ++this.lastSendId,
                user: this.user,
                msg: msg
            };
            this.postWindow.postMessage(JSON.stringify(packet), '*');
        };

        MessageTransport.prototype.onReceiveMessage = function (e) {
            var packet = JSON.parse(e.data);
            if (!('id' in packet) || !('msg' in packet) || !('user' in packet))
                return;

            if (packet.user !== this.user)
                return;

            // when debugging, packets may be received out of order, but they must
            // be sent to the handlers in order
            this.packets.addSorted(packet);

            for (var i = 0; i < this.packets.length; ++i) {
                var packet = this.packets.get(i);
                if (packet.id === this.lastReceiveId + 1) {
                    this.lastReceiveId = packet.id;
                    this.callHandler(packet.msg);
                }
            }

            this.packets.clearFirst(i);
        };
        return MessageTransport;
    })(BaseTransport);
    BoardSystem.MessageTransport = MessageTransport;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    ;

    BoardSystem.plugins = {};

    function bindPlugin(board, name, info, key) {
        if (!info)
            return;

        if (typeof key === 'undefined')
            key = Object.keys(info)[0]; // get the first entry of info

        if (!key) {
            BoardSystem._error('no key specified in bindPlugin - ' + info);
            return;
        }
        info = info[key]; // PluginInfo

        console.log(name, info, key);

        BoardSystem.plugins[key] = info;

        if (!('createRule' in info))
            BoardSystem._error('no createRule for binding - ' + key);

        // bind the createRule function to the current board
        board[name] = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            args.splice(0, 0, this); // board as 1st argument
            return info.createRule.apply(this, args);
        };
    }
    BoardSystem.bindPlugin = bindPlugin;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    //-------------------------------
    var BaseClient = (function () {
        function BaseClient(user, board) {
            this.user = user;
            this.board = board;
            this.transport = null;
            this.localVariables = {};
            /*protected*/
            this.mapping = null;
            this.whereList = [];
        }
        BaseClient.prototype.setTransport = function (transport) {
            this.transport = transport;
        };

        BaseClient.prototype.getBoard = function () {
            return this.board;
        };

        BaseClient.prototype.getTransport = function () {
            return this.transport;
        };

        BaseClient.prototype.getMapping = function () {
            return this.mapping;
        };

        BaseClient.prototype.getUser = function () {
            return this.user;
        };

        BaseClient.prototype.setup = function () {
            this.onSetup();
        };

        BaseClient.prototype.onSetup = function () {
        };

        BaseClient.prototype.setLocalVariable = function (name, value) {
            this.localVariables[name] = value;
        };

        BaseClient.prototype.createResults = function (commands) {
            var results = [];
            for (var i = 0; i < commands.length; ++i) {
                var command = commands[i];

                for (var j in BoardSystem.plugins) {
                    var createResult = BoardSystem.plugins[j].createResult;
                    if (typeof createResult === 'function') {
                        var result = createResult(this, command);
                        if (result) {
                            results.push(result);
                            break;
                        }
                    }
                }
            }

            return results;
        };

        BaseClient.prototype.onHandleMessage = function (msg) {
            if (!('command' in msg))
                return;

            switch (msg.command) {
                case 'rule':
                    var commands = this.onResolveRule(msg.rule);
                    if (commands)
                        this.sendUserCommands(msg.rule.id, commands);
                    break;

                case 'batch':
                    this.onBroadcastCommands(msg.batch);
                    break;

                default:
                    BoardSystem._error('client - ' + this.user + ' - received unknown command - ' + msg.command);
            }
        };

        /* protected */
        BaseClient.prototype.onResolveRule = function (rule) {
            // if a rule cannot be resolved, then cast the rule as a single command
            return [rule];
        };

        /* protected */
        BaseClient.prototype.onBroadcastCommands = function (batch) {
            for (var user in batch.commands) {
                var commands = batch.commands[user];

                for (var i = 0; i < commands.length; ++i) {
                    var command = commands[i];
                    if (!command.type)
                        BoardSystem._error('no type specified in command - ' + command);

                    for (var j in BoardSystem.plugins) {
                        var updateClient = BoardSystem.plugins[j].updateClient;
                        if (typeof updateClient === 'function' && updateClient(this, command))
                            break;
                    }
                }
            }
        };

        BaseClient.prototype.sendUserCommands = function (ruleId, commands) {
            this.transport.sendMessage({
                command: 'batch',
                batch: BoardSystem.createBatchCommand(ruleId, this.user, commands)
            });
        };
        return BaseClient;
    })();
    BoardSystem.BaseClient = BaseClient;

    //-------------------------------
    var BankClient = (function (_super) {
        __extends(BankClient, _super);
        function BankClient() {
            _super.apply(this, arguments);
        }
        BankClient.prototype.onResolveRule = function (rule) {
            var results = [];
            for (var i in BoardSystem.plugins) {
                var performRule = BoardSystem.plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        var commands = results[~~(Math.random() * results.length)];
                        return commands;
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return _super.prototype.onResolveRule.call(this, rule);
        };
        return BankClient;
    })(BaseClient);
    BoardSystem.BankClient = BankClient;

    //-------------------------------
    var HTMLClient = (function (_super) {
        __extends(HTMLClient, _super);
        function HTMLClient(user, board, boardElem) {
            _super.call(this, user, board);
            this.boardElem = boardElem;

            // use the board to establish an initial mapping and configuration of the boardElem
            this.mapping = new BoardSystem.HTMLMapping(board, user, boardElem);
        }
        HTMLClient.prototype.getBoardElem = function () {
            return this.boardElem;
        };

        HTMLClient.prototype.onResolveRule = function (rule) {
            if (!rule.type)
                BoardSystem._error('no type specified in rule - ' + rule);

            var results = [];
            for (var i in BoardSystem.plugins) {
                var performRule = BoardSystem.plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        return results[0];
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return _super.prototype.onResolveRule.call(this, rule);
        };
        return HTMLClient;
    })(BaseClient);
    BoardSystem.HTMLClient = HTMLClient;

    //-------------------------------
    var AIClient = (function (_super) {
        __extends(AIClient, _super);
        function AIClient() {
            _super.apply(this, arguments);
        }
        return AIClient;
    })(BaseClient);
    BoardSystem.AIClient = AIClient;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    var configs = [];

    function addGameConfig(config) {
        configs.push(config);
    }
    BoardSystem.addGameConfig = addGameConfig;

    function getGameConfig(gameKey) {
        for (var i = 0; i < configs.length; ++i) {
            if (configs[i].gameKey === gameKey)
                return configs[i];
        }
        return null;
    }
    BoardSystem.getGameConfig = getGameConfig;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    (function (StepStatus) {
        StepStatus[StepStatus["Ready"] = 0] = "Ready";
        StepStatus[StepStatus["Complete"] = 1] = "Complete";
        StepStatus[StepStatus["Error"] = 2] = "Error";
    })(BoardSystem.StepStatus || (BoardSystem.StepStatus = {}));
    var StepStatus = BoardSystem.StepStatus;

    // server has perfect knowledge of the game.  validates all moves.
    var GameServer = (function () {
        function GameServer() {
            this.board = null;
            this.proxies = [];
            this.ruleUsers = [];
            this.ruleBatch = {
                ruleId: -1,
                commands: {}
            };
            this.inNewGame = false;
            this.bankClient = null;
            this.config = null;
            this.whereList = [];
        }
        GameServer.prototype.addTransport = function (proxy) {
            this.proxies.push(proxy);
        };

        GameServer.prototype.removeTransport = function (proxy) {
            var i = this.proxies.indexOf(proxy);
            if (i !== -1)
                this.proxies.splice(i, 1);
        };

        GameServer.prototype.getProxies = function (userNames) {
            var inputNames = userNames.split(',');
            var proxies = [];
            for (var i = 0; i < this.proxies.length; ++i) {
                if (BoardSystem.union(this.proxies[i].user, inputNames).length > 0)
                    proxies.push(this.proxies[i]); // at least one of the users is in this proxy
            }
            return proxies;
        };

        GameServer.prototype.setBankClient = function (client) {
            this.bankClient = client;
            this.board = client.getBoard();
        };

        GameServer.prototype.getBankClient = function () {
            return this.bankClient;
        };

        GameServer.prototype.newGame = function () {
            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(this.board);

            // this.inNewGame = true;
            this.step(); // don't have user rules in the newGame!!!
        };

        GameServer.prototype.step = function (nextValue) {
            if (!('next' in this.rulesIter))
                return 2 /* Error */;

            var result = this.rulesIter.next(nextValue);
            if (result.done) {
                console.log('RULES COMPLETE');
                return 1 /* Complete */;
            }

            var nextRule = result.value;
            if (!nextRule) {
                BoardSystem._error('game rules yielded an empty rule');
                return 2 /* Error */;
            }

            console.log(nextRule);

            this.ruleBatch = {
                ruleId: nextRule.id,
                commands: {}
            };
            if (!nextRule.user)
                BoardSystem._error('there is no user in the rule - ' + nextRule);

            this.ruleUsers = nextRule.user.split(',');

            var userProxies = this.getProxies(nextRule.user);
            if (userProxies.length === 0) {
                BoardSystem._error('user does not have proxy - ' + nextRule.user);
                return 2 /* Error */;
            }

            for (var i = 0; i < userProxies.length; ++i)
                userProxies[i].sendMessage({
                    command: 'rule',
                    rule: nextRule
                });

            return 0 /* Ready */;
        };

        GameServer.prototype.handleCommands = function (batch, nextValue) {
            if (!batch)
                return false;

            if (batch.ruleId !== this.ruleBatch.ruleId) {
                BoardSystem._error('out of sequence rule received, expecting ' + this.ruleBatch.ruleId + ' received ' + batch.ruleId);
                return false;
            }

            if (!batch.commands)
                return false;

            for (var user in batch.commands) {
                if (typeof this.ruleBatch.commands[user] !== 'undefined') {
                    BoardSystem._error('command received twice from user ' + i);
                    return false;
                }
            }

            // add this user's response to the local batch
            BoardSystem.extend(this.ruleBatch.commands, batch.commands);

            var responders = Object.keys(this.ruleBatch.commands).join(',');
            if (BoardSystem.union(this.ruleUsers, responders).length !== this.ruleUsers.length)
                return false;

            for (var user in batch.commands)
                nextValue[user] = this.bankClient.createResults(batch.commands[user]);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].sendMessage({
                    command: 'batch',
                    batch: this.ruleBatch
                });

            this.board.print();

            return true;
        };

        // server only supports sendCommands
        GameServer.prototype.onHandleMessage = function (msg) {
            if (!('command' in msg) || !('batch' in msg) || msg.command !== 'batch') {
                debugger;
                return;
            }

            var nextValue = {};
            if (!this.handleCommands(msg.batch, nextValue))
                return;

            var status = this.step(nextValue);
        };

        GameServer.prototype.getUser = function () {
            return 'SERVER';
        };
        return GameServer;
    })();
    BoardSystem.GameServer = GameServer;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    function getScreenConfigByScreen(config, screen) {
        for (var i = 0; i < config.screens.length; ++i) {
            if (config.screens[i].screen === screen)
                return config.screens[i];
        }
        return null;
    }
    BoardSystem.getScreenConfigByScreen = getScreenConfigByScreen;

    function getScreenConfigByUser(config, user) {
        var numUsers = user.split(',').length;
        for (var i = 0; i < config.screens.length; ++i) {
            if (BoardSystem.union(user, config.screens[i].user).length === numUsers)
                return config.screens[i];
        }
        return null;
    }
    BoardSystem.getScreenConfigByUser = getScreenConfigByUser;

    function createClient(game, screenConfig, boardElem) {
        var board = new BoardSystem.Board(), user = screenConfig.user, client = null, proxy = null;

        game.setupFunc(board);

        switch (screenConfig.type) {
            case 'human':
                client = new BoardSystem.HTMLClient(user, board, boardElem);
                break;

            case 'ai':
                client = new BoardSystem.AIClient(user, board);
                break;

            case 'bank':
                client = new BoardSystem.BankClient(user, board);
                break;
        }
        if (!client)
            return null;

        switch (screenConfig.transport) {
            case 'REST':
                proxy = BoardSystem.createRESTClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'local':
                proxy = BoardSystem.createLocalClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'message':
                proxy = BoardSystem.createMessageClientTransport(user, window.parent, client.onHandleMessage.bind(client));
                break;
        }
        client.setTransport(proxy);

        return client;
    }
    BoardSystem.createClient = createClient;

    function createServer(game, config) {
        var server = new BoardSystem.GameServer();

        for (var i = 0; i < config.screens.length; ++i) {
            var screenConfig = config.screens[i];
            if (!screenConfig)
                continue;

            var screenTransport = createTransport(screenConfig, server.onHandleMessage.bind(server));
            if (!screenTransport)
                continue;

            server.addTransport(screenTransport);

            // setup all local clients
            if (screenConfig.transport === 'local')
                var client = createClient(game, screenConfig, null);
        }

        // setup special bank client
        var bankConfig = {
            screen: 'bank',
            userKey: '-1',
            transport: 'local',
            user: 'BANK',
            type: 'bank'
        };

        // transport must be first
        var bankTransport = createTransport(bankConfig, server.onHandleMessage.bind(server));
        var bankClient = createClient(game, bankConfig, null);

        server.addTransport(bankTransport);
        server.setBankClient(bankClient);
        server.config = config;

        return server;
    }
    BoardSystem.createServer = createServer;

    function createTransport(screenConfig, handler) {
        var transport = null, user = screenConfig.user;

        switch (screenConfig.transport) {
            case 'REST':
                transport = BoardSystem.createRESTServerTransport(user, handler);
                break;

            case 'local':
                transport = BoardSystem.createLocalServerTransport(user, handler);
                break;

            case 'message':
                var iframe = (document.getElementById(screenConfig.iframe));
                transport = BoardSystem.createMessageServerTransport(user, iframe.contentWindow, handler);

                // for message we tell the iframe which screen to use
                var msg = {
                    type: 'config',
                    config: screenConfig,
                    screen: screenConfig.screen
                };
                iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
                break;
        }

        return transport;
    }

    function queryServer(setup, boardElem) {
        var screenConfig, client, screen;

        // setup for debug server
        window.addEventListener('message', function (e) {
            var msg = JSON.parse(e.data);
            if (!('type' in msg))
                return;

            switch (msg.type) {
                case 'config':
                    screenConfig = msg.config;
                    screen = msg.screen;
                    client = createClient(setup, screenConfig, boardElem);
                    break;

                case 'broadcastCommands':
                case 'resolveRule':
                    var proxy = (client ? client.getTransport() : null);
                    if (proxy)
                        proxy.sendMessage(msg);
                    break;
            }
        });
    }
    BoardSystem.queryServer = queryServer;
})(BoardSystem || (BoardSystem = {}));
/// <reference path="seedrandom.d.ts" />
/// <reference path="board.ts" />
/// <reference path="htmlmapping.ts" />
/// <reference path="transport.ts" />
/// <reference path="plugin.ts" />
/// <reference path="gameclient.ts" />
/// <reference path="gameconfig.ts" />
/// <reference path="gameserver.ts" />
/// <reference path="config.ts" />
/// <reference path="_dependencies.ts" />

// require() may be present in the setup files for a game, to bring in game modules, but for the non-server
// versions they will be loaded via script tags, so require becomes a no-op.
if (typeof require === 'undefined') {
    var browserModules = {};
    var nameEx = /(\w*)(?:\.js)?$/;

    browserRequire = function () {
        var allScripts = document.getElementsByTagName('script'), src = allScripts[allScripts.length - 1].src, coreName = nameEx.exec(src)[1];

        // when putting multiple plugins into the same file, browserRequire() will be called multiple times
        if (!(coreName in browserModules))
            browserModules[coreName] = {};

        return browserModules[coreName];
    };

    require = function (filename) {
        var coreName = nameEx.exec(filename)[1];
        if (!(coreName in browserModules)) {
            console.log('require(' + filename + ') - not found');
            return null;
        }

        return browserModules[coreName];
    };
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    for (var k in BoardSystem)
        exports[k] = BoardSystem[k];
}
