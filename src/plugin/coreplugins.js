
var logElem = null;
var log = function (msg) {
    if (!logElem) {
        logElem = document.getElementById('log');
        if (!logElem)
            return;
    }

    msg += "<br/>" + logElem.innerHTML;
    logElem.innerHTML = msg.substr(0, 1000);
};

var Interact = (function () {
    function Interact(selectorOrElems, options) {
        this.id = Interact.selfId++;
        this.elems = [];
        this.touches = [];
        this.mouseDownHandler = this.onMouseDown.bind(this);
        this.mouseMoveHandler = this.onMouseMove.bind(this);
        this.mouseUpHandler = this.onMouseUp.bind(this);
        this.touchStartHandler = this.onTouchStart.bind(this);
        this.touchMoveHandler = this.onTouchMove.bind(this);
        this.touchEndHandler = this.onTouchEnd.bind(this);
        this.mouseTarget = null;
        this.touchTargets = [];
        this.dragTarget = null;
        this.parentObserver = null;
        this.selector = '';
        this.reParent = /^(.+) *> *([A-Za-z0-9_#\.]+?)$/;
        this.reDescendant = /^(.+) +([A-Za-z0-9_#\.]+?)$/;
        this.onEvents = [];
        this.onFuncs = [];
        this._autoRebuildElements = true;
        this._doubleClickDelay = 250;
        this._doubleClickDistance = 20;
        this._swipeDistance = 100;
        this._holdDistance = 20;
        this._holdDelay = 1000;
        this._bubbles = false;
        this._moveable = false;
        this._swipeable = false;
        this._tappable = false;
        this._holdable = false;
        this._doubletappable = false;
        this._debug = false;
        this._dropzone = '';
        this._enable = true;
        this.setOptions(options);
        this.setElements(selectorOrElems);
    }
    Interact.prototype.autoRebuildElements = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._autoRebuildElements = value;
        if (!value && this.parentObserver)
            this.parentObserver.disconnect();

        return this;
    };

    Interact.prototype.debug = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._debug = value;
        return this;
    };

    Interact.prototype.swipeable = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._swipeable = value;
        return this;
    };

    Interact.prototype.moveable = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._moveable = value;
        return this;
    };

    Interact.prototype.tappable = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._tappable = value;
        return this;
    };

    Interact.prototype.doubletappable = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._doubletappable = value;
        return this;
    };

    Interact.prototype.holdable = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._holdable = value;
        return this;
    };

    Interact.prototype.dropzone = function (accept) {
        this.disableDropZone();
        this._dropzone = accept;
        this.enableDropZone();

        return this;
    };

    Interact.prototype.disableDropZone = function () {
        // TODO should we send leave events?
        var i = Interact.dropList.indexOf(this);
        if (i !== -1)
            Interact.dropList.splice(i, 1);

        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var dropList = Interact.activeDropList[i];
            if (dropList.dropZone = this) {
                this.deactivateDropZone(dropList.dragTarget); // this will remove us from the activeDropList
                break;
            }
        }
    };

    Interact.prototype.enableDropZone = function () {
        if (!this._enable)
            return;

        if (this._dropzone)
            Interact.dropList.push(this);
    };

    Interact.prototype.bubbles = function (value) {
        if (typeof value === 'undefined')
            value = true;

        this._bubbles = value;
        return this;
    };

    Interact.prototype.doubleClickDelay = function (value) {
        this._doubleClickDelay = value;
        return this;
    };

    Interact.prototype.doubleClickDistance = function (value) {
        this._doubleClickDistance = value;
        return this;
    };

    Interact.prototype.swipeDistance = function (value) {
        this._swipeDistance = value;
        return this;
    };

    Interact.prototype.holdDistance = function (value) {
        this._holdDistance = value;
        return this;
    };

    Interact.prototype.holdDelay = function (value) {
        this._holdDelay = value;
        return this;
    };

    Interact.prototype.disable = function () {
        if (!this._enable)
            return this;

        this.disableDropZone();

        for (var i = 0; i < this.elems.length; ++i)
            this.disableElement(this.elems[i]);

        document.body.removeEventListener('mouseup', this.mouseUpHandler);
        document.body.removeEventListener('mousemove', this.mouseMoveHandler);

        document.removeEventListener('touchend', this.touchEndHandler);
        document.removeEventListener('touchmove', this.touchMoveHandler);

        this.touches = [];
        this.selector = '';
        this.touchTargets = [];
        this.mouseTarget = null;
        this._enable = false;

        if (this.parentObserver)
            this.parentObserver.disconnect();

        // keep the events, they will be re-applied when enabled
        // this.onEvents = [];
        // this.onFuncs = [];
        return this;
    };

    Interact.prototype.enable = function () {
        if (this._enable)
            return this;
        this._enable = true;

        for (var i = 0; i < this.elems.length; ++i)
            this.enableElement(this.elems[i]);

        this.enableDropZone();

        return this;
    };

    Interact.prototype.disableElement = function (elem) {
        if (!this._enable)
            return;

        if (!(elem instanceof Element))
            return;

        elem.removeEventListener('mousedown', this.mouseDownHandler);
        elem.removeEventListener('touchstart', this.touchStartHandler);

        for (var i = 0; i < this.onEvents.length; ++i) {
            var eventList = this.onEvents[i].split(' ');
            for (var j = 0; j < eventList.length; ++j)
                elem.removeEventListener(eventList[j], this.onFuncs[i]);
        }
    };

    Interact.prototype.enableElement = function (elem) {
        if (!this._enable)
            return;

        if (!(elem instanceof Element))
            return;

        elem.addEventListener('mousedown', this.mouseDownHandler);
        elem.addEventListener('touchstart', this.touchStartHandler);

        for (var i = 0; i < this.onEvents.length; ++i) {
            var eventList = this.onEvents[i].split(' ');
            for (var j = 0; j < eventList.length; ++j)
                elem.addEventListener(eventList[j], this.onFuncs[i]);
        }
    };

    Interact.prototype.setElements = function (selectorOrElems) {
        var newElems = [];

        if (selectorOrElems) {
            if (typeof selectorOrElems === 'string')
                newElems = [].slice.call(document.querySelectorAll(selectorOrElems));
            else if (selectorOrElems instanceof Element)
                newElems = [selectorOrElems];
            else if (typeof selectorOrElems === 'object' && 'length' in selectorOrElems)
                newElems = [].slice.call(selectorOrElems);
        }

        if (this._autoRebuildElements)
            this.watchReparenting(selectorOrElems);

        if (this._debug)
            console.log('# of matching elements: ' + newElems.length, selectorOrElems);

        for (var i = 0; i < newElems.length; ++i) {
            var elem = newElems[i];
            if (this.elems.indexOf(elem) === -1)
                this.enableElement(elem);
        }

        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (newElems.indexOf(elem) === -1)
                this.disableElement(elem);
        }

        this.elems = newElems;

        return this;
    };

    Interact.prototype.setOptions = function (options) {
        if (typeof options !== 'object')
            return this;

        for (var i in options) {
            var variable = '_' + i;
            if (variable in this)
                this[variable] = options[i];
        }

        return this;
    };

    // events - space separated list of event names
    // func - callback, information is in the .details of the first parameter
    Interact.prototype.on = function (events, func) {
        this.onEvents.push(events);
        this.onFuncs.push(func);

        var eventList = events.split(' ');
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            for (var j = 0; j < eventList.length; ++j)
                elem.addEventListener(eventList[j], func);
        }
        return this;
    };

    Interact.prototype.off = function (events, func) {
        var allFunc = !func;
        var eventList = events.split(' ');
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            for (var j = 0; j < eventList.length; ++j) {
                var event = eventList[j];

                for (var k = this.onEvents.length - 1; k >= 0; --k) {
                    if (this.onEvents[k] === event && (allFunc || func === this.onFuncs[k])) {
                        elem.removeEventListener(event, func);
                        this.onEvents.splice(k, 1);
                        this.onFuncs.splice(k, 1);
                    }
                }
            }
        }

        return this;
    };

    // mouse and touch
    Interact.prototype.onMouseDown = function (e) {
        e.preventDefault();

        this.mouseTarget = e.currentTarget; // e.target;
        this.pointerStart(0, this.mouseTarget, e.pageX, e.pageY, e.target);
        document.body.addEventListener('mousemove', this.mouseMoveHandler);
        document.body.addEventListener('mouseup', this.mouseUpHandler);
    };

    Interact.prototype.onMouseMove = function (e) {
        e.preventDefault();

        if (!this.mouseTarget)
            return;

        this.pointerMove(0, this.mouseTarget, e.pageX, e.pageY, e.target);
    };

    Interact.prototype.onMouseUp = function (e) {
        e.preventDefault();

        this.pointerEnd(0, this.mouseTarget, e.pageX, e.pageY, e.target);
        this.mouseTarget = null;
        document.body.removeEventListener('mouseup', this.mouseUpHandler);
        document.body.removeEventListener('mousemove', this.mouseMoveHandler);
    };

    Interact.prototype.onTouchStart = function (e) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        if (this.touchTargets.length === 0) {
            document.addEventListener('touchmove', this.touchMoveHandler);
            document.addEventListener('touchend', this.touchEndHandler);
        }

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i], touchTarget = this.getTouchById(touch.identifier);

            this.pointerStart(touch.identifier, e.currentTarget, touch.pageX, touch.pageY, touch.target);

            if (!touchTarget)
                this.touchTargets.push({
                    id: touch.identifier,
                    target: e.currentTarget
                });
        }
    };

    Interact.prototype.onTouchMove = function (e) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i], touchTarget = this.getTouchById(touch.identifier);

            if (touchTarget) {
                this.pointerMove(touch.identifier, touchTarget.target, touch.pageX, touch.pageY, touch.target);
            }
        }
    };

    Interact.prototype.onTouchEnd = function (e) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i], touchTarget = this.getTouchById(touch.identifier);

            if (touchTarget) {
                this.pointerEnd(touch.identifier, touchTarget.target, touch.pageX, touch.pageY, touch.target);

                var j = this.touchTargets.indexOf(touchTarget);
                if (j !== -1)
                    this.touchTargets.splice(j, 1);
            }
        }

        if (this.touchTargets.length === 0) {
            document.removeEventListener('touchend', this.touchEndHandler);
            document.removeEventListener('touchmove', this.touchMoveHandler);
        }
    };

    // generalised pointer functions
    Interact.prototype.pointerStart = function (id, target, x, y, rawTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (touchInfo) {
            var wasTouched = (touchInfo.touchId !== -1);
            touchInfo.touchId = id;
            touchInfo.lastX = x;
            touchInfo.lastY = y;

            if (wasTouched)
                return;
        }

        if (touchInfo) {
            // remove the event (holdTimer has already been disabled)
            var i = this.touches.indexOf(touchInfo);
            this.touches.splice(i, 1);

            var now = Date.now();
            if (this._doubletappable && touchInfo.time + this._doubleClickDelay > now && this.getDistance(touchInfo.x, touchInfo.y, x, y) < this._doubleClickDistance) {
                var event = this.newEvent('doubletap', {
                    x: touchInfo.x,
                    y: touchInfo.y,
                    duration: now - touchInfo.time,
                    tapTarget: touchInfo.originalTarget,
                    rawTarget: rawTarget
                });
                target.dispatchEvent(event);
                return;
            }
        }

        touchInfo = {
            id: Interact.uniqueId++,
            target: target,
            time: Date.now(),
            x: x,
            y: y,
            lastX: x,
            lastY: y,
            touchId: id,
            swiped: false,
            moved: false,
            originalTarget: target,
            dropzoneTarget: null,
            holdTimer: -1
        };
        if (this._holdable)
            touchInfo.holdTimer = window.setTimeout(this.holdExpired.bind(this), this._holdDelay, touchInfo);

        this.touches.push(touchInfo);

        if (this._tappable) {
            var event = this.newEvent('tap', {
                x: x,
                y: y,
                tapTarget: target,
                rawTarget: rawTarget
            });
            target.dispatchEvent(event);
        }

        if (this._moveable) {
            var event = this.newEvent('movestart', {
                x: x,
                y: y,
                moveTarget: touchInfo.originalTarget,
                rawTarget: rawTarget
            });
            target.dispatchEvent(event);

            for (var i = 0; i < Interact.dropList.length; ++i)
                Interact.dropList[i].activateDropZone(target);

            // this will generate dropenter events, if we are already over a dropzone
            this.evaluateDrag(touchInfo, target, x, y, rawTarget);
        }
    };

    Interact.prototype.pointerMove = function (id, target, x, y, rawTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (!touchInfo)
            return;

        if (id !== touchInfo.touchId)
            return;

        var distance = this.getDistance(touchInfo.x, touchInfo.y, x, y);
        if (touchInfo.holdTimer !== Interact.INVALID_TIMER && distance > this._holdDistance) {
            window.clearTimeout(touchInfo.holdTimer);
            touchInfo.holdTimer = Interact.INVALID_TIMER;
        }

        if (this._swipeable && !touchInfo.swiped && distance > this._swipeDistance) {
            var dx = touchInfo.x - x;
            var dy = touchInfo.y - y;
            var direction = "up";
            if (dx > dy && dx > 0)
                direction = "right";
            else if (dx < dy && dx < 0)
                direction = "left";
            else if (dy < dx && dy < 0)
                direction = "down";

            var event = this.newEvent('swipe', {
                x: x,
                y: y,
                dx: dx,
                dy: dy,
                direction: direction,
                swipeTarget: touchInfo.originalTarget,
                rawTarget: rawTarget
            });
            touchInfo.swiped = true;
            touchInfo.target.dispatchEvent(event);
        }

        if (this._moveable && (touchInfo.moved || distance > this._holdDistance)) {
            var event = this.newEvent('move', {
                x: x,
                y: y,
                dx: x - touchInfo.lastX,
                dy: y - touchInfo.lastY,
                moveTarget: touchInfo.originalTarget,
                rawTarget: rawTarget
            });
            touchInfo.moved = true;
            touchInfo.target.dispatchEvent(event);
        }

        if (this._moveable)
            this.evaluateDrag(touchInfo, target, x, y, rawTarget);

        touchInfo.lastX = x;
        touchInfo.lastY = y;
    };

    Interact.prototype.pointerEnd = function (id, target, x, y, rawTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (!touchInfo)
            return;

        if (touchInfo.touchId !== id)
            return;

        if (touchInfo.dropzoneTarget) {
            var event = this.newEvent('drop', {
                dragTarget: target
            });
            touchInfo.dropzoneTarget.dispatchEvent(event);

            var event = this.newEvent('dropleave', {
                dragTarget: target
            });
            touchInfo.dropzoneTarget.dispatchEvent(event);
            touchInfo.dropzoneTarget = null;
        }

        for (var i = 0; i < Interact.activeDropList.length; ++i)
            Interact.activeDropList[i].dropZone.deactivateDropZone(target);

        if (touchInfo.holdTimer !== Interact.INVALID_TIMER) {
            window.clearTimeout(touchInfo.holdTimer);
            touchInfo.holdTimer = Interact.INVALID_TIMER;
        }
        if (this._moveable) {
            var event = this.newEvent('moveend', {});
            touchInfo.moved = false;
            touchInfo.target.dispatchEvent(event);
        }

        touchInfo.swiped = false;
        touchInfo.touchId = -1;
    };

    // drag and drop
    // processed by dropzone interact, can be activated multiple times
    Interact.prototype.activateDropZone = function (target) {
        var parent = target.parentNode;
        var matchList = parent.querySelectorAll(this._dropzone);

        if ([].indexOf.call(matchList, target) !== -1) {
            var alreadyActivated = (Interact.getActiveDrop(this) !== null);

            Interact.activeDropList.push({
                dropZone: this,
                dragTarget: target
            });

            // a drop list can be activated multiple times, only send
            // the event on the first activate
            if (!alreadyActivated) {
                var event = this.newEvent('dropactivate', {
                    dragTarget: target
                });

                for (var i = 0; i < this.elems.length; ++i)
                    this.elems[i].dispatchEvent(event);
            }
        }
    };

    // processed by dropzone interact
    Interact.prototype.deactivateDropZone = function (target) {
        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var active = Interact.activeDropList[i];
            if (active.dropZone === this && active.dragTarget === target) {
                Interact.activeDropList.splice(i, 1);
                break;
            }
        }

        // a drop list can be de-activated multiple times, only send
        // and event on the last de-activate
        if (Interact.getActiveDrop(this) === null) {
            this.dragTarget = null;
            var event = this.newEvent('dropdeactivate', {
                dragTarget: target
            });

            for (var i = 0; i < this.elems.length; ++i)
                this.elems[i].dispatchEvent(event);
        }
    };

    // processed by drag interact
    Interact.prototype.evaluateDrag = function (touchInfo, target, x, y, rawTarget) {
        var overList = [];

        // convert x,y to client co-ords
        var cx = x - document.body.scrollLeft, cy = y - document.body.scrollTop;

        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var active = Interact.activeDropList[i], dropZone = active.dropZone, overlap = false;

            for (var j = 0; j < dropZone.elems.length; ++j) {
                var elem = dropZone.elems[j], rect = elem.getBoundingClientRect(), overlap = cx >= rect.left && cx <= rect.right && cy <= rect.bottom && cy >= rect.top;

                if (overlap)
                    overList.push(elem);
            }
        }

        var over = null;
        if (overList.length > 0) {
            overList.sort(Interact.renderSort);
            over = overList[0];
        }

        var details = {
            dragTarget: target,
            x: x,
            y: y,
            rawTarget: rawTarget
        };

        if (touchInfo.dropzoneTarget && over !== touchInfo.dropzoneTarget) {
            var event = this.newEvent('dropleave', details);
            touchInfo.dropzoneTarget.dispatchEvent(event);
        } else if (over && !touchInfo.dropzoneTarget) {
            var event = this.newEvent('dropenter', details);
            over.dispatchEvent(event);
        } else if (over && touchInfo.dropzoneTarget === over) {
            var event = this.newEvent('dropover', details);
            over.dispatchEvent(event);
        }

        touchInfo.dropzoneTarget = over;
    };

    // helper
    Interact.prototype.newEvent = function (name, detail) {
        if (this._debug)
            console.log('new event ' + name);

        return new CustomEvent(name, {
            bubbles: this._bubbles,
            cancelable: this._bubbles,
            detail: detail
        });
    };

    Interact.prototype.getDistance = function (x1, y1, x2, y2) {
        x2 -= x1;
        y2 -= y1;
        return Math.sqrt(x2 * x2 + y2 * y2);
    };

    Interact.prototype.getTouchInfo = function (target) {
        for (var i = 0; i < this.touches.length; ++i) {
            var click = this.touches[i];
            if (click.target === target) {
                return click;
            }
        }
        return null;
    };

    Interact.prototype.holdExpired = function (touchInfo) {
        var event = this.newEvent('hold', {
            x: touchInfo.x,
            y: touchInfo.y,
            holdTarget: touchInfo.originalTarget
        });
        touchInfo.target.dispatchEvent(event);
    };

    Interact.getLineage = function (child) {
        var ancestors = [child];

        do {
            ancestors.push(child);
            child = child.parentNode;
        } while(child && child !== document.body);

        return ancestors;
    };

    Interact.renderSort = function (a, b) {
        if (a === b)
            return 0;

        if ('zIndex' in a.style && 'zIndex' in b.style)
            return parseFloat(a.style.zIndex) - parseFloat(b.style.zIndex);

        var aLineage = Interact.getLineage(a);
        var bLineage = Interact.getLineage(b);
        var longestLine = Math.max(aLineage.length, bLineage.length);

        for (var i = 0; i < longestLine; ++i) {
            if (i === aLineage.length)
                return -1;
            else if (i === bLineage.length)
                return 1;
            else if (aLineage[i] === bLineage[i])
                continue;
            else if (i === 0)
                return 0;

            var common = aLineage[i - 1];
            var aChild = aLineage[i];
            var bChild = bLineage[i];

            for (var j = 0; j < common.children.length; ++j) {
                var child = common.children[i];
                if (aChild === child)
                    return -1;
                else if (bChild === child)
                    return -1;
            }

            console.error('invalid hierarchy');
            return 0;
        }
    };

    Interact.prototype.watchReparenting = function (selector) {
        if (typeof selector !== 'string')
            return;

        // stop watching old parents
        if (this.parentObserver)
            this.parentObserver.disconnect();

        this.selector = selector;
        var selectors = selector.split(',');
        for (var i = 0; i < selectors.length; ++i) {
            var result = this.reParent.exec(selectors[i]);
            if (!result)
                result = this.reDescendant.exec(selectors[i]);
            if (!result)
                continue;

            this.watchParent([].slice.call(document.querySelectorAll(result[1])));
        }
    };

    Interact.prototype.watchParent = function (elems) {
        if (!this.parentObserver)
            this.parentObserver = new MutationObserver(this.onMutation.bind(this));

        for (var i = 0; i < elems.length; ++i)
            this.parentObserver.observe(elems[i], {
                childList: true
            });
    };

    Interact.prototype.onMutation = function (mutations) {
        if (this._debug)
            console.log('parent of selector changed, rebuilding interact', this.selector);

        // child was added or removed, rebuild the selector list
        this.setElements(this.selector);
    };

    Interact.prototype.getTouchById = function (id) {
        for (var i = 0; i < this.touchTargets.length; ++i) {
            var touchTarget = this.touchTargets[i];
            if (touchTarget.id === id)
                return touchTarget;
        }
        return null;
    };

    Interact.getActiveDrop = function (dropZone) {
        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var active = Interact.activeDropList[i];
            if (active.dropZone === dropZone)
                return active;
        }
        return null;
    };
    Interact.INVALID_TIMER = -1;
    Interact.dropList = [];
    Interact.activeDropList = [];
    Interact.uniqueId = 1;
    Interact.selfId = 1;
    return Interact;
})();

function interact(selectorOrElems, options) {
    return new Interact(selectorOrElems, options);
}
/// <reference path='boardsystem.d.ts' />
/// <reference path='pluginhelper.d.ts' />
/// <reference path='interact.ts' />

var MovePlugin;
(function (MovePlugin) {
    var BoardSystem = require('./boardsystem');
    var PluginHelper = require('./pluginhelper');

    function createRule(board, rule) {
        var newRule = board.createRule('move');
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
            return BoardSystem._error('moveRule no cards in the from location - ' + moveRule.from);

        // note: HTMLMove will be send commands via proxy.sendCommands(), the results list will be empty
        if (client instanceof BoardSystem.HTMLClient)
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

    function updateClient(client, command) {
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
    MovePlugin.updateClient = updateClient;

    function buildValidMoves(user, board, moveRule, cardList, fromList, toList, results) {
        var i = 0, maxCards = cardList.length;

        if (moveRule.quantity === BoardSystem.Quantity.All)
            i = maxCards;

        for (; i <= maxCards; ++i) {
            if (moveRule.quantity !== BoardSystem.Quantity.All && !PluginHelper.isCountComplete(moveRule.quantity, moveRule.count, i))
                continue;

            var indices = [];
            for (var j = 0; j < i; ++j)
                indices.push(0);

            do {
                var cards = [], useAllCards = false;

                switch (moveRule.fromPosition) {
                    case BoardSystem.Position.Default:
                    case BoardSystem.Position.Top:
                        for (var j = 0; j < i; ++j)
                            cards.push(cardList[j]);
                        break;

                    case BoardSystem.Position.Bottom:
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
/// <reference path='boardsystem.d.ts' />

var SetPlugin;
(function (SetPlugin) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, setRule) {
        var ruleType = 'setVariable', key = setRule.key, keyArray = Array.isArray(key);

        var info = board.convertToIdString(key);
        switch (info.type) {
            case 'card':
                ruleType = 'setCardVariable';
                break;
            case 'location':
                ruleType = 'setLocationVariable';
                break;
            case 'region':
                ruleType = 'setRegionVariable';
                break;
        }

        // note 'affects' is set to the 'user', and 'user' is set to the default
        return BoardSystem.extend({
            key: info.value,
            value: setRule.value,
            affects: setRule.user || ''
        }, board.createRule(ruleType));
    }
    SetPlugin.createRule = createRule;

    // user the default performRule, which uses the rule as a command
    // export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: BoardSystem.BatchCommand[]) {
    function updateClient(client, command) {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return false;

        var mapping = client.getMapping(), setCommand = command, elems = [];

        if (!mapping)
            return true;

        if (setCommand.affects && BoardSystem.union(setCommand.affects, mapping.getUser()).length === 0)
            return;

        switch (command.type) {
            case 'setCardVariable':
                elems = mapping.getElemsFromCardIds(setCommand.key);
                break;

            case 'setLocationVariable':
                elems = mapping.getElemsFromLocationIds(setCommand.key);
                break;
        }

        for (var i = 0; i < elems.length; ++i)
            mapping.applyVariables(elems[i], setCommand.value);
    }
    SetPlugin.updateClient = updateClient;
})(SetPlugin || (SetPlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.set = SetPlugin;
/// <reference path='boardsystem.d.ts' />

var SetTemporaryPlugin;
(function (SetTemporaryPlugin) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, setTemporaryRule) {
        var type = 'setTemporaryCard', key = setTemporaryRule.key, keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            BoardSystem._error('key is an empty array');

        if (key instanceof BoardSystem.Card || (keyArray && key[0] instanceof BoardSystem.Card)) {
            type = 'setTemporaryCard';
            key = board.convertCardsToIdString(key);
        } else if (key instanceof BoardSystem.Location || (keyArray && key[0] instanceof BoardSystem.Location)) {
            type = 'setTemporaryLocation';
            key = board.convertLocationsToIdString(key);
        } else {
            BoardSystem._error('unknown type of key - ' + key);
        }

        return BoardSystem.extend({
            timeout: 1.0
        }, board.createRule(type), setTemporaryRule, {
            key: key
        });
    }
    SetTemporaryPlugin.createRule = createRule;

    function performRule(client, rule, results) {
        if (rule.type !== 'setTemporaryCard' && rule.type !== 'setTemporaryLocation')
            return false;

        // setTemporary does nothing on a non-HumanClient
        if (!(client instanceof BoardSystem.HTMLClient))
            return true;

        var setTemporaryRule = rule, board = client.getBoard(), mapping = client.getMapping(), oldVariables = [], things = [], elems = [];

        switch (rule.type) {
            case 'setTemporaryCard':
                things = board.queryCards(setTemporaryRule.key);
                elems = mapping.getElemsFromCards(things);
                break;

            case 'setTemporaryLocation':
                things = board.queryLocations(setTemporaryRule.key);
                elems = mapping.getElemsFromLocations(things);
                break;
        }

        for (var i = 0; i < elems.length; ++i) {
            oldVariables.push(mapping.copyVariables(elems[i], setTemporaryRule.value));
            mapping.applyVariables(elems[i], setTemporaryRule.value);
        }

        window.setTimeout(function () {
            for (var i = 0; i < elems.length; ++i)
                mapping.applyVariables(elems[i], oldVariables[i]);

            // tell the server to continue
            client.sendUserCommands(rule.id, []);
        }, setTemporaryRule.timeout * 1000);

        return true;
    }
    SetTemporaryPlugin.performRule = performRule;
})(SetTemporaryPlugin || (SetTemporaryPlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.setTemporary = SetTemporaryPlugin;
/// <reference path='boardsystem.d.ts' />
/// <reference path="seedrandom.d.ts" />

var ShufflePlugin;
(function (ShufflePlugin) {
    var BoardSystem = require('./boardsystem');
    require('./seedrandom');

    function createRule(board, shuffleRule) {
        return BoardSystem.extend({
            seed: shuffleRule.seed || Math.seedrandom(),
            location: board.convertLocationsToIdString(shuffleRule.location)
        }, board.createRule('shuffle'));
    }
    ShufflePlugin.createRule = createRule;

    function updateClient(client, command) {
        if (command.type !== 'shuffle')
            return false;

        var shuffleCommand = command, board = client.getBoard(), location = board.findLocationById(shuffleCommand.locationId);

        Math.seedrandom(shuffleCommand.seed);
        if (location)
            location.shuffle();

        return true;
    }
    ShufflePlugin.updateClient = updateClient;

    function performRule(client, rule, results) {
        if (rule.type !== 'shuffle')
            return false;

        var shuffleRule = rule;
        var location = client.getBoard().queryFirstLocation(shuffleRule.location);

        var commands = [{
                type: 'shuffle',
                seed: shuffleRule.seed,
                locationId: location ? location.id : 0
            }];
        results.push(commands);

        return true;
    }
    ShufflePlugin.performRule = performRule;
})(ShufflePlugin || (ShufflePlugin = {}));
;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.shuffle = ShufflePlugin;
/// <reference path='boardsystem.d.ts' />
/// <reference path='pluginhelper.d.ts' />

var PickPlugin;
(function (PickPlugin) {
    var BoardSystem = require('./boardsystem');
    var PluginHelper = require('./pluginhelper');

    function createRule(board, rule) {
        var type = '', list = rule.list;

        if (!list)
            BoardSystem._error('pickRule has no list');

        if (typeof list === 'string') {
            if (list === '')
                BoardSystem._error('pickRule list is an empty string');

            type = 'pick';
        } else if (Array.isArray(list)) {
            if (list.length === 0)
                BoardSystem._error('pickRule list is empty');

            var item = list[0];
            if (item instanceof BoardSystem.Location) {
                type = 'pickLocation';
                list = board.convertLocationsToIdString(list);
            } else if (item instanceof BoardSystem.Card) {
                type = 'pickCard';
                list = board.convertCardsToIdString(list);
            } else {
                type = 'pick';
            }
        } else {
            BoardSystem._error('pickRule list type is not a string or array - ' + list);
        }

        return BoardSystem.extend({
            list: '',
            quantity: BoardSystem.Quantity.Exactly,
            count: 1,
            where: null,
            whereIndex: -1
        }, board.createRule(type), rule, {
            list: list
        });
    }
    PickPlugin.createRule = createRule;

    // export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
    function createResult(client, command) {
        var pickCommand = command, board = client.getBoard();

        switch (command.type) {
            case 'pick':
                return {
                    values: pickCommand.values
                };

            case 'pickLocation':
                return {
                    values: board.queryLocations(pickCommand.values.join(','))
                };

            case 'pickCard':
                return {
                    values: board.queryCards(pickCommand.values.join(','))
                };
        }

        return undefined;
    }
    PickPlugin.createResult = createResult;

    // returns an array of valid BatchCommands
    function performRule(client, rule, results) {
        switch (rule.type) {
            case 'pick':
            case 'pickLocation':
            case 'pickCard':
                if (client instanceof BoardSystem.HTMLClient)
                    // don't build results, they will sent via Transport.sendCommand()
                    new HTMLPick(client, rule);
                else
                    findValidPickCommands(client.getBoard(), rule, results);
                return true;
        }

        return false;
    }
    PickPlugin.performRule = performRule;

    function findValidPickCommands(board, pickRule, results) {
        var where = pickRule.where || function () {
            return true;
        };

        var pickList = getPickList(board, pickRule), numPickList = pickList.length;

        for (var i = 0; i <= numPickList; ++i) {
            if (!PluginHelper.isCountComplete(pickRule.quantity, pickRule.count, i))
                continue;

            var indices = [];
            for (var j = 0; j < i; ++j)
                indices.push(j);

            var possibles = [];
            for (var j = 0; j < numPickList; ++j)
                possibles.push(j);

            do {
                var values = [];

                for (var k = 0; k < i; ++k) {
                    var pick = pickList[indices[k]];

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

                var commands = [{
                        type: pickRule.type,
                        values: values
                    }];
                results.push(commands);
            } while(PluginHelper.nextCombination(indices, possibles));
        }
    }

    function getPickList(board, pickRule) {
        var where = pickRule.where || function () {
            return true;
        };

        var list = [];
        var rawList = pickRule.list;
        if (typeof pickRule.list === 'string')
            rawList = pickRule.list.split(',');
        if (!Array.isArray(rawList))
            rawList = [rawList];

        switch (pickRule.type) {
            case 'pick':
                list = rawList;
                break;
            case 'pickLocation':
                list = board.queryLocations(rawList.join(','));
                break;
            case 'pickCard':
                list = board.queryCards(rawList.join(','));
                break;
        }

        return list.filter(where);
    }

    var HTMLPick = (function () {
        function HTMLPick(client, pickRule) {
            this.client = client;
            this.pickList = [];
            this.lastRuleId = 0;
            this.highlightElems = [];
            this.pickHandler = this.onPickLocation.bind(this);
            this.CLASS_HIGHLIGHT = 'highlight';
            this.board = client.getBoard();
            this.mapping = client.getMapping();
            this.pickType = pickRule.type;

            this.showHTMLPick(pickRule);
        }
        HTMLPick.prototype.createPickCommand = function (type, values) {
            return BoardSystem.extend({
                type: type,
                values: values
            });
        };

        HTMLPick.prototype.onPickLocation = function (e) {
            var thing = this.mapping.getThingFromElem(e.currentTarget);
            var i = this.pickList.indexOf(thing);
            if (i === -1)
                return;

            // TODO check the number of picks
            this.pickList = [];
            this.clearHighlights();

            var commands = [this.createPickCommand(this.pickType, [thing.id])];
            this.client.sendUserCommands(this.lastRuleId, commands);
        };

        HTMLPick.prototype.showHTMLPick = function (pickRule) {
            this.pickList = getPickList(this.board, pickRule);

            if (this.pickList.length === 0) {
                BoardSystem._error('no items in ' + pickRule.type + ' list - ' + pickRule.list + ', rule - ' + pickRule.where);
                return;
            }

            for (var i = 0; i < this.pickList.length; ++i) {
                var pick = this.pickList[i];

                switch (pickRule.type) {
                    case 'pick':
                        break;

                    case 'pickLocation':
                        var element = this.mapping.getElemFromLocationId(pick.id);
                        this.highlightElement(element);
                        break;

                    case 'pickCard':
                        var element = this.mapping.getElemFromCardId(pick.id);
                        this.highlightElement(element);
                        break;
                }
            }

            this.lastRuleId = pickRule.id;
        };

        HTMLPick.prototype.highlightElement = function (element) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
            element.addEventListener("click", this.pickHandler);
        };

        HTMLPick.prototype.clearHighlights = function () {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
                element.removeEventListener("click", this.pickHandler);
            }

            this.highlightElems = [];
        };
        return HTMLPick;
    })();
    PickPlugin.HTMLPick = HTMLPick;
})(PickPlugin || (PickPlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.pick = PickPlugin;
// var list = [0];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
// var list = [0, 1];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
// var list = [0, 1, 2];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
// var list = [0, 1, 2, 3];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
/// <reference path="boardsystem.d.ts" />

var SendMessagePlugin;
(function (SendMessagePlugin) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, rule) {
        return BoardSystem.extend({
            message: '',
            detail: {},
            bubbles: false
        }, board.createRule('sendMessage'), rule);
    }
    SendMessagePlugin.createRule = createRule;

    // use the default performRule, which converts the rule into a single command
    // performRule(client: BaseClient, rule: BaseRule, results: any[]): boolean {}
    // nothing to update on the board
    function updateClient(client, command) {
        if (command.type !== 'sendMessage')
            return;

        var sendMessageCommand = command, mapping = client.getMapping();

        if (!mapping)
            return;

        var event = new CustomEvent(sendMessageCommand.message, {
            bubbles: sendMessageCommand.bubbles,
            cancelable: sendMessageCommand.bubbles,
            detail: sendMessageCommand.detail
        });

        var boardElem = mapping.getBoardElem();
        boardElem.dispatchEvent(event);
    }
    SendMessagePlugin.updateClient = updateClient;
})(SendMessagePlugin || (SendMessagePlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    exports.sendMessage = SendMessagePlugin;
}
/// <reference path="boardsystem.d.ts" />

var LabelPlugin;
(function (LabelPlugin) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, rule) {
        var info = board.convertToIdString(rule.key);

        return BoardSystem.extend({
            key: '',
            labels: {},
            affects: rule.user || ''
        }, board.createRule('label'), rule, {
            key: info.value
        });
    }
    LabelPlugin.createRule = createRule;

    // LabelRule is the command, just pass it through
    // export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]): boolean
    function updateClient(client, command) {
        if (command.type !== 'label')
            return false;

        var labelCommand = command, mapping = client.getMapping();

        if (!mapping)
            return true;

        if (BoardSystem.union(labelCommand.affects, mapping.getUser()).length === 0)
            return true;

        var elems = mapping.getElemsFromIds(labelCommand.key);
        for (var i = 0; i < elems.length; ++i) {
            var elem = elems[i];

            for (var k in labelCommand.labels) {
                if (labelCommand.labels[k])
                    elem.classList.add(k);
                else
                    elem.classList.remove(k);
            }
        }
    }
    LabelPlugin.updateClient = updateClient;
})(LabelPlugin || (LabelPlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.label = LabelPlugin;
/// <reference path="boardsystem.d.ts" />

var DelayPlugin;
(function (DelayPlugin) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, delayRule) {
        // note: force user to be the default
        return BoardSystem.extend({
            seconds: delayRule.seconds || 10
        }, board.createRule('delay'));
    }
    DelayPlugin.createRule = createRule;

    function performRule(client, rule, results) {
        if (rule.type !== 'delay')
            return false;

        var delayRule = rule;
        setTimeout(function () {
            client.sendUserCommands(rule.id, []); // respond to the server after the delay has expired
        }, delayRule.seconds * 1000);

        return true;
    }
    DelayPlugin.performRule = performRule;
})(DelayPlugin || (DelayPlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.delay = DelayPlugin;
/// <reference path="boardsystem.d.ts" />

var SwapModule;
(function (SwapModule) {
    var BoardSystem = require('./boardsystem');

    function createRule(board, rule) {
        // user is always BANK
        var fromString = board.convertLocationsToIdString(rule.from), toString = board.convertLocationsToIdString(rule.to);

        if (!fromString)
            BoardSystem._error('swap from is not a valid location - ' + rule.from);

        if (!toString)
            BoardSystem._error('swap to is not a valid location - ' + rule.to);

        if (fromString.split(',').length > 1)
            BoardSystem._error('swap can only move cards from a single location - ' + rule.from + ' - ids - ' + fromString);

        if (toString.split(',').length > 1)
            BoardSystem._error('swap can only move cards to a single location - ' + rule.to + ' - ids - ' + toString);

        return BoardSystem.extend(board.createRule('swap'), {
            from: fromString,
            to: toString
        });
    }
    SwapModule.createRule = createRule;

    // convert swap into move commands because the BANK has access to a complete board, but other
    // players may have imperfect knowledge.
    function performRule(client, rule, results) {
        if (rule.type !== 'swap')
            return;

        var board = client.getBoard(), swapRule = (rule), from = board.queryFirstLocation(swapRule.from), to = board.queryFirstLocation(swapRule.to);

        if (!from)
            BoardSystem._error('from is empty in swap');

        if (!to)
            BoardSystem._error('to is empty in swap');

        var fromCards = from.getCards(), toCards = to.getCards();

        if (fromCards.length === 0)
            BoardSystem._error('there are no cards to swap at this from location (id) - ' + swapRule.from);

        if (toCards.length === 0)
            BoardSystem._error('there are no cards to swap at this to location (id) - ' + swapRule.to);

        var commands = [], toId = parseInt(swapRule.to, 10), fromId = parseInt(swapRule.from, 10);

        for (var i = 0; i < fromCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: fromCards[i].id,
                fromId: fromId,
                toId: toId,
                index: -1
            });

        for (var i = 0; i < toCards.length; ++i)
            commands.push({
                type: 'move',
                cardId: toCards[i].id,
                fromId: toId,
                toId: fromId,
                index: -1
            });

        results.push(commands);

        return true;
    }
    SwapModule.performRule = performRule;
})(SwapModule || (SwapModule = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.swap = SwapModule;
/// <reference path="moveplugin.ts" />
/// <reference path="setplugin.ts" />
/// <reference path="settemporaryplugin.ts" />
/// <reference path="shuffleplugin.ts" />
/// <reference path="pickplugin.ts" />
/// <reference path="sendmessageplugin.ts" />
/// <reference path="labelplugin.ts" />
/// <reference path="delayplugin.ts" />
/// <reference path="swapplugin.ts" />
