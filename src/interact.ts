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
    private mouseMoveHandler = this.onMouseMove.bind(this);
    private mouseUpHandler = this.onMouseUp.bind(this);
    private touchMoveHandler = this.onTouchMove.bind(this);
    private touchEndHandler = this.onTouchEnd.bind(this);
    private mouseTarget: EventTarget = null;
    private touchTarget: EventTarget = null;
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

    private static INVALID_TIMER = -1;

    constructor(selector: string);
    constructor(elem: Element);
    constructor(elems: NodeList);
    constructor(elems: Element[]);
    constructor(selectorOrElems: any) {
        if (typeof selectorOrElems === 'string')
            this.elems = [].slice.call(document.querySelectorAll(selectorOrElems));
        else if (selectorOrElems instanceof Element)
            this.elems = [selectorOrElems];
        else if ('length' in selectorOrElems)
            this.elems = [].slice.call(selectorOrElems);

        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!(elem instanceof Element))
                continue;

            elem.addEventListener('mousedown', this.onMouseDown.bind(this));
            elem.addEventListener('touchstart', this.onTouchStart.bind(this));
        }
    }

    swipeable(value: boolean): Interact {
        this._swipeable = value;
        return this;
    }

    moveable(value: boolean): Interact {
        this._moveable = value;
        return this;
    }

    tappable(value: boolean): Interact {
        this._tappable = value;
        return this;
    }

    doubletappable(value: boolean): Interact {
        this._doubletappable = value;
        return this;
    }

    holdable(value: boolean): Interact {
        this._holdable = value;
        return this;
    }

    bubbles(value: boolean): Interact {
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

    private onMouseDown(e: MouseEvent) {
        this.mouseTarget = e.target;
        this.pointerStart(this.mouseTarget, e.pageX, e.pageY);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
    }

    private onMouseMove(e: MouseEvent) {
        this.pointerMove(this.mouseTarget, e.pageX, e.pageY);
    }

    private onMouseUp(e: MouseEvent) {
        this.pointerEnd(this.mouseTarget, e.pageX, e.pageY);
        this.mouseTarget = null;
        document.removeEventListener('mouseup', this.mouseUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
    }

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
            document.addEventListener('touchend', this.touchEndHandler);
            document.addEventListener('touchmove', this.touchMoveHandler);
        }
    }

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

    private pointerStart(target, x, y) {
        console.error(target, x, y);
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
    }

    private pointerMove(target, x, y) {
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
                direction: direction
            });
            clickInfo.swiped = true;
            clickInfo.target.dispatchEvent(event);
        }
        if (this._moveable && (clickInfo.moved || distance > this._holdDistance)) {
            var event: CustomEvent = null;
            if (!clickInfo.moved)
                event = this.newEvent('movestart', {
                    x: x,
                    y: y
                });
            else
                event = this.newEvent('move', {
                    x: x,
                    y: y
                });
            clickInfo.moved = true;
            clickInfo.target.dispatchEvent(event);
        }
    }

    private pointerEnd(target, x, y) {
        var clickInfo = this.getClickInfo(target);
        if (!clickInfo)
            return;

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

    private holdExpired(clickInfo) {
        var event = this.newEvent('hold', {
            x: clickInfo.x,
            y: clickInfo.y
        });
        clickInfo.target.dispatchEvent(event);
    }
}

var interact = function(selectorOrElems: any) {
    return new Interact(selectorOrElems);
}
