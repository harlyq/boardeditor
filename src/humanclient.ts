/// <reference path="_dependencies.ts" />
/// <reference path="card.ts" />
/// <reference path="layout.ts" />
/// <reference path="interact.ts" />
var CLASS_HIGHLIGHT = 'highlight';
var thisComputerRuleId = -1;

class HumanClient extends Game.Client {
    private pickList: any[] = [];
    private lastRuleId: number = -1;
    private pauseEvents: boolean = false;
    private fromInteract: Interact = null;
    private toInteract: Interact = null;
    private transformStyle = 'transform';

    private locationElems: {
        [key: number]: HTMLElement;
    } = {};
    private deckElems: {
        [key: number]: HTMLElement;
    } = {};
    private cardElems: {
        [key: number]: HTMLElement;
    } = {};

    constructor(user: string, proxy: Game.BaseClientProxy, board: Game.Board, public boardElem: HTMLElement) {
        super(user, proxy, board);

        var style = boardElem.style;
        if ('transform' in style)
            this.transformStyle = 'transform';
        else if ('webkitTransform' in style)
            this.transformStyle = 'webkitTransform';
    }

    private onPickLocation(location: Game.Location) {
        if (this.board.getVariable('currentPlayer') !== this.user)
            return;

        var i = this.pickList.indexOf(location);
        if (i === -1)
            return;

        // TODO check the number of picks
        this.pickList = [];
        this.clearHighlights();

        this.proxy.sendCommands({
            ruleId: this.lastRuleId,
            commands: [{
                type: 'pickLocation',
                values: [location.name]
            }]
        });
    }

    private translate(target: HTMLElement, dx: number, dy: number, absolute = false) {
        target['dx'] = (absolute ? 0 : target['dx'] || 0) + dx;
        target['dy'] = (absolute ? 0 : target['dy'] || 0) + dy;

        var sTranslate = 'translate(' + target['dx'] + 'px, ' + target['dy'] + 'px)';

        target.style[this.transformStyle] = sTranslate;
    }

    setup() {
        // setup the board
        super.setup();

        var self = this;

        // bind layouts
        var layoutElements = self.boardElem.querySelectorAll('.layout');
        [].forEach.call(layoutElements, function(element) {
            var name = element.getAttribute('name');
            var altName = self.getAlias(name);

            var location = self.board.queryFirstLocation(altName);
            if (location) {
                self.locationElems[location.id] = element;
                element.addEventListener('click', self.onPickLocation.bind(self, location));
                self.applyLabels(element, location);
            } else {
                Game._error('could not find layout "' + name + '" alias "' + altName + '"');
            }
        });

        // bind decks
        this.board.getDecks().forEach(function(deck) {
            self.deckElems[deck.id] = < HTMLElement > (self.boardElem.querySelector('.deck[name="' + deck.name + '"]'));
        });

        // bind cards
        this.board.getCards().forEach(function(card) {
            self.cardElems[card.id] = < HTMLElement > (self.boardElem.querySelector('.card[name="' + card.name + '"]'));
        });

        // add functionality
        var cards = card(".card"),
            layouts = layout(".layout"),
            moving = [];

        this.fromInteract = interact(null)
            .disable()
            .moveable()
            .on("move", function(e) {
                e.currentTarget.style.zIndex = '1';
                self.translate(e.currentTarget, e.detail.dx, e.detail.dy);
                // toggleZoom(null);

                var i = moving.indexOf(e.currentTarget);
                if (i === -1)
                    moving.push(e.currentTarget);
            })
            .on("moveend", function(e) {
                var i = moving.indexOf(e.currentTarget);
                if (i !== -1) {
                    moving.splice(i, 1);
                    self.translate(e.currentTarget, 0, 0, true);
                    e.currentTarget.style.zIndex = '';
                }
            })

        this.toInteract = interact(null)
            .disable()
            .dropzone(".card")
            .on("dropactivate", function(e) {
                e.currentTarget.classList.add('highlight');
            })
            .on("dropdeactivate", function(e) {
                e.currentTarget.classList.remove('highlight')
            })
            .on("drop", function(e) {
                var dragCard = e.detail.dragTarget;
                // e.currentTarget.appendChild(dragCard);
                // dragCard.setAttribute('facedown', 'false');
                self.clearHighlights();

                self.proxy.sendCommands({
                    ruleId: self.lastRuleId,
                    commands: [{
                        type: 'move',
                        cardId: self.getCardIdFromElem(dragCard),
                        fromId: self.getLocationIdFromElem(dragCard.parentNode),
                        toId: self.getLocationIdFromElem(e.currentTarget),
                        index: -1
                    }]
                });

                self.toInteract.disable();
            });
    }

    private getCardIdFromElem(cardElem: HTMLElement): number {
        for (var i in this.cardElems) {
            if (cardElem === this.cardElems[i])
                return parseInt(i);
        }
        return 0;
    }

    private getLocationIdFromElem(locationElem: HTMLElement): number {
        for (var i in this.locationElems) {
            if (locationElem === this.locationElems[i])
                return parseInt(i);
        }
        return 0;
    }

    private applyLabels(element: HTMLElement, location: Game.Location) {
        for (var i = 0; i < location.labels.length; ++i) {
            var label = location.labels[i];
            element.classList.add(label);
        }
    }

    private applyVariables(element: HTMLElement, variables: {
        [key: string]: any
    }) {
        for (var i in variables)
            element.setAttribute(i, variables[i]);
    }

    private getAlias(value: string): string {
        if (!value)
            return '';

        // apply local variables first
        var parts = value.split('.');
        for (var i = 0; i < parts.length; ++i) {
            var part = parts[i];
            if (typeof part === 'string' && part[0] === '$') {
                var alias = part.substr(1);
                if (alias in this.localVariables)
                    parts[i] = this.localVariables[alias];
            }
        }

        // then global variables
        return this.board.getAlias(parts.join('.'));
    }

    resolvePick(pickRule: Game.PickRule): Game.BatchCommand {
        var nullBatch = {
            ruleId: pickRule.id,
            commands: []
        };
        var where: any = pickRule.where || function() {
            return true;
        }

        var list = [];
        var rawList: any = pickRule.list;
        if (typeof pickRule.list === 'string')
            rawList = ( < string > pickRule.list).split(',');
        if (!Array.isArray(rawList))
            rawList = [rawList];

        switch (pickRule.type) {
            case 'pick':
                list = rawList;
                break;
            case 'pickLocation':
                list = this.board.queryLocations(rawList.join(','));
                break;
            case 'pickCard':
                list = this.board.queryCards(rawList.join(','));
                break;
        }

        this.clearHighlights();

        this.pickList = list.filter(where);
        if (this.pickList.length === 0) {
            Game._error('no items in ' + pickRule.type + ' list - ' + pickRule.list + ', rule - ' + pickRule.where);
            return nullBatch;
        }

        for (var i = 0; i < this.pickList.length; ++i) {
            var pick = this.pickList[i];

            switch (pickRule.type) {
                case 'pick':
                    break;

                case 'pickLocation':
                    var element = this.locationElems[pick.id];
                    if (element)
                        element.classList.add(CLASS_HIGHLIGHT);
                    break;
                case 'pickCard':
                    var element = this.locationElems[pick.id];
                    if (element)
                        element.classList.add(CLASS_HIGHLIGHT);
                    break;
            }
        }

        this.lastRuleId = pickRule.id;

        return nullBatch; // filled batch will be sent when the user interacts
    }

    resolveMove(moveRule: Game.MoveRule): Game.BatchCommand {
        var nullBatch = {
            ruleId: moveRule.id,
            commands: []
        };

        this.lastRuleId = moveRule.id;

        var fromLocations = this.board.queryLocations(moveRule.from);
        if (fromLocations.length === 0)
            return; // card only moves not yet supported

        var toLocations = this.board.queryLocations(moveRule.to);
        if (toLocations.length === 0)
            return; // move not supported for this user

        var fromElements = [];
        for (var i = 0; i < fromLocations.length; ++i) {
            var fromLocation = fromLocations[i];
            var element = this.locationElems[fromLocation.id];
            if (element)
                element.classList.add(CLASS_HIGHLIGHT);
            fromElements.push(element);
        }

        var self = this;
        this.fromInteract.setElements("." + CLASS_HIGHLIGHT + " > .card")
            .enable()
            .off("movestart") // clear old movestart calls
            .on("movestart", function(e) {
                // match the target's parent to get the fromElement, and then the fromLocation
                var j = fromElements.indexOf(e.currentTarget.parentNode);
                if (j !== -1)
                    var fromLocation = fromLocations[j];

                if (fromLocation) {
                    // bind where to the starting 'from' location, so we filter on 'to'
                    var validLocations = toLocations;
                    if (moveRule.where)
                        validLocations = toLocations.filter(moveRule.where.bind(fromLocation));

                    var validLocationElems = [];
                    for (var i = 0; i < validLocations.length; ++i) {
                        var element = self.locationElems[validLocations[i].id];
                        validLocationElems.push(element);
                        element.classList.add(CLASS_HIGHLIGHT);
                    }

                    self.toInteract.setElements(validLocationElems).enable();
                }
            });

        return nullBatch; // filled batch will be sent when the user interacts
    }

    onUpdateCommands(batch: Game.BatchCommand) {
        if (!batch || batch.commands.length === 0)
            return;

        var commands = batch.commands;
        var showEvents = !this.pauseEvents && batch.ruleId > thisComputerRuleId;

        for (var i = 0; i < commands.length; ++i) {
            var command = commands[i];
            if (command.type === 'move' && showEvents) {
                var moveCommand = < Game.MoveCommand > command,
                    card = this.board.queryFirstCard(moveCommand.cardId.toString()),
                    from = this.board.queryFirstLocation(moveCommand.fromId.toString()),
                    to = this.board.queryFirstLocation(moveCommand.toId.toString()),
                    cardElem = (card ? this.cardElems[card.id] : null),
                    fromElem = (from ? this.locationElems[from.id] : null),
                    toElem = (to ? this.locationElems[to.id] : null);

                if (fromElem) {
                    var event: CustomEvent = new( < any > CustomEvent)('removeCard', {
                        bubbles: true,
                        cancelable: true,
                        detail: {
                            card: card
                        }
                    });
                    fromElem.dispatchEvent(event);
                }

                if (toElem) {
                    var event: CustomEvent = new( < any > CustomEvent)('addCard', {
                        bubbles: true,
                        cancelable: true,
                        detail: {
                            card: card
                        }
                    });
                    toElem.dispatchEvent(event);
                }

                if (toElem && toElem.hasAttribute('count'))
                    toElem.setAttribute('count', to.getNumCards().toString());

                if (fromElem && fromElem.hasAttribute('count'))
                    fromElem.setAttribute('count', from.getNumCards().toString());

                if (toElem && cardElem)
                    toElem.appendChild(cardElem);

                if (card && cardElem && card.id > 0) {
                    var deck = this.board.findDeckByCardId(card.id);
                    this.applyVariables(cardElem, deck.variables);
                    this.applyVariables(cardElem, card.variables);
                }

                // have a global flag which tracks when any human client on this
                // machine updates it's rule, so we don't dispatch the events multiple
                // times
                thisComputerRuleId = batch.ruleId;
            }
        }
    }

    private clearHighlights() {
        for (var i in this.locationElems) {
            var element = this.locationElems[i];
            if (element)
                element.classList.remove(CLASS_HIGHLIGHT);
        }

        for (var i in this.cardElems) {
            var element = this.cardElems[i];
            if (element)
                element.classList.remove(CLASS_HIGHLIGHT);
        }
    }

    pollServer() {
        this.proxy.pollServer();
    }
}
