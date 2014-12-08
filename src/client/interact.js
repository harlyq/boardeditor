
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
