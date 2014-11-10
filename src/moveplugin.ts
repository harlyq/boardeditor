/// <reference path='_dependencies.ts' />
/// <reference path='htmlmapping.ts' />
/// <reference path='interact.ts' />
/// <reference path='pluginhelper.ts' />

interface MoveRule extends Game.BaseRule {
    from: any;
    fromPosition ? : Game.Position;
    to: any;
    toPosition ? : Game.Position;
    cards ? : string;
    where ? : (from: Location, to: Location) => boolean;
    whereIndex ? : number; // internal, use where instead
    hint ? : string;
    user ? : string;
    quantity ? : Game.Quantity;
    count ? : number;
}

interface MoveCommand extends Game.BaseCommand {
    cardId: number;
    fromId: number;
    toId: number;
    index: number;
}

module MovePlugin {

    export function createRule(board: Game.Board, rule: MoveRule): Game.BaseRule {
        return Game.extend({
            from: '',
            fromPosition: Game.Position.Default,
            to: '',
            toPosition: Game.Position.Default,
            cards: '',
            where: null,
            whereIndex: -1,
            hint: '',
            quantity: Game.Quantity.Exactly,
            count: 1
        }, board.createRule('move'), rule);
    }

    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]): boolean {
        if (rule.type !== 'move')
            return false;

        var board = client.getBoard(),
            moveRule = < MoveRule > rule,
            fromList = board.queryLocations(moveRule.from),
            toList = board.queryLocations(moveRule.to),
            cardList = board.queryCards(moveRule.cards);

        if (cardList.length === 0 && fromList.length === 0)
            return Game._error('moveRule without from or cards - ' + moveRule);

        if (cardList.length === 0) {
            for (var i = 0; i < fromList.length; ++i)
                [].push.apply(cardList, fromList[i].getCards()); // concat cards
        }

        if (toList.length === 0)
            return Game._error('moveRule has invalid to location - ' + moveRule.to);

        if (cardList.length === 0)
            return Game._error('moveRule no cards in the from location - ' + moveRule.from)

        // note: HTMLMove will be send commands via proxy.sendCommands(), the results list will be empty
        if (client instanceof Game.HumanClient)
            new HTMLMove( < Game.HumanClient > client, < MoveRule > rule, cardList, fromList, toList);
        else
            buildValidMoves(client.getUser(), client.getBoard(), < MoveRule > rule, cardList, fromList, toList, results);

        return true;
    }

    export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): boolean {
        if (command.type !== 'move')
            return false;

        var moveCommand = < MoveCommand > command;
        var from = board.findLocationById(moveCommand.fromId);
        var to = board.findLocationById(moveCommand.toId);
        var card = board.findCardById(moveCommand.cardId);
        to.insertCard(card, moveCommand.index);

        results.push({
            from: from,
            to: to,
            card: card,
            index: moveCommand.index
        });
        return true;
    }

    export function updateMapping(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {
        if (command.type !== 'move')
            return;

        var moveCommand = < MoveCommand > command,
            card = board.findCardById(moveCommand.cardId),
            to = board.findLocationById(moveCommand.toId),
            from = board.findLocationById(moveCommand.fromId),
            cardElem = mapping.getElemFromCardId(moveCommand.cardId),
            fromElem = mapping.getElemFromLocationId(moveCommand.fromId),
            toElem = mapping.getElemFromLocationId(moveCommand.toId);

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

        // apply
        if (cardElem && moveCommand.cardId > 0) {
            var deck = board.findDeckByCardId(moveCommand.cardId);
            //mapping.applyVariables(cardElem, deck.variables);
            mapping.applyVariables(cardElem, card.variables);
        }
    }

    function buildValidMoves(user: string,
        board: Game.Board,
        moveRule: MoveRule,
        cardList: Game.Card[],
        fromList: Game.Location[],
        toList: Game.Location[],
        results: Game.BatchCommand[]) {

        var i = 0,
            maxCards = cardList.length;

        if (moveRule.quantity === Game.Quantity.All)
            i = maxCards;

        for (; i <= maxCards; ++i) {
            if (moveRule.quantity !== Game.Quantity.All &&
                !PluginHelper.isCountComplete(moveRule.quantity, moveRule.count, i))
                continue; // number of cards does not suit the quantity in the rule

            var indices = []; // list is the 'to' for each card (there are 'i' cards)
            for (var j = 0; j < i; ++j)
                indices.push(0);

            do {
                var cards = [], // cards to push for this round
                    useAllCards = false;

                switch (moveRule.fromPosition) {
                    case Game.Position.Default:
                    case Game.Position.Top:
                        // can only take the top 'i' cards
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;

                    case Game.Position.Bottom:
                        // can only take the bottom 'i' cards
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[maxCards - i + j]);
                        break;

                    case Game.Position.Random:
                        // can take cards from anywhere, so all cards are available.
                        // start with the first 'i' cards then iterate over the combinations
                        useAllCards = true;
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;
                }

                do {
                    var batch: Game.BatchCommand = {
                        ruleId: moveRule.id,
                        commands: {}
                    };
                    batch.commands[user] = [];

                    // TODO, run where clause, don't push batch if where fails
                    for (var j = 0; j < i; ++j) {
                        var card = cards[j],
                            to = toList[indices[j]];

                        batch.commands[user].push({
                            type: 'move',
                            cardId: card.id,
                            fromId: (card.location ? card.location.id : -1),
                            toId: to.id,
                            index: -1 // TODO iterate over the indices
                        });
                    }

                    results.push(batch);

                } while (useAllCards && PluginHelper.nextCombination(cards, cardList));

            } while (PluginHelper.nextGrayCode(indices, toList.length - 1));
        }
    }

    class HTMLMove {
        lastRuleId: number = 0;
        CLASS_HIGHLIGHT: string = 'highlight';
        fromInteract: Interact;
        toInteract: Interact;
        mapping: Game.HTMLMapping;
        board: Game.Board;
        proxy: Game.BaseClientProxy;
        transformKeyword: string = 'transform';
        highlightElems: HTMLElement[] = [];
        user: string;

        constructor(client: Game.HumanClient,
            moveRule: MoveRule,
            cardList: Game.Card[],
            fromList: Game.Location[],
            toList: Game.Location[]) {

            this.user = client.getUser();
            this.mapping = client.getMapping();
            this.board = client.getBoard();
            this.proxy = client.getProxy();

            var style = client.boardElem.style;
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
            var moving = [];

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

                    var batch = Game.createBatchCommand(self.lastRuleId, self.user);
                    batch.commands[self.user] = [{
                        type: 'move',
                        cardId: self.mapping.getCardFromElem(dragCard).id,
                        fromId: self.mapping.getLocationFromElem(dragCard.parentNode).id,
                        toId: self.mapping.getLocationFromElem(e.currentTarget).id,
                        index: -1
                    }];

                    self.proxy.sendCommands(batch);
                    self.toInteract.disable();
                });
        }

        resolveMove(moveRule: MoveRule, cardList: Game.Card[], fromLocations: Game.Location[], toLocations: Game.Location[]) {
            this.lastRuleId = moveRule.id;

            if (fromLocations.length === 0)
                return; // card only moves not yet supported

            if (toLocations.length === 0)
                return; // move not supported for this user

            var fromElements = [];
            for (var i = 0; i < fromLocations.length; ++i) {
                var fromLocation = fromLocations[i];
                var element = this.mapping.getElemFromLocationId(fromLocation.id);
                this.addHighlight(element);
                fromElements.push(element); // may push null
            }

            var self = this;
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

Game.registerPlugin('move', {
    createRule: MovePlugin.createRule,
    performRule: MovePlugin.performRule,
    updateBoard: MovePlugin.updateBoard,
    updateMapping: MovePlugin.updateMapping
});
