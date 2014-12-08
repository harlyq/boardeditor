// maybe we could send a whole deck??
var Card = (function () {
    function Card(selectorOrElems, options) {
        this.elems = [];
        this._front = '';
        this._back = '';
        this._facedown = false;
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
    Card.prototype.getElements = function () {
        return this.elems;
    };

    Card.prototype.facedown = function (value) {
        if (typeof value === "undefined") { value = true; }
        this._facedown = value;
        return this;
    };

    Card.prototype.front = function (selector) {
        this._front = selector;
        return this;
    };

    Card.prototype.back = function (selector) {
        this._back = selector;
        return this;
    };

    Card.prototype.refresh = function (elem) {
        if (elem) {
            this.refreshElement(elem);
        } else {
            for (var i = 0; i < this.elems.length; ++i)
                this.refreshElement(this.elems[i]);
        }

        return this;
    };

    Card.prototype.refreshElement = function (elem) {
        if (!elem)
            return;

        var canvas = elem.querySelector('canvas');
        if (!canvas)
            return;

        // use computedStyle because it is quicker than offsetWidth. It is the size less padding and border,
        // and it is valid when the element is hidden
        var style = getComputedStyle(elem), w = parseFloat(style.width), h = parseFloat(style.height);

        if (canvas.width !== w)
            canvas.width = w;
        if (canvas.height !== h)
            canvas.height = h;

        var facedown = elem.getAttribute('facedown');
        if (facedown !== null)
            facedown = facedown === 'true';
        else
            facedown = this._facedown;

        var selector = '';

        if (!facedown)
            selector = elem.getAttribute('front') || this._front;
        else
            selector = elem.getAttribute('back') || this._back;

        if (selector) {
            var cutout = document.querySelector(selector);
            this.drawFace(canvas, cutout);
        }
    };

    Card.prototype.drawFace = function (cardCanvas, cutout) {
        if (!cardCanvas || !cutout)
            return;

        var cutoutStyle = window.getComputedStyle(cutout), sx = parseFloat(cutoutStyle.left) || 0, sy = parseFloat(cutoutStyle.top) || 0, sw = parseFloat(cutoutStyle.width), sh = parseFloat(cutoutStyle.height), dw = cardCanvas.width, dh = cardCanvas.height, ctx = cardCanvas.getContext('2d'), cutoutParent = (cutout.parentNode);

        ctx.fillStyle = cutoutParent.style.backgroundColor || 'white';
        ctx.fillRect(0, 0, dw, dh);

        [].forEach.call(cutoutParent.children, function (child) {
            if (!(child instanceof HTMLImageElement))
                return;

            var childStyle = window.getComputedStyle(child), cx = parseFloat(childStyle.left) || 0, cy = parseFloat(childStyle.top) || 0, cw = parseFloat(childStyle.width), ch = parseFloat(childStyle.height), nw = child.naturalWidth, nh = child.naturalHeight, mx = dw / sw, my = dh / sh;

            // TODO Downsize in steps (50%) to improve resize quality when cw/nw > 2
            ctx.drawImage(child, 0, 0, nw, nh, (cx - sx) * mx, (cy - sy) * my, cw * mx, ch * my);
        });
    };

    Card.prototype.onMutate = function (mutations) {
        var dirty = false;
        var self = this;
        var targets = [];

        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes') {
                var attr = mutation.attributeName;
                if (Card.attributeList.indexOf(attr) !== -1)
                    targets.push(mutation.target);
            }
        });

        for (var i = 0; i < targets.length; ++i)
            this.refresh(targets[i]);
    };

    Card.prototype.setOptions = function (options) {
        for (var i in options) {
            if (Card.attributeList.indexOf(i) !== -1)
                this[i].call(this, options[i]);
        }
    };

    Card.prototype.createCanvases = function () {
        for (var i = 0; i < this.elems.length; ++i) {
            var elem = this.elems[i];
            if (!elem)
                continue;

            elem.style.position = 'relative';

            var canvas = document.createElement('canvas');
            canvas.width = 0;
            canvas.height = 0;
            canvas.style.position = 'absolute';
            canvas.style.left = '0';
            canvas.style.top = '0';
            elem.insertBefore(canvas, elem.firstChild);
        }
    };
    Card.attributeList = ['front', 'back', 'facedown', 'width', 'height'];
    return Card;
})();

function card(selectorOrElems, options) {
    return new Card(selectorOrElems, options);
}
