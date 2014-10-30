interface CardOptions {
    front ? : string;
    back ? : string;
    facedown ? : boolean;
}

// maybe we could send a whole deck??
class Card {
    private elems: HTMLElement[] = [];
    private _front: string = '';
    private _back: string = '';
    private _facedown: boolean = false;

    static attributeList = ['front', 'back', 'facedown']

    constructor(selector: string, options ? : CardOptions);
    constructor(elem: Element, options ? : CardOptions);
    constructor(elems: NodeList, options ? : CardOptions);
    constructor(elems: Element[], options ? : CardOptions);
    constructor(selectorOrElems: any, options ? : CardOptions) {
        if (typeof selectorOrElems === 'string')
            this.elems = [].slice.call(document.querySelectorAll(selectorOrElems));
        else if (selectorOrElems instanceof Element)
            this.elems = [selectorOrElems];
        else if ('length' in selectorOrElems)
            this.elems = [].slice.call(selectorOrElems);

        this.createCanvases();
        this.setOptions(options);
        this.refresh();

        var observer = new MutationObserver(this.onMutate.bind(this));
        for (var i = 0; i < this.elems.length; ++i)
            observer.observe(this.elems[i], {
                attributes: true
            });
    }


    facedown(value: boolean = true): Card {
        this._facedown = value;
        return this;
    }

    front(selector: string): Card {
        this._front = selector;
        return this;
    }

    back(selector: string): Card {
        this._back = selector;
        return this;
    }

    refresh(elem ? : HTMLElement) {
        if (elem) {
            this.refreshElement(elem);
        } else {
            for (var i = 0; i < this.elems.length; ++i)
                this.refreshElement(this.elems[i]);
        }
    }

    private refreshElement(elem: HTMLElement) {
        if (!elem)
            return;

        var canvas = < HTMLCanvasElement > elem.querySelector('canvas');
        if (!canvas)
            return;

        var facedown = elem.getAttribute('facedown') === 'true' || this._facedown;
        var selector = '';

        if (!facedown)
            selector = elem.getAttribute('front') || this._front;
        else
            selector = elem.getAttribute('back') || this._back;

        if (selector) {
            var cutout = < HTMLElement > document.querySelector(selector);
            this.drawFace(canvas, cutout);
        }
    }

    private drawFace(cardCanvas: HTMLCanvasElement, cutout: HTMLElement) {
        if (!cardCanvas || !cutout)
            return;

        var cutoutStyle = window.getComputedStyle(cutout),
            sx = parseFloat(cutoutStyle.left) || 0,
            sy = parseFloat(cutoutStyle.top) || 0,
            sw = parseFloat(cutoutStyle.width),
            sh = parseFloat(cutoutStyle.height),
            dw = cardCanvas.width,
            dh = cardCanvas.height,
            ctx = cardCanvas.getContext('2d'),
            cutoutParent = < HTMLElement > (cutout.parentNode);

        ctx.fillStyle = cutoutParent.style.backgroundColor || 'white';
        ctx.fillRect(0, 0, dw, dh);

        [].forEach.call(cutoutParent.children, function(child) {
            if (!(child instanceof HTMLImageElement))
                return;

            var childStyle = window.getComputedStyle(child),
                cx = parseFloat(childStyle.left) || 0,
                cy = parseFloat(childStyle.top) || 0,
                cw = parseFloat(childStyle.width),
                ch = parseFloat(childStyle.height),
                nw = ( < HTMLImageElement > child).naturalWidth,
                nh = ( < HTMLImageElement > child).naturalHeight,
                mx = dw / sw,
                my = dh / sh;

            // TODO Downsize in steps (50%) to improve resize quality when cw/nw > 2

            ctx.drawImage(child, 0, 0, nw, nh, (cx - sx) * mx, (cy - sy) * my, cw * mx, ch * my);
        });
    }

    private onMutate(mutations) {
        var dirty = false;
        var self = this;
        var targets = [];

        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes') {
                var attr = mutation.attributeName;
                if (Card.attributeList.indexOf(attr) !== -1)
                    targets.push(mutation.target);
            }
        });

        for (var i = 0; i < targets.length; ++i)
            this.refresh(targets[i]);
    }

    private setOptions(options: CardOptions) {
        for (var i in options) {
            if (Card.attributeList.indexOf(i) !== -1)
                this[i].call(this, options[i]);
        }
    }

    private createCanvases() {
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!elem)
                continue;

            elem.style.position = 'relative';

            var canvas = < HTMLCanvasElement > document.createElement('canvas');
            canvas.width = elem.offsetWidth;
            canvas.height = elem.offsetHeight;
            canvas.style.position = 'absolute';
            canvas.style.left = '0';
            canvas.style.top = '0';
            elem.insertBefore(canvas, elem.firstChild);
        }
    }
}

var card = function(selectorOrElem: any, options ? : CardOptions) {
    return new Card(selectorOrElem, options);
}
