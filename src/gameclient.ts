/// <reference path="_dependencies.ts" />

module Game {
    var CLASS_HIGHLIGHT = 'highlight';

    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    //-------------------------------
    export class Client implements ProxyListener {
        board: Board = new Board();
        showMoves: boolean = true;
        setupFunc: (board: Board) => void;
        whereList: any[];
        proxy: BaseProxy = null;

        constructor() {}

        setProxy(proxy: BaseProxy) {
            this.proxy = proxy;
        }

        getProxy(): BaseProxy {
            return this.proxy;
        }

            setup() {
            this.setupFunc(this.board);
        }

            setLocalVariable(name: string, value: any) {
            this.board.setLocalVariable(name, value);
        }

            onResolveRule(rule: BaseRule): BatchCommand {
            var batch = {
                ruleId: rule.id,
                commands: []
            };
            switch (rule.type) {
                case 'move':
                    return this.resolveMove( < MoveRule > rule);
                case 'pick':
                case 'pickLocation':
                case 'pickCard':
                    return this.resolvePick( < PickRule > rule);
                case 'setVariable':
                    var setRule = < SetRule > rule;
                    batch.commands.push({
                        type: 'setVariable',
                        name: setRule.name,
                        value: setRule.value
                    });
                    return batch;
            }

            return batch;
        }

            resolveMove(rule: MoveRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };;
        }

            resolvePick(rule: PickRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };;
        }

            isCountComplete(quantity: Quantity, count: number, value: number): boolean {
            switch (quantity) {
                case Quantity.All:
                    return false; // all must be accounted for elsewhere
                case Quantity.Exactly:
                    return value === count;
                case Quantity.AtMost:
                    return value <= count;
                case Quantity.AtLeast:
                    return value >= count;
                case Quantity.MoreThan:
                    return value > count;
                case Quantity.LessThan:
                    return value < count;
            }
            return false;
        }

            onUpdateCommands(batch: BatchCommand) {
            for (var i = 0; i < batch.commands.length; ++i)
                this.board.performCommand(batch.commands[i]);
        }
    }


    //-------------------------------
    export class BankClient extends Client {

        resolveMove(moveRule: MoveRule): BatchCommand {
            var where: any = moveRule.where || function() {
                    return true;
                }
                // note: can only restrict where of 'to' locations, once from is defined
            var fromLocations = this.board.queryLocations(moveRule.from).filter(function(from) {
                return where(from, null);
            });
            var toLocations = this.board.queryLocations(moveRule.to);
            var cards = this.board.queryCards(moveRule.cards);
            var maxCards = this.board.getNumCards();
            var batch = {
                ruleId: moveRule.id,
                commands: []
            };
            var cardIndex = 0;

            if (toLocations.length === 0) {
                _error('invlaid too location - ' + moveRule.to);
                return batch;
            }

            if (fromLocations.length === 0 && cards.length === 0) {
                _error('invlaid from location, and no cards - ' + moveRule.from);
                return batch;
            }

            for (var i = 0; i < maxCards; ++i) {
                var from = getRandom(fromLocations);
                var to = getRandom(toLocations);
                if (!where(from, to))
                    continue; // try another from,to location combination

                var card: Card = null;
                if (from) {
                    card = from.getCard(moveRule.fromPosition);
                } else {
                    var k = ~~(Math.random() * cards.length);
                    card = cards[k];
                    cards.splice(k, 1);
                }
                if (!card)
                    break; // no cards at this location, or no cards remaining

                var index = to.addCard(card, moveRule.toPosition);

                var moveCommand = {
                    type: moveRule.type,
                    id: moveRule.id,
                    cardId: card.id,
                    toId: to.id,
                    index: index
                };
                batch.commands.push(moveCommand);

                if (this.isCountComplete(moveRule.quantity, moveRule.count, batch.commands.length))
                    break; // sufficient cards

                if (fromLocations.length === 0 && cards.length === 0)
                    break; // used all of the cards
            }

            return batch;
        }


        resolvePick(pickRule: PickRule): BatchCommand {
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

            var pickList = list.filter(where);
            var values = [];

            while (pickList.length > 0 && !this.isCountComplete(pickRule.quantity, pickRule.count, values.length)) {
                var k = ~~(Math.random() * pickList.length);
                var pick = pickList[k];
                pickList.splice(k, 1); // if no duplicates

                // use name and id because the location structures on this client will be
                // different from the location structurs on other clients, or on the server
                switch (pickRule.type) {
                    case 'pick':
                        values.push(pick);
                        break;
                    case 'pickLocation':
                        values.push(pick.name);
                        break;
                    case 'pickCard':
                        values.push(pick.id);
                        break;
                }
            }

            return {
                ruleId: pickRule.id,
                commands: [{
                    type: pickRule.type,
                    values: values
                }]
            };
        }

    }

    //-------------------------------
    var thisComputerRuleId = -1;

    export class HumanClient extends Client {
        pickList: any[] = [];
        lastRuleId: number = -1;
        pauseEvents: boolean = false;

        locationElem: {
            [key: number]: HTMLElement;
        } = {};
        cardElem: {
            [key: number]: HTMLElement;
        } = {};

        constructor(public boardElem: HTMLElement, public user: string) {
            super();
        }

        private onClickLocation(location: Location) {
            if (this.board.getVariable('currentPlayer') !== this.user)
                return;

            var i = this.pickList.indexOf(location);
            if (i === -1)
                return;

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

        setup() {
            super.setup();

            var self = this;
            this.board.getLocations().forEach(function(location) {
                var element = < HTMLElement > (self.boardElem.querySelector('[name="' + location.name + '"]'));
                if (element) {
                    self.locationElem[location.id] = element;
                    element.addEventListener('click', self.onClickLocation.bind(self, location));
                }
            });

            this.board.getCards().forEach(function(card) {
                self.cardElem[card.id] = < HTMLElement > (self.boardElem.querySelector('[id="' + card.id + '"]'));
            });
        }

        resolvePick(pickRule: PickRule): BatchCommand {
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
                _error('no items in ' + pickRule.type + ' list - ' + pickRule.list + ', rule - ' + pickRule.where);
                return nullBatch;
            }

            for (var i = 0; i < this.pickList.length; ++i) {
                var pick = this.pickList[i];

                switch (pickRule.type) {
                    case 'pick':
                        break;

                    case 'pickLocation':
                        var element = this.locationElem[pick.id];
                        if (element)
                            element.classList.add(CLASS_HIGHLIGHT);
                        break;
                    case 'pickCard':
                        var element = this.locationElem[pick.id];
                        if (element)
                            element.classList.add(CLASS_HIGHLIGHT);
                        break;
                }
            }

            this.lastRuleId = pickRule.id;

            return nullBatch;
        }

            onUpdateCommands(batch: BatchCommand) {
            if (!batch || batch.commands.length === 0)
                return;

            var commands = batch.commands;
            var showEvents = !this.pauseEvents && batch.ruleId > thisComputerRuleId;

            for (var i = 0; i < commands.length; ++i) {
                var command = commands[i];
                if (command.type === 'move' && showEvents) {
                    var moveCommand = < MoveCommand > command;
                    var card: any = this.board.queryCards(moveCommand.cardId.toString());
                    card = (card.length > 0 ? card[0] : null);
                    var from = (card ? card.location : null);
                    var to: any = this.board.queryLocations(moveCommand.toId.toString());
                    to = (to.length > 0 ? to[0] : null);
                    var fromElem = (from ? this.locationElem[from.id] : null);
                    var toElem = (to ? this.locationElem[to.id] : null);
                    var cardElem = (card ? this.cardElem[card.id] : null);

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

                    if (toElem && cardElem)
                        toElem.appendChild(cardElem)

                    // have a global flag which tracks when any human client on this
                    // machine updates it's rule, so we don't dispatch the events multiple
                    // times
                    thisComputerRuleId = batch.ruleId;
                }

                this.board.performCommand(command);
            }
        }

            private clearHighlights() {
            for (var i in this.locationElem) {
                var element = this.locationElem[i];
                if (element)
                    element.classList.remove(CLASS_HIGHLIGHT);
            }

            for (var i in this.cardElem) {
                var element = this.cardElem[i];
                if (element)
                    element.classList.remove(CLASS_HIGHLIGHT);
            }
        }

            pollServer() {
            this.proxy.pollServer();
        }
    }

    //-------------------------------
    export class AIClient extends Client {

    }

}
