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

interface ClickInfo {
    target: EventTarget;
    time: number;
    x: number;
    y: number;
    swiped: boolean;
    moved: boolean;
    holdTimer ? : number;
}

class Interact {
    private elems: Element[] = [];
    private clicks: ClickInfo[] = [];
    private mouseDownHandler = this.onMouseDown.bind(this);
    private mouseMoveHandler = this.onMouseMove.bind(this);
    private mouseUpHandler = this.onMouseUp.bind(this);
    private touchStartHandler = this.onTouchStart.bind(this);
    private touchMoveHandler = this.onTouchMove.bind(this);
    private touchEndHandler = this.onTouchEnd.bind(this);
    private mouseTarget: EventTarget = null;
    private touchTarget: EventTarget = null;
    private dropzoneTarget: EventTarget = null;
    private dragTarget: EventTarget = null;
    private lastX: number = 0;
    private lastY: number = 0;
    private _doubleClickDelay: number = 250; // ms
    private _doubleClickDistance: number = 20; // pixels
    private _swipeDistance: number = 100; // pixels
    private _holdDistance: number = 20; // pixels
    private _holdDelay: number = 1000; // ms
    private _bubbles: boolean = false;
    private _moveable: boolean = true;
    private _swipeable: boolean = true;
    private _tappable: boolean = true;
    private _holdable: boolean = true;
    private _doubletappable: boolean = true;
    private _dropzone: string = '';

    private static INVALID_TIMER = -1;
    private static dropList: Interact[] = [];
    private static activeDropList: Interact[] = []; // all drop zones for the current dropTarget

    // public interfaces
    constructor(selector: string);
    constructor(elem: Element);
    constructor(elems: NodeList);
    constructor(elems: Element[]);
    constructor(selectorOrElems: any) {
        this.setElements(selectorOrElems);
        this.enable();
    }

    swipeable(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._swipeable = value;
        return this;
    }

    moveable(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._moveable = value;
        return this;
    }

    tappable(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._tappable = value;
        return this;
    }

    doubletappable(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._doubletappable = value;
        return this;
    }

    holdable(value: boolean): Interact {
        if (typeof value === 'undefined')
            value = true;

        this._holdable = value;
        return this;
    }

    dropzone(accept: string): Interact {
        if (!accept && this._dropzone) {
            var i = Interact.dropList.indexOf(this);
            if (i !== -1)
                Interact.dropList.splice(i, 1);
        } else if (accept && !this._dropzone) {
            Interact.dropList.push(this);
        }

        this._dropzone = accept;
        return this;
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
        // should we send any end/deactivate/leave events?

        this.dropzoneTarget = null;
        this.touchTarget = null;
        this.mouseTarget = null;

        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            elem.removeEventListener('mousedown', this.mouseDownHandler);
            elem.removeEventListener('touchstart', this.touchStartHandler);
        }
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);

        document.removeEventListener('touchend', this.touchEndHandler);
        document.removeEventListener('touchmove', this.touchMoveHandler);

        return this;
    }

    enable(): Interact {
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            elem.addEventListener('mousedown', this.mouseDownHandler);
            elem.addEventListener('touchstart', this.touchStartHandler);
        }

        return this;
    }

    setElements(selector: string): Interact;
    setElements(elem: Element): Interact;
    setElements(elems: NodeList): Interact;
    setElements(elems: Element[]): Interact;
    setElements(selectorOrElems: any): Interact {
        this.disable();

        if (typeof selectorOrElems === 'string')
            this.elems = [].slice.call(document.querySelectorAll(selectorOrElems));
        else if (selectorOrElems instanceof Element)
            this.elems = [selectorOrElems];
        else if ('length' in selectorOrElems)
            this.elems = [].slice.call(selectorOrElems);
        else if (!selectorOrElems)
            this.elems = [];

        this.enable();
        return this;
    }

    // events - space separated list of event names
    // func - callback, information is in the .details of the first parameter
    on(events: string, func: (e: any) => void): Interact {
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

    // mouse and touch
    private onMouseDown(e: MouseEvent) {
        this.mouseTarget = e.target;
        this.pointerStart(this.mouseTarget, e.pageX, e.pageY);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.mouseTarget)
            return;

        this.pointerMove(this.mouseTarget, e.pageX, e.pageY);
    }

    private onMouseUp(e: MouseEvent) {
        this.pointerEnd(this.mouseTarget, e.pageX, e.pageY);
        this.mouseTarget = null;
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    private onMouseOver(e: MouseEvent) {}

    private onTouchStart(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        var touch = e.changedTouches[0];
        if (!this.touchTarget) {
            document.addEventListener('touchmove', this.touchMoveHandler);
            document.addEventListener('touchend', this.touchEndHandler);
            this.touchTarget = touch.target;
        }

        this.pointerStart(this.touchTarget, touch.pageX, touch.pageY);
    }

    private onTouchMove(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        var touch = e.changedTouches[0];
        this.pointerMove(this.touchTarget, touch.pageX, touch.pageY);
    }

    private onTouchEnd(e: TouchEvent) {
        e.preventDefault();

        if (e.changedTouches.length === 0)
            return;

        var touch = e.changedTouches[0];
        this.pointerEnd(this.touchTarget, touch.pageX, touch.pageY);

        if (e.touches.length === 0) {
            this.touchTarget = null;
            document.removeEventListener('touchend', this.touchEndHandler);
            document.removeEventListener('touchmove', this.touchMoveHandler);
        }
    }

    // generalised pointer functions
    private pointerStart(target, x, y) {
        var clickInfo = this.getClickInfo(target);
        if (clickInfo) {
            var now = Date.now();
            if (this._doubletappable &&
                clickInfo.time + this._doubleClickDelay > now &&
                this.getDistance(clickInfo.x, clickInfo.y, x, y) < this._doubleClickDistance) {
                var event = this.newEvent('doubletap', {
                    x: clickInfo.x,
                    y: clickInfo.y,
                    duration: now - clickInfo.time
                });
                target.dispatchEvent(event);
                return;

            } else {
                // remove the event (holdTimer has already been disabled)
                var i = this.clicks.indexOf(target);
                this.clicks.splice(i, 1);
            }
        }

        clickInfo = {
            target: target,
            time: Date.now(),
            x: x,
            y: y,
            swiped: false,
            moved: false,
            holdTimer: -1
        }
        if (this._holdable)
            clickInfo.holdTimer = window.setTimeout(this.holdExpired.bind(this), this._holdDelay, clickInfo);

        this.clicks.push(clickInfo);

        if (this._tappable) {
            var event = this.newEvent('tap', {
                x: x,
                y: y
            });
            target.dispatchEvent(event);
        }

        if (this._moveable) {
            for (var i = 0; i < Interact.dropList.length; ++i)
                Interact.dropList[i].activateDropZone(target);

            // this will generate dropenter events, if we are already over a dropzone
            this.evaluateDrag(target, x, y);
        }

        this.lastX = x;
        this.lastY = y;
    }

    private pointerMove(target: EventTarget, x: number, y: number) {
        var clickInfo = this.getClickInfo(target);
        if (!clickInfo)
            return;

        var distance = this.getDistance(clickInfo.x, clickInfo.y, x, y);
        if (clickInfo.holdTimer !== Interact.INVALID_TIMER && distance > this._holdDistance) {

            window.clearTimeout(clickInfo.holdTimer);
            clickInfo.holdTimer = Interact.INVALID_TIMER;
        }

        if (this._swipeable && !clickInfo.swiped && distance > this._swipeDistance) {
            var dx = clickInfo.x - x;
            var dy = clickInfo.y - y;
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
                direction: direction
            });
            clickInfo.swiped = true;
            clickInfo.target.dispatchEvent(event);
        }

        if (this._moveable && (clickInfo.moved || distance > this._holdDistance)) {
            var event: CustomEvent = null;
            var firstMove = !clickInfo.moved;

            if (firstMove)
                event = this.newEvent('movestart', {
                    x: x,
                    y: y
                });
            else
                event = this.newEvent('move', {
                    x: x,
                    y: y,
                    dx: x - this.lastX,
                    dy: y - this.lastY
                });
            clickInfo.moved = true;
            clickInfo.target.dispatchEvent(event);
        }

        if (this._moveable)
            this.evaluateDrag(target, x, y);

        this.lastX = x;
        this.lastY = y;
    }

    private pointerEnd(target: EventTarget, x: number, y: number) {
        var clickInfo = this.getClickInfo(target);
        if (!clickInfo)
            return;

        if (this.dropzoneTarget) {
            var event = this.newEvent('drop', {
                dragTarget: target
            });
            this.dropzoneTarget.dispatchEvent(event);

            var event = this.newEvent('dropleave', {
                dragTarget: target
            });
            this.dropzoneTarget.dispatchEvent(event);
            this.dropzoneTarget = null;
        }

        for (var i = 0; i < Interact.activeDropList.length; ++i)
            Interact.dropList[i].deactivateDropZone(target);

        if (clickInfo.holdTimer !== Interact.INVALID_TIMER) {
            window.clearTimeout(clickInfo.holdTimer);
            clickInfo.holdTimer = Interact.INVALID_TIMER;
        }
        if (this._moveable && clickInfo.moved) {
            var event = this.newEvent('moveend', {});
            clickInfo.moved = false;
            clickInfo.target.dispatchEvent(event);
        }

        clickInfo.swiped = false;
    }

    // drag and drop

    // processed by dropzone interact
    private activateDropZone(target: EventTarget) {
        var parent = ( < Element > ( < Element > target).parentNode);
        var matchList = parent.querySelectorAll(this._dropzone);

        if ([].indexOf.call(matchList, target) !== -1) {
            Interact.activeDropList.push(this);

            var event = this.newEvent('dropactivate', {
                dragTarget: target
            });

            for (var i = 0; i < this.elems.length; ++i)
                this.elems[i].dispatchEvent(event);
        }
    }

    // processed by dropzone interact
    private deactivateDropZone(target: EventTarget) {
        var i = Interact.activeDropList.indexOf(this);
        if (i !== -1)
            Interact.activeDropList.splice(i);

        this.dragTarget = null;
        var event = this.newEvent('dropdeactivate', {
            dragTarget: target
        });

        for (var i = 0; i < this.elems.length; ++i)
            this.elems[i].dispatchEvent(event);
    }

    // processed by drag interact
    private evaluateDrag(target: EventTarget, x: number, y: number) {
        var overList: Element[] = [];

        // convert x,y to client co-ords
        x -= document.body.scrollLeft; // + document.documentElement.scrollLeft;
        y -= document.body.scrollTop; // + document.documentElement.scrollTop;

        for (var i = 0; i < Interact.activeDropList.length; ++i) {
            var interact = Interact.activeDropList[i];
            var overlap = false;

            for (var j = 0; j < interact.elems.length; ++j) {
                var elem = interact.elems[j],
                    rect = elem.getBoundingClientRect(),
                    overlap = x >= rect.left && x <= rect.right && y <= rect.bottom && y >= rect.top;

                if (overlap)
                    overList.push(elem);
            }
        }

        var over = null;
        if (overList.length > 0) {
            overList.sort(Interact.renderSort);
            over = overList[0];
        }

        if (this.dropzoneTarget && over !== this.dropzoneTarget) {
            var event = this.newEvent('dropleave', {
                dragTarget: target
            });
            this.dropzoneTarget.dispatchEvent(event);
        } else if (over && !this.dropzoneTarget) {
            var event = this.newEvent('dropenter', {
                dragTarget: target
            });
            over.dispatchEvent(event);
        } else if (over && this.dropzoneTarget === over) {
            var event = this.newEvent('dropover', {
                dragTarget: target
            });
            over.dispatchEvent(event);
        }

        this.dropzoneTarget = over;
    }

    // helper
    private newEvent(name: string, detail: any): CustomEvent {
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

    private getClickInfo(target) {
        for (var i = 0; i < this.clicks.length; ++i) {
            var click = this.clicks[i];
            if (click.target === target) {
                return click;
            }
        }
        return null;
    }

    private holdExpired(clickInfo: ClickInfo) {
        var event = this.newEvent('hold', {
            x: clickInfo.x,
            y: clickInfo.y
        });
        clickInfo.target.dispatchEvent(event);
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
}

var interact = function(selectorOrElems: any) {
    return new Interact(selectorOrElems);
}
