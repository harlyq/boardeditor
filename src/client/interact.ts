interface Touch {
    identifier: number;
    screenX: number;
    screenY: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;
    target: Element;
}

interface TouchEvent extends Event {
    altKey: boolean;
    changedTouches: Touch[];
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    targetTouches: Touch[];
    touches: Touch[];
    type: string;
    target: Element;
}

// with multi-touch there can be multiple touches active at once
interface TouchInfo {
    id: number;
    target: EventTarget; // element with interact listeners
    time: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    touchId: number; // id of the last touch
    swiped: boolean;
    moved: boolean;
    originalTarget: EventTarget;
    holdTimer: number;
    dropzoneTarget: EventTarget;
}

interface InteractOptions {
    doubleClickDelay ? : number; // ms
    doubleClickDistance ? : number; // pixels
    swipeDistance ? : number; // pixels
    holdDistance ? : number; // pixels
    holdDelay ? : number; // ms
    bubbles ? : boolean;
    moveable ? : boolean;
    swipeable ? : boolean;
    tappable ? : boolean;
    holdable ? : boolean;
    doubletappable ? : boolean;
    dropzone ? : string;
}

interface InteractTouch {
    id: number;
    target: EventTarget;
}

interface DragInfo {
    dropZone: Interact;
    dragTarget: EventTarget;
}

var logElem = null;
var log = function(msg) {
    if (!logElem) {
        logElem = document.getElementById('log');
        if (!logElem)
            return;
    }

    msg += "<br/>" + logElem.innerHTML;
    logElem.innerHTML = msg.substr(0, 1000);
}

class Interact {
    private id: number = Interact.selfId++;
    private elems: Element[] = [];
    private touches: TouchInfo[] = [];
    private mouseDownHandler = this.onMouseDown.bind(this);
    private mouseMoveHandler = this.onMouseMove.bind(this);
    private mouseUpHandler = this.onMouseUp.bind(this);
    private touchStartHandler = this.onTouchStart.bind(this);
    private touchMoveHandler = this.onTouchMove.bind(this);
    private touchEndHandler = this.onTouchEnd.bind(this);
    private mouseTarget: EventTarget = null;
    private touchTargets: InteractTouch[] = [];
    private dragTarget: EventTarget = null;
    private parentObserver: MutationObserver = null;
    private selector: string = '';
    private reParent = /^(.+) *> *([A-Za-z0-9_#\.]+?)$/;
    private reDescendant = /^(.+) +([A-Za-z0-9_#\.]+?)$/;
    private onEvents: string[] = [];
    private onFuncs: any[] = [];

    private _autoRebuildElements: boolean = true; // if a child/descendant selector is used, then automatically rebuild when nodes are added/removed
    private _doubleClickDelay: number = 250; // ms
    private _doubleClickDistance: number = 20; // pixels
    private _swipeDistance: number = 100; // pixels
    private _holdDistance: number = 20; // pixels
    private _holdDelay: number = 1000; // ms
    private _bubbles: boolean = false;
    private _moveable: boolean = false;
    private _swipeable: boolean = false;
    private _tappable: boolean = false;
    private _holdable: boolean = false;
    private _doubletappable: boolean = false;
    private _debug: boolean = false;
    private _dropzone: string = '';
    private _enable: boolean = true; // enabled by default

    private static INVALID_TIMER = -1;
    private static dropList: Interact[] = [];
    private static activeDropList: DragInfo[] = []; // all drop zones for the current dropTarget
    private static uniqueId: number = 1;
    private static selfId: number = 1;

    // public interfaces
    constructor(selector: string, options ? : InteractOptions);
    constructor(elem: Element, options ? : InteractOptions);
    constructor(elems: NodeList, options ? : InteractOptions);
    constructor(elems: Element[], options ? : InteractOptions);
    constructor(selectorOrElems: any, options ? : InteractOptions) {
        this.setOptions(options);
        this.setElements(selectorOrElems);
    }

    autoRebuildElements(value: boolean = true): Interact {
        this._autoRebuildElements = value;
        if (!value && this.parentObserver)
            this.parentObserver.disconnect();

        return this;
    }

    debug(value: boolean = true): Interact {
        this._debug = value;
        return this;
    }

    swipeable(value: boolean = true): Interact {
        this._swipeable = value;
        return this;
    }

    moveable(value: boolean = true): Interact {
        this._moveable = value;
        return this;
    }

    tappable(value: boolean = true): Interact {
        this._tappable = value;
        return this;
    }

    doubletappable(value: boolean = true): Interact {
        this._doubletappable = value;
        return this;
    }

    holdable(value: boolean = true): Interact {
        this._holdable = value;
        return this;
    }

    dropzone(accept: string): Interact {
        this.disableDropZone();
        this._dropzone = accept;
        this.enableDropZone();

        return this;
    }

    private disableDropZone() {
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
    }

    private enableDropZone() {
        if (!this._enable)
            return;

        if (this._dropzone)
            Interact.dropList.push(this);
    }


    bubbles(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._bubbles = value;
        return this;
    }

    doubleClickDelay(value: number): Interact {
        this._doubleClickDelay = value;
        return this;
    }

    doubleClickDistance(value: number): Interact {
        this._doubleClickDistance = value;
        return this;
    }

    swipeDistance(value: number): Interact {
        this._swipeDistance = value;
        return this;
    }

    holdDistance(value: number): Interact {
        this._holdDistance = value;
        return this;
    }

    holdDelay(value: number): Interact {
        this._holdDelay = value;
        return this;
    }

    disable(): Interact {
        if (!this._enable)
            return this;

        this.disableDropZone();

        // should we send any end/deactivate/leave events?

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
    }

    enable(): Interact {
        if (this._enable)
            return this;
        this._enable = true;

        for (var i = 0; i < this.elems.length; ++i)
            this.enableElement(this.elems[i]);

        this.enableDropZone();

        return this;
    }

    private disableElement(elem: Element) {
        if (!this._enable)
            return;

        if (!(elem instanceof Element))
            return;

        elem.removeEventListener('mousedown', this.mouseDownHandler);
        elem.removeEventListener('touchstart', this.touchStartHandler);

        // disable events set by on(...)
        for (var i = 0; i < this.onEvents.length; ++i) {
            var eventList = this.onEvents[i].split(' ');
            for (var j = 0; j < eventList.length; ++j)
                elem.removeEventListener(eventList[j], this.onFuncs[i]);
        }
    }

    private enableElement(elem: Element) {
        if (!this._enable)
            return;

        if (!(elem instanceof Element))
            return;

        elem.addEventListener('mousedown', this.mouseDownHandler);
        elem.addEventListener('touchstart', this.touchStartHandler);

        // apply on(...) events
        for (var i = 0; i < this.onEvents.length; ++i) {
            var eventList = this.onEvents[i].split(' ');
            for (var j = 0; j < eventList.length; ++j)
                elem.addEventListener(eventList[j], this.onFuncs[i]);
        }
    }

    setElements(selector: string): Interact;
    setElements(elem: Element): Interact;
    setElements(elems: NodeList): Interact;
    setElements(elems: Element[]): Interact;
    setElements(selectorOrElems: any): Interact {
        var newElems: Element[] = [];

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

        // listen to new elements
        for (var i = 0; i < newElems.length; ++i) {
            var elem = newElems[i];
            if (this.elems.indexOf(elem) === -1)
                this.enableElement(elem);
        }

        // stop listening to old elements
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (newElems.indexOf(elem) === -1)
                this.disableElement(elem);
        }

        this.elems = newElems;

        return this;
    }

    setOptions(options: InteractOptions): Interact {
        if (typeof options !== 'object')
            return this;

        for (var i in options) {
            var variable = '_' + i;
            if (variable in this)
                this[variable] = options[i];
        }

        return this;
    }

    // events - space separated list of event names
    // func - callback, information is in the .details of the first parameter
    on(events: string, func: (e: any) => void): Interact {
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
    }

    off(events: string, func ? : (e: any) => void): Interact {
        var allFunc = !func;
        var eventList = events.split(' ');
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            for (var j = 0; j < eventList.length; ++j) {
                var event = eventList[j];

                // loop backwards for removal
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
    }

    // mouse and touch
    private onMouseDown(e: MouseEvent) {
        e.preventDefault();

        this.mouseTarget = e.currentTarget; // e.target;
        this.pointerStart(0, this.mouseTarget, e.pageX, e.pageY, e.target);
        document.body.addEventListener('mousemove', this.mouseMoveHandler);
        document.body.addEventListener('mouseup', this.mouseUpHandler);
    }

    private onMouseMove(e: MouseEvent) {
        e.preventDefault();

        if (!this.mouseTarget)
            return;

        this.pointerMove(0, this.mouseTarget, e.pageX, e.pageY, e.target);
    }

    private onMouseUp(e: MouseEvent) {
        e.preventDefault();

        this.pointerEnd(0, this.mouseTarget, e.pageX, e.pageY, e.target);
        this.mouseTarget = null;
        document.body.removeEventListener('mouseup', this.mouseUpHandler);
        document.body.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    private onTouchStart(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        if (this.touchTargets.length === 0) {
            document.addEventListener('touchmove', this.touchMoveHandler);
            document.addEventListener('touchend', this.touchEndHandler);
        }

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i],
                touchTarget = this.getTouchById(touch.identifier);

            this.pointerStart(touch.identifier, e.currentTarget, touch.pageX, touch.pageY, touch.target);

            if (!touchTarget)
                this.touchTargets.push({
                    id: touch.identifier,
                    target: e.currentTarget
                });
        }
    }

    private onTouchMove(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i],
                touchTarget = this.getTouchById(touch.identifier);

            if (touchTarget) {
                this.pointerMove(touch.identifier, touchTarget.target, touch.pageX, touch.pageY, touch.target);
            }
        }
    }

    private onTouchEnd(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        for (var i = 0; i < e.changedTouches.length; ++i) {
            var touch = e.changedTouches[i],
                touchTarget = this.getTouchById(touch.identifier);

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
    }

    // generalised pointer functions
    private pointerStart(id: number, target: EventTarget, x: number, y: number, rawTarget: EventTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (touchInfo) {
            var wasTouched = (touchInfo.touchId !== -1);
            touchInfo.touchId = id;
            touchInfo.lastX = x;
            touchInfo.lastY = y;

            if (wasTouched)
                return; // further touches on the same target, don't re-start
        }

        if (touchInfo) {
            // remove the event (holdTimer has already been disabled)
            var i = this.touches.indexOf(touchInfo);
            this.touches.splice(i, 1);

            var now = Date.now();
            if (this._doubletappable &&
                touchInfo.time + this._doubleClickDelay > now &&
                this.getDistance(touchInfo.x, touchInfo.y, x, y) < this._doubleClickDistance) {
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
        }
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
    }

    private pointerMove(id: number, target: EventTarget, x: number, y: number, rawTarget: EventTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (!touchInfo)
            return;

        if (id !== touchInfo.touchId)
            return; // another touch is controlling this target

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
    }

    private pointerEnd(id: number, target: EventTarget, x: number, y: number, rawTarget: EventTarget) {
        var touchInfo = this.getTouchInfo(target);
        if (!touchInfo)
            return;

        if (touchInfo.touchId !== id)
            return; // another touch is controlling this target

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
    }

    // drag and drop

    // processed by dropzone interact, can be activated multiple times
    private activateDropZone(target: EventTarget) {
        var parent = ( < Element > ( < Element > target).parentNode);
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
    }

    // processed by dropzone interact
    private deactivateDropZone(target: EventTarget) {
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
    }

    // processed by drag interact
    private evaluateDrag(touchInfo: TouchInfo, target: EventTarget, x: number, y: number, rawTarget: EventTarget) {
        var overList: Element[] = [];

        // convert x,y to client co-ords
        var cx = x - document.body.scrollLeft, // + document.documentElement.scrollLeft;
            cy = y - document.body.scrollTop; // + document.documentElement.scrollTop;

        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var active = Interact.activeDropList[i],
                dropZone = active.dropZone,
                overlap = false;

            for (var j = 0; j < dropZone.elems.length; ++j) {
                var elem = dropZone.elems[j],
                    rect = elem.getBoundingClientRect(),
                    overlap = cx >= rect.left && cx <= rect.right && cy <= rect.bottom && cy >= rect.top;

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
    }

    // helper
    private newEvent(name: string, detail: any): CustomEvent {
        if (this._debug)
            console.log('new event ' + name);

        return new( < any > CustomEvent)(name, {
            bubbles: this._bubbles,
            cancelable: this._bubbles,
            detail: detail
        });
    }

    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        x2 -= x1;
        y2 -= y1;
        return Math.sqrt(x2 * x2 + y2 * y2);
    }

    private getTouchInfo(target) {
        for (var i = 0; i < this.touches.length; ++i) {
            var click = this.touches[i];
            if (click.target === target) {
                return click;
            }
        }
        return null;
    }

    private holdExpired(touchInfo: TouchInfo) {
        var event = this.newEvent('hold', {
            x: touchInfo.x,
            y: touchInfo.y,
            holdTarget: touchInfo.originalTarget
        });
        touchInfo.target.dispatchEvent(event);
    }

    private static getLineage(child: HTMLElement): HTMLElement[] {
        var ancestors: HTMLElement[] = [child];

        do {
            ancestors.push(child);
            child = < HTMLElement > child.parentNode;
        } while (child && child !== document.body)

        return ancestors;
    }

    private static renderSort(a: HTMLElement, b: HTMLElement) {
        if (a === b)
            return 0;

        if ('zIndex' in a.style && 'zIndex' in b.style)
            return parseFloat(a.style.zIndex) - parseFloat(b.style.zIndex);

        var aLineage = Interact.getLineage(a);
        var bLineage = Interact.getLineage(b);
        var longestLine = Math.max(aLineage.length, bLineage.length);

        for (var i = 0; i < longestLine; ++i) {
            if (i === aLineage.length)
                return -1; // a is the parent, so b is on top
            else if (i === bLineage.length)
                return 1; // b is the parent , so a is on top
            else if (aLineage[i] === bLineage[i])
                continue; // common parent
            else if (i === 0)
                return 0; // no common parent

            var common = aLineage[i - 1];
            var aChild = aLineage[i];
            var bChild = bLineage[i];

            for (var j = 0; j < common.children.length; ++j) {
                var child = common.children[i];
                if (aChild === child)
                    return -1; // a is first, so b is on top
                else if (bChild === child)
                    return -1; // b is first, so a is on top
            }

            console.error('invalid hierarchy');
            return 0; // something went wrong
        }
    }

    private watchReparenting(selector: any) {
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
    }

    private watchParent(elems: Element[]) {
        if (!this.parentObserver)
            this.parentObserver = new MutationObserver(this.onMutation.bind(this));

        for (var i = 0; i < elems.length; ++i)
            this.parentObserver.observe(elems[i], {
                childList: true
            });
    }

    private onMutation(mutations) {
        if (this._debug)
            console.log('parent of selector changed, rebuilding interact', this.selector);

        // child was added or removed, rebuild the selector list
        this.setElements(this.selector);
    }

    private getTouchById(id: number): InteractTouch {
        for (var i = 0; i < this.touchTargets.length; ++i) {
            var touchTarget = this.touchTargets[i];
            if (touchTarget.id === id)
                return touchTarget;

        }
        return null;
    }

    private static getActiveDrop(dropZone: Interact): DragInfo {
        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var active = Interact.activeDropList[i];
            if (active.dropZone === dropZone)
                return active;
        }
        return null;
    }
}

function interact(selector: string, options ? : InteractOptions);

function interact(elem: Element, options ? : InteractOptions);

function interact(elems: NodeList, options ? : InteractOptions);

function interact(elems: Element[], options ? : InteractOptions);

function interact(selectorOrElems: any, options ? : InteractOptions) {
    return new Interact(selectorOrElems, options);
}
