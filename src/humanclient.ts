/// <reference path="_dependencies.ts" />
/// <reference path="card.ts" />
/// <reference path="layout.ts" />
/// <reference path="interact.ts" />
/// <reference path="htmlmapping.ts" />
var CLASS_HIGHLIGHT = 'highlight';
var thisComputerRuleId = -1;

class HumanClient extends Game.Client {
    private pickList: any[] = [];
    private lastRuleId: number = -1;
    private pauseEvents: boolean = false;
    private fromInteract: Interact = null;
    private toInteract: Interact = null;
    private transformStyle = 'transform';
    mapping: HTMLMapping = null;

    constructor(user: string, proxy: Game.BaseClientProxy, board: Game.Board, public boardElem: HTMLElement) {
        super(user, proxy, board);

        var style = boardElem.style;
        if ('transform' in style)
            this.transformStyle = 'transform';
        else if ('webkitTransform' in style)
            this.transformStyle = 'webkitTransform';

        this.mapping = new HTMLMapping(board);
    }

    private translate(target: HTMLElement, dx: number, dy: number, absolute = false) {
        target['dx'] = (absolute ? 0 : target['dx'] || 0) + dx;
        target['dy'] = (absolute ? 0 : target['dy'] || 0) + dy;

        var sTranslate = 'translate(' + target['dx'] + 'px, ' + target['dy'] + 'px)';

        target.style[this.transformStyle] = sTranslate;
    }

    onSetup() {
        // setup the board
        var self = this;

        // bind layouts, decks and cards
        this.mapping.parseElement(self.boardElem);

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
                        cardId: self.mapping.getCardFromElem(dragCard).id,
                        fromId: self.mapping.getLocationFromElem(dragCard.parentNode).id,
                        toId: self.mapping.getLocationFromElem(e.currentTarget).id,
                        index: -1
                    }]
                });

                self.toInteract.disable();
            });
    }

    private applyVariables(element: HTMLElement, variables: {
        [key: string]: any
    }) {
        for (var i in variables)
            element.setAttribute(i, variables[i]);
    }

    onResolveRule(rule: Game.BaseRule): Game.BatchCommand {
        var results = []
        for (var i = 0; i < this.plugins.length; ++i) {
            if (this.plugins[i].performRule(rule, results)) {
                if (results.length > 0)
                    return results[0]; // return the first option
                else
                    return null;
            }
        }

        return super.onResolveRule(rule);
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
            var element = this.mapping.getElemFromLocationId(fromLocation.id);
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
                        var element = self.mapping.getElemFromLocationId(validLocations[i].id);
                        validLocationElems.push(element);
                        element.classList.add(CLASS_HIGHLIGHT);
                    }

                    self.toInteract.setElements(validLocationElems).enable();
                }
            });

        return nullBatch; // filled batch will be sent when the user interacts
    }

    resolveSetVariable(rule: Game.SetRule): Game.BatchCommand {
        var setBatch = {
                ruleId: rule.id,
                commands: [ < Game.SetCommand > rule]
            },
            nullBatch = {
                ruleId: rule.id,
                commands: []
            },
            proxy = this.proxy;

        switch (rule.type) {
            case 'setVariable':
                proxy.sendCommands(setBatch);
                break;

            case 'setCardVariable':
                var cards = this.board.queryCards(rule.key);

                for (var i = 0; i < cards.length; ++i)
                    this.applyVariables(this.mapping.getElemFromCard(cards[i]), rule.value);

                window.setTimeout(function() {
                    proxy.sendCommands(setBatch);
                }, 2000);

                return nullBatch;
        }
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
                    cardElem = (card ? this.mapping.getElemFromCardId(card.id) : null),
                    fromElem = (from ? this.mapping.getElemFromLocationId(from.id) : null),
                    toElem = (to ? this.mapping.getElemFromLocationId(to.id) : null);

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

            } else if (command.type === 'setCardVariable') {
                var setCommand = < Game.SetCommand > command,
                    cards = this.board.queryCards(setCommand.key);

                for (var i = 0; i < cards.length; ++i)
                    this.applyVariables(this.mapping.getElemFromCard(cards[i]), setCommand.value);
            }
        }
    }

    private clearHighlights() {
        // for (var i in this.mapping.locationElems) {
        //     var element = this.mapping.locationElems[i];
        //     if (element)
        //         element.classList.remove(CLASS_HIGHLIGHT);
        // }

        // for (var i in this.mapping.cardElems) {
        //     var element = this.mapping.cardElems[i];
        //     if (element)
        //         element.classList.remove(CLASS_HIGHLIGHT);
        // }
    }

    pollServer() {
        this.proxy.pollServer();
    }
}
