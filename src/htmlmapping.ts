/// <reference path="_dependencies.ts" />
module BoardSystem {
    export class HTMLMapping {
        private locationToElem: {
            [key: number]: HTMLElement;
        } = {};
        private deckToElem: {
            [key: number]: HTMLElement;
        } = {};
        private cardToElem: {
            [key: number]: HTMLElement;
        } = {};
        public lastRuleId: number = -1;

        constructor(private board: Board, public user: string, public boardElem: HTMLElement) {
            this.parseElement(boardElem);
        }

        getUser(): string {
            return this.user;
        }

        getBoardElem(): HTMLElement {
            return this.boardElem;
        }

        private parseElement(boardElem: HTMLElement) {
            var self = this;

            // bind layouts
            var layoutElements = boardElem.querySelectorAll('.layout');
            [].forEach.call(layoutElements, function(element) {
                var name = element.getAttribute('name');
                var altName = self.getAlias(name);

                var location = self.board.queryFirstLocation(altName);
                if (location) {
                    self.locationToElem[location.id] = element;
                    self.applyLabels(element, location.getLabels());
                    self.applyVariables(element, location.getVariables());
                } else {
                    _error('could not find location "' + name + '" alias "' + altName + '"');
                }
            });

            // bind decks
            this.board.getDecks().forEach(function(deck) {
                self.deckToElem[deck.id] = < HTMLElement > (boardElem.querySelector('.deck[name="' + deck.name + '"]'));
            });

            // bind cards
            this.board.getCards().forEach(function(card) {
                var element = < HTMLElement > (boardElem.querySelector('.card[name="' + card.name + '"]'));
                if (element) {
                    self.cardToElem[card.id] = element;
                    self.applyLabels(element, card.labels);
                    self.applyVariables(element, card.getVariables());
                } else {
                    _error('could not find element for card - ' + card.name);
                }
            });
        }

        getAlias(value: string): string {
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
        }

        applyLabels(element: HTMLElement, labels: string[]) {
            for (var i = 0; i < labels.length; ++i)
                element.classList.add(labels[i]);
        }

        applyVariables(element: HTMLElement, variables: {
            [key: string]: any
        }) {
            for (var i in variables)
                element.setAttribute(i, variables[i]);
        }

        copyVariables(element: HTMLElement, variables: {
            [key: string]: any
        }): {
            [key: string]: any
        } {
            var results: any = {};
            for (var i in variables)
                results[i] = element.getAttribute(i);

            return results;
        }

        getDeckFromElem(deckElem: HTMLElement): Deck {
            for (var i in this.deckToElem) {
                if (deckElem = this.deckToElem[i]) {
                    var deckId = parseInt(i);
                    return this.board.findDeckById(deckId);
                }
            }
        }

        getElemFromDeck(deck: Deck): HTMLElement {
            if (!deck)
                return null;

            return this.deckToElem[deck.id];
        }

        getElemFromDeckId(deckId: number): HTMLElement {
            return this.deckToElem[deckId];
        }

        getCardFromElem(cardElem: HTMLElement): Card {
            for (var i in this.cardToElem) {
                if (cardElem === this.cardToElem[i]) {
                    var cardId = parseInt(i);
                    return this.board.findCardById(cardId);
                }
            }
            return null;
        }

        getElemFromCard(card: Card): HTMLElement {
            if (!card)
                return null;

            return this.cardToElem[card.id];
        }

        getElemFromCardId(cardId: number): HTMLElement {
            return this.cardToElem[cardId];
        }

        getElemsFromCardIds(idList: string): HTMLElement[] {
            if (!idList)
                return [];

            var list: HTMLElement[] = [];
            var cardIds = idList.split(',');
            for (var i = 0; i < cardIds.length; ++i) {
                var elem = this.cardToElem[cardIds[i]];
                if (elem)
                    list.push(elem);
            }

            return list;
        }

        getElemsFromCards(cards: Card[]): HTMLElement[] {
            var list = [];
            for (var i = 0; i < cards.length; ++i) {
                var card = cards[i];
                list.push(card ? this.cardToElem[card.id] : null);
            }
            return list;
        }

        getLocationFromElem(locationElem: HTMLElement): Location {
            for (var i in this.locationToElem) {
                if (locationElem === this.locationToElem[i]) {
                    var locationId = parseInt(i);
                    return this.board.findLocationById(locationId);
                }
            }
            return null;
        }

        getElemFromLocation(location: Location): HTMLElement {
            if (!location)
                return null;

            return this.locationToElem[location.id];
        }

        getElemFromLocationId(locationId: number): HTMLElement {
            return this.locationToElem[locationId];
        }

        getElemsFromLocationIds(idList: string): HTMLElement[] {
            if (!idList)
                return [];

            var list: HTMLElement[] = [];
            var locationIds = idList.split(',');
            for (var i = 0; i < locationIds.length; ++i) {
                var elem = this.locationToElem[locationIds[i]];
                if (elem)
                    list.push(elem);
            }

            return list;
        }

        getElemsFromLocations(locations: Location[]): HTMLElement[] {
            var list = [];
            for (var i = 0; i < locations.length; ++i) {
                var location = locations[i];
                list.push(location ? this.locationToElem[location.id] : null);
            }
            return list;
        }


        getElemsFromIds(idList: string): HTMLElement[] {
            var elems: HTMLElement[] = [];
            [].push.apply(elems, this.getElemsFromLocationIds(idList));
            [].push.apply(elems, this.getElemsFromCardIds(idList));
            return elems;
        }

        getThingFromElem(elem: HTMLElement): any {
            var thing: any = this.getLocationFromElem(elem);
            thing = thing || this.getCardFromElem(elem);

            return thing;
        }
    }
}
