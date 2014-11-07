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

        this.mapping = new HTMLMapping(board);
    }

    onSetup() {
        // bind layouts, decks and cards
        this.mapping.parseElement(this.boardElem);

        // add functionality
        card(".card");
        layout(".layout");
    }

    private applyVariables(element: HTMLElement, variables: {
        [key: string]: any
    }) {
        for (var i in variables)
            element.setAttribute(i, variables[i]);
    }

    onResolveRule(rule: Game.BaseRule): Game.BatchCommand {
        var results = []
        for (var i in Game.plugins) {
            if (Game.plugins[i].performRule(this, rule, results)) {
                if (results.length > 0)
                    return results[0]; // return the first option
                else
                    return null;
            }
        }

        return super.onResolveRule(rule);
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

            }
            // else if (command.type === 'setCardVariable') {
            //     var setCommand = < SetCommand > command,
            //         cards = this.board.queryCards(setCommand.key);

            //     for (var i = 0; i < cards.length; ++i)
            //         this.applyVariables(this.mapping.getElemFromCard(cards[i]), setCommand.value);
            // }
        }
    }
}
