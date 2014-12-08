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
