/// <reference path='game.d.ts' />
/// <reference path='pluginhelper.d.ts' />
/// <reference path='interact.ts' />

var MovePlugin;
(function (MovePlugin) {
    var Game = require('./game');
    var PluginHelper = require('./pluginhelper');

    function createRule(board, rule) {
        var newRule = board.createRule('move');
        newRule.from = board.convertLocationsToIdString(rule.from);
        newRule.fromPosition = rule.fromPosition || Game.Position.Default;
        newRule.to = board.convertLocationsToIdString(rule.to);
        newRule.toPosition = rule.toPosition || Game.Position.Default;
        newRule.cards = board.convertCardsToIdString(rule.cards);
        newRule.where = rule.where || null;
        newRule.whereIndex = rule.whereIndex || -1;
        newRule.hint = rule.hint || '';
        newRule.quantity = rule.quantity || Game.Quantity.Exactly;
        newRule.count = rule.count || 1;
        newRule.user = rule.user || newRule.user;

        if (!newRule.to)
            Game._error('moveRule, unknown to location - ' + rule.to);

        if (!newRule.cards && !newRule.from)
            return Game._error('moveRule without from or cards - ' + rule);

        return newRule;
    }
    MovePlugin.createRule = createRule;

    function performRule(client, rule, results) {
        if (rule.type !== 'move')
            return false;

        var board = client.getBoard(), moveRule = rule, fromList = board.queryLocations(moveRule.from), toList = board.queryLocations(moveRule.to), cardList = board.queryCards(moveRule.cards);

        if (cardList.length === 0) {
            for (var i = 0; i < fromList.length; ++i)
                [].push.apply(cardList, fromList[i].getCards()); // concat cards
        }

        if (cardList.length === 0)
            return Game._error('moveRule no cards in the from location - ' + moveRule.from);

        // note: HTMLMove will be send commands via proxy.sendCommands(), the results list will be empty
        if (client instanceof Game.HTMLClient)
            new HTMLMove(client, moveRule, cardList, fromList, toList);
        else
            buildValidMoves(client.getUser(), client.getBoard(), moveRule, cardList, fromList, toList, results);

        return true;
    }
    MovePlugin.performRule = performRule;

    function createResult(client, command) {
        if (command.type !== 'move')
            return undefined;

        var moveCommand = command, board = client.getBoard(), from = board.findLocationById(moveCommand.fromId), to = board.findLocationById(moveCommand.toId), card = board.findCardById(moveCommand.cardId);

        if (!from && card)
            from = card.location;

        return {
            from: from,
            to: to,
            card: card,
            index: moveCommand.index
        };
    }
    MovePlugin.createResult = createResult;

    function updateBoard(client, command, results) {
        if (command.type !== 'move')
            return false;

        var moveCommand = command, board = client.getBoard(), from = board.findLocationById(moveCommand.fromId), to = board.findLocationById(moveCommand.toId), card = board.findCardById(moveCommand.cardId);

        to.insertCard(card, moveCommand.index);

        var mapping = client.getMapping();
        if (!mapping)
            return true;

        var cardElem = mapping.getElemFromCardId(moveCommand.cardId), fromElem = mapping.getElemFromLocationId(moveCommand.fromId), toElem = mapping.getElemFromLocationId(moveCommand.toId);

        if (fromElem) {
            var event = new CustomEvent('removeCard', {
                bubbles: true,
                cancelable: true,
                detail: {
                    cardElem: cardElem
                }
            });
            fromElem.dispatchEvent(event);
        }

        if (toElem) {
            var event = new CustomEvent('addCard', {
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
    MovePlugin.updateBoard = updateBoard;

    function buildValidMoves(user, board, moveRule, cardList, fromList, toList, results) {
        var i = 0, maxCards = cardList.length;

        if (moveRule.quantity === Game.Quantity.All)
            i = maxCards;

        for (; i <= maxCards; ++i) {
            if (moveRule.quantity !== Game.Quantity.All && !PluginHelper.isCountComplete(moveRule.quantity, moveRule.count, i))
                continue;

            var indices = [];
            for (var j = 0; j < i; ++j)
                indices.push(0);

            do {
                var cards = [], useAllCards = false;

                switch (moveRule.fromPosition) {
                    case Game.Position.Default:
                    case Game.Position.Top:
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;

                    case Game.Position.Bottom:
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
                    var commands = [];

                    for (var j = 0; j < i; ++j) {
                        var card = cards[j], to = toList[indices[j]];

                        commands.push({
                            type: 'move',
                            cardId: card.id,
                            fromId: (card.location ? card.location.id : -1),
                            toId: to.id,
                            index: -1
                        });
                    }

                    results.push(commands);
                } while(useAllCards && PluginHelper.nextCombination(cards, cardList));
            } while(PluginHelper.nextGrayCode(indices, toList.length - 1));
        }
    }

    var HTMLMove = (function () {
        function HTMLMove(client, moveRule, cardList, fromList, toList) {
            this.client = client;
            this.lastRuleId = 0;
            this.CLASS_HIGHLIGHT = 'highlight';
            this.transformKeyword = 'transform';
            this.highlightElems = [];
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
        HTMLMove.prototype.translate = function (target, dx, dy, absolute) {
            if (typeof absolute === "undefined") { absolute = false; }
            target['dx'] = (absolute ? 0 : target['dx'] || 0) + dx;
            target['dy'] = (absolute ? 0 : target['dy'] || 0) + dy;

            var sTranslate = 'translate(' + target['dx'] + 'px, ' + target['dy'] + 'px)';

            target.style[this.transformKeyword] = sTranslate;
        };

        HTMLMove.prototype.setup = function () {
            // setup the board
            var self = this;

            // add functionality
            var moving = [], isDropped = false;

            this.fromInteract = interact(null).disable().moveable().on('move', function (e) {
                e.currentTarget.style.zIndex = '1';
                self.translate(e.currentTarget, e.detail.dx, e.detail.dy);

                var i = moving.indexOf(e.currentTarget);
                if (i === -1)
                    moving.push(e.currentTarget);
            }).on('moveend', function (e) {
                var i = moving.indexOf(e.currentTarget);
                if (i !== -1) {
                    moving.splice(i, 1);
                    self.translate(e.currentTarget, 0, 0, true);
                    e.currentTarget.style.zIndex = '';
                }
                if (isDropped)
                    self.fromInteract.disable();
            });

            this.toInteract = interact(null).disable().dropzone('.card').on('dropactivate', function (e) {
                e.currentTarget.classList.add('highlight');
            }).on('dropdeactivate', function (e) {
                e.currentTarget.classList.remove('highlight');
            }).on('drop', function (e) {
                var dragCard = e.detail.dragTarget;
                self.clearHighlights();

                var commands = [{
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
        };

        HTMLMove.prototype.resolveMove = function (moveRule, cardList, fromLocations, toLocations) {
            this.lastRuleId = moveRule.id;

            if (toLocations.length === 0)
                return;

            var self = this;
            if (fromLocations.length === 0) {
                var cardElems = this.mapping.getElemsFromCards(cardList);

                this.fromInteract.setElements(cardElems).enable().off('movestart').on('movestart', function (e) {
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

            this.fromInteract.setElements('.' + this.CLASS_HIGHLIGHT + ' > .card').enable().off('movestart').on('movestart', function (e) {
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
        };

        HTMLMove.prototype.addHighlight = function (element) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
        };

        HTMLMove.prototype.clearHighlights = function () {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
            }

            this.highlightElems = [];
        };
        return HTMLMove;
    })();
})(MovePlugin || (MovePlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.move = MovePlugin;
