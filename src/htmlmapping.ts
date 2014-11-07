/// <reference path="_dependencies.ts" />
class HTMLMapping {
    private locationToElem: {
        [key: number]: HTMLElement;
    } = {};
    private deckToElem: {
        [key: number]: HTMLElement;
    } = {};
    private cardToElem: {
        [key: number]: HTMLElement;
    } = {};

    constructor(private board: Game.Board) {}

    parseElement(boardElem: HTMLElement) {
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
            } else {
                Game._error('could not find location "' + name + '" alias "' + altName + '"');
            }
        });

        // bind decks
        this.board.getDecks().forEach(function(deck) {
            self.deckToElem[deck.id] = < HTMLElement > (boardElem.querySelector('.deck[name="' + deck.name + '"]'));
        });

        // bind cards
        this.board.getCards().forEach(function(card) {
            var element = < HTMLElement > (boardElem.querySelector('.card[name="' + card.name + '"]'));
            self.cardToElem[card.id] = element;
            self.applyLabels(element, card.labels);
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

    getDeckFromElem(deckElem: HTMLElement): Game.Deck {
        for (var i in this.deckToElem) {
            if (deckElem = this.deckToElem[i]) {
                var deckId = parseInt(i);
                return this.board.findDeckById(deckId);
            }
        }
    }

    getElemFromDeck(deck: Game.Deck): HTMLElement {
        if (!deck)
            return null;

        return this.deckToElem[deck.id];
    }

    getElemFromDeckId(deckId: number): HTMLElement {
        return this.deckToElem[deckId];
    }

    getCardFromElem(cardElem: HTMLElement): Game.Card {
        for (var i in this.cardToElem) {
            if (cardElem === this.cardToElem[i]) {
                var cardId = parseInt(i);
                return this.board.findCardById(cardId);
            }
        }
        return null;
    }

    getElemFromCard(card: Game.Card): HTMLElement {
        if (!card)
            return null;

        return this.cardToElem[card.id];
    }

    getElemFromCardId(cardId: number): HTMLElement {
        return this.cardToElem[cardId];
    }

    getLocationFromElem(locationElem: HTMLElement): Game.Location {
        for (var i in this.locationToElem) {
            if (locationElem === this.locationToElem[i]) {
                var locationId = parseInt(i);
                return this.board.findLocationById(locationId);
            }
        }
        return null;
    }

    getElemFromLocation(location: Game.Location): HTMLElement {
        if (!location)
            return null;

        return this.locationToElem[location.id];
    }

    getElemFromLocationId(locationId: number): HTMLElement {
        return this.locationToElem[locationId];
    }
}