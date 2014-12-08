/// <reference path='boardsystem.d.ts' />
/// <reference path='pluginhelper.d.ts' />
/// <reference path='interact.ts' />

interface MoveRule extends BoardSystem.BaseRule {
    from: any;
    fromPosition ? : BoardSystem.Position;
    to: any;
    toPosition ? : BoardSystem.Position;
    cards ? : string;
    where ? : (from: Location, to: Location) => boolean;
    whereIndex ? : number; // internal, use where instead
    hint ? : string;
    quantity ? : BoardSystem.Quantity;
    count ? : number;
}

interface MoveCommand extends BoardSystem.BaseCommand {
    cardId: number;
    fromId: number;
    toId: number;
    index: number;
}

interface MoveResult extends BoardSystem.BaseResult {
    card: BoardSystem.Card;
    from: BoardSystem.Location;
    to: BoardSystem.Location;
    index: number;
}

module MovePlugin {
    var BoardSystem = require('./boardsystem');
    var PluginHelper = require('./pluginhelper');

    export function createRule(board: BoardSystem.Board, rule: MoveRule): BoardSystem.BaseRule {
        var newRule = < MoveRule > board.createRule('move');
        newRule.from = board.convertLocationsToIdString(rule.from);
        newRule.fromPosition = rule.fromPosition || BoardSystem.Position.Default;
        newRule.to = board.convertLocationsToIdString(rule.to);
        newRule.toPosition = rule.toPosition || BoardSystem.Position.Default;
        newRule.cards = board.convertCardsToIdString(rule.cards);
        newRule.where = rule.where || null;
        newRule.whereIndex = rule.whereIndex || -1;
        newRule.hint = rule.hint || '';
        newRule.quantity = rule.quantity || BoardSystem.Quantity.Exactly;
        newRule.count = rule.count || 1;
        newRule.user = rule.user || newRule.user;

        if (!newRule.to)
            BoardSystem._error('moveRule, unknown to location - ' + rule.to);

        if (!newRule.cards && !newRule.from)
            return BoardSystem._error('moveRule without from or cards - ' + rule);

        return newRule;
    }

    export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]): boolean {
        if (rule.type !== 'move')
            return false;

        var board = client.getBoard(),
            moveRule = < MoveRule > rule,
            fromList = board.queryLocations( < string > moveRule.from),
            toList = board.queryLocations( < string > moveRule.to),
            cardList = board.queryCards( < string > moveRule.cards);

        if (cardList.length === 0) {
            for (var i = 0; i < fromList.length; ++i)
                [].push.apply(cardList, fromList[i].getCards()); // concat cards
        }

        if (cardList.length === 0)
            return BoardSystem._error('moveRule no cards in the from location - ' + moveRule.from)

        // note: HTMLMove will be send commands via proxy.sendCommands(), the results list will be empty
        if (client instanceof BoardSystem.HTMLClient)
            new HTMLMove( < BoardSystem.HTMLClient > client, moveRule, cardList, fromList, toList);
        else
            buildValidMoves(client.getUser(), client.getBoard(), moveRule, cardList, fromList, toList, results);

        return true;
    }

    export function createResult(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): BoardSystem.BaseResult {
        if (command.type !== 'move')
            return undefined;

        var moveCommand = < MoveCommand > command,
            board = client.getBoard(),
            from = board.findLocationById(moveCommand.fromId),
            to = board.findLocationById(moveCommand.toId),
            card = board.findCardById(moveCommand.cardId);

        if (!from && card)
            from = card.location;

        return <MoveResult > {
            from: from,
            to: to,
            card: card,
            index: moveCommand.index
        };
    }

    export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
        if (command.type !== 'move')
            return false;

        var moveCommand = < MoveCommand > command,
            board = client.getBoard(),
            from = board.findLocationById(moveCommand.fromId),
            to = board.findLocationById(moveCommand.toId),
            card = board.findCardById(moveCommand.cardId);

        to.insertCard(card, moveCommand.index);

        var mapping = client.getMapping();
        if (!mapping)
            return true; // command understood but no mapping features

        var cardElem = mapping.getElemFromCardId(moveCommand.cardId),
            fromElem = mapping.getElemFromLocationId(moveCommand.fromId),
            toElem = mapping.getElemFromLocationId(moveCommand.toId);

        if (fromElem) {
            var event: CustomEvent = new( < any > CustomEvent)('removeCard', {
                bubbles: true,
                cancelable: true,
                detail: {
                    cardElem: cardElem
                }
            });
            fromElem.dispatchEvent(event);
        }

        if (toElem) {
            var event: CustomEvent = new( < any > CustomEvent)('addCard', {
                bubbles: true,
                cancelable: true,
                detail: {
                    cardElem: cardElem
                }
            });
            toElem.dispatchEvent(event);
        }

        if (toElem && toElem.hasAttribute('count'))
            toElem.setAttribute('count', toElem.children.length.toString());

        if (fromElem && fromElem.hasAttribute('count'))
            fromElem.setAttribute('count', fromElem.children.length.toString());

        if (toElem && cardElem)
            toElem.appendChild(cardElem);
    }

    function buildValidMoves(user: string,
        board: BoardSystem.Board,
        moveRule: MoveRule,
        cardList: BoardSystem.Card[],
        fromList: BoardSystem.Location[],
        toList: BoardSystem.Location[],
        results: any[]) {

        var i = 0,
            maxCards = cardList.length;

        if (moveRule.quantity === BoardSystem.Quantity.All)
            i = maxCards;

        for (; i <= maxCards; ++i) {
            if (moveRule.quantity !== BoardSystem.Quantity.All &&
                !PluginHelper.isCountComplete(moveRule.quantity, moveRule.count, i))
                continue; // number of cards does not suit the quantity in the rule

            var indices = []; // list is the 'to' for each card (there are 'i' cards)
            for (var j = 0; j < i; ++j)
                indices.push(0);

            do {
                var cards = [], // cards to push for this round
                    useAllCards = false;

                switch (moveRule.fromPosition) {
                    case BoardSystem.Position.Default:
                    case BoardSystem.Position.Top:
                        // can only take the top 'i' cards
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;

                    case BoardSystem.Position.Bottom:
                        // can only take the bottom 'i' cards
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[maxCards - i + j]);
                        break;

                    case BoardSystem.Position.Random:
                        // can take cards from anywhere, so all cards are available.
                        // start with the first 'i' cards then iterate over the combinations
                        useAllCards = true;
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;
                }

                do {
                    var commands: BoardSystem.BaseCommand[] = [];

                    // TODO, run where clause, don't push batch if where fails
                    for (var j = 0; j < i; ++j) {
                        var card = cards[j],
                            to = toList[indices[j]];

                        commands.push({
                            type: 'move',
                            cardId: card.id,
                            fromId: (card.location ? card.location.id : -1),
                            toId: to.id,
                            index: -1 // TODO iterate over the indices
                        });
                    }

                    results.push(commands);

                } while (useAllCards && PluginHelper.nextCombination(cards, cardList));

            } while (PluginHelper.nextGrayCode(indices, toList.length - 1));
        }
    }

    class HTMLMove {
        private lastRuleId: number = 0;
        private CLASS_HIGHLIGHT: string = 'highlight';
        private fromInteract: Interact;
        private toInteract: Interact;
        private mapping: BoardSystem.HTMLMapping;
        private board: BoardSystem.Board;
        private transformKeyword: string = 'transform';
        private highlightElems: HTMLElement[] = [];

        constructor(private client: BoardSystem.HTMLClient,
            moveRule: MoveRule,
            cardList: BoardSystem.Card[],
            fromList: BoardSystem.Location[],
            toList: BoardSystem.Location[]) {

            this.mapping = client.getMapping();
            this.board = client.getBoard();
            this.client = client;

            var style = this.mapping.getBoardElem().style;
            if ('webkitTransform' in style)
                this.transformKeyword = 'webkitTransform';
            else if ('MozTransform' in style)
                this.transformKeyword = 'MozTransform';

            this.setup();
            this.resolveMove(moveRule, cardList, fromList, toList);
        }

        private translate(target: HTMLElement, dx: number, dy: number, absolute = false) {
            target['dx'] = (absolute ? 0 : target['dx'] || 0) + dx;
            target['dy'] = (absolute ? 0 : target['dy'] || 0) + dy;

            var sTranslate = 'translate(' + target['dx'] + 'px, ' + target['dy'] + 'px)';

            target.style[this.transformKeyword] = sTranslate;
        }

        setup() {
            // setup the board
            var self = this;

            // add functionality
            var moving = [],
                isDropped = false;

            this.fromInteract = interact(null)
                .disable()
                .moveable()
                .on('move', function(e) {
                    e.currentTarget.style.zIndex = '1';
                    self.translate(e.currentTarget, e.detail.dx, e.detail.dy);

                    var i = moving.indexOf(e.currentTarget);
                    if (i === -1)
                        moving.push(e.currentTarget);
                })
                .on('moveend', function(e) {
                    var i = moving.indexOf(e.currentTarget);
                    if (i !== -1) {
                        moving.splice(i, 1);
                        self.translate(e.currentTarget, 0, 0, true);
                        e.currentTarget.style.zIndex = '';
                    }
                    if (isDropped)
                        self.fromInteract.disable();
                })

            this.toInteract = interact(null)
                .disable()
                .dropzone('.card')
                .on('dropactivate', function(e) {
                    e.currentTarget.classList.add('highlight');
                })
                .on('dropdeactivate', function(e) {
                    e.currentTarget.classList.remove('highlight')
                })
                .on('drop', function(e) {
                    var dragCard = e.detail.dragTarget;
                    self.clearHighlights();

                    var commands: BoardSystem.BaseCommand[] = [{
                        type: 'move',
                        cardId: self.mapping.getCardFromElem(dragCard).id,
                        fromId: self.mapping.getLocationFromElem(dragCard.parentNode).id,
                        toId: self.mapping.getLocationFromElem(e.currentTarget).id,
                        index: -1
                    }];

                    self.client.sendUserCommands(self.lastRuleId, commands);
                    self.toInteract.disable();
                    isDropped = true;
                });
        }

        resolveMove(moveRule: MoveRule, cardList: BoardSystem.Card[], fromLocations: BoardSystem.Location[], toLocations: BoardSystem.Location[]) {
            this.lastRuleId = moveRule.id;

            if (toLocations.length === 0)
                return; // move not supported for this user

            var self = this;
            if (fromLocations.length === 0) {
                var cardElems = this.mapping.getElemsFromCards(cardList);

                this.fromInteract.setElements(cardElems)
                    .enable()
                    .off('movestart') // clear old movestart calls
                    .on('movestart', function(e) {
                        // match the target's parent to get the fromElement, and then the fromLocation
                        var j = cardElems.indexOf(e.currentTarget);
                        if (j !== -1)
                            var card = cardList[j];

                        if (card) {
                            // bind where to the starting 'from' location, so we filter on 'to'
                            var validLocations = toLocations;

                            // TODO where option
                            // if (moveRule.where)
                            //     validLocations = toLocations.filter(moveRule.where.bind(fromLocation));

                            var validLocationElems = [];
                            for (var i = 0; i < validLocations.length; ++i) {
                                var element = self.mapping.getElemFromLocationId(validLocations[i].id);
                                validLocationElems.push(element);
                                self.addHighlight(element);
                            }

                            self.toInteract.setElements(validLocationElems).enable();
                        }
                    });

                return;
            }

            var fromElements = [];
            for (var i = 0; i < fromLocations.length; ++i) {
                var fromLocation = fromLocations[i];
                var element = this.mapping.getElemFromLocationId(fromLocation.id);
                this.addHighlight(element);
                fromElements.push(element); // may push null
            }

            this.fromInteract.setElements('.' + this.CLASS_HIGHLIGHT + ' > .card')
                .enable()
                .off('movestart') // clear old movestart calls
                .on('movestart', function(e) {
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
                            self.addHighlight(element);
                        }

                        self.toInteract.setElements(validLocationElems).enable();
                    }
                });
        }

        private addHighlight(element: HTMLElement) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
        }

        private clearHighlights() {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
            }

            this.highlightElems = [];
        }
    }
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.move = MovePlugin;
