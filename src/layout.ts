interface LayoutOptions {
    layout ? : string;
    align ? : string;
    baseline ? : string;
    offsetx ? : string;
    offsety ? : string;
    facedown ? : string;
    positionWith ? : (target: HTMLElement, x: number, y: number) => void;
}

class Layout {
    private elems: HTMLElement[] = [];
    private _layout: string = 'fan';
    private _align: string = 'left';
    private _baseline: string = 'middle';
    private _offsetx: string = '0';
    private _offsety: string = '0';
    private _facedown: string = 'any';
    private _positionWith: (target: HTMLElement, x: number, y: number) => void = Layout.topLeft;

    private attributeList: string[] = ['layout', 'align', 'baseline', 'offsetx', 'offsety', 'numcolumns'];

    static topLeft = function(target: HTMLElement, x: number, y: number) {
        target.style.position = 'absolute';
        target.style.left = ~~x + 'px';
        target.style.top = ~~y + 'px';
    }

    constructor(selector: string, options ? : LayoutOptions);
    constructor(elem: Element, options ? : LayoutOptions);
    constructor(elems: NodeList, options ? : LayoutOptions);
    constructor(elems: Element[], options ? : LayoutOptions);
    constructor(selectorOrElems: any, options ? : LayoutOptions) {
        if (typeof selectorOrElems === 'string')
            this.elems = [].slice.call(document.querySelectorAll(selectorOrElems));
        else if (selectorOrElems instanceof Element)
            this.elems = [selectorOrElems];
        else if ('length' in selectorOrElems)
            this.elems = [].slice.call(selectorOrElems);

        this.setOptions(options);
        this.refresh();

        var observer = new MutationObserver(this.onMutate.bind(this));
        for (var i = 0; i < this.elems.length; ++i)
            observer.observe(this.elems[i], {
                attributes: true,
                childList: true
            });
    }

    layout(value: string): Layout {
        this._layout = value;
        return this;
    }

    align(value: string): Layout {
        this._align = value;
        return this;
    }

    baseline(value: string): Layout {
        this._baseline = value;
        return this;
    }

    offsetx(value: string): Layout {
        this._offsetx = value;
        return this;
    }

    offsety(value: string): Layout {
        this._offsety = value;
        return this;
    }

    positionWith(func: (target: HTMLElement, x: number, y: number) => void): Layout {
        this._positionWith = func;
        return this;
    }

    facedown(value: string): Layout {
        this._facedown = value;
        return this;
    }

    setOptions(options: LayoutOptions) {
        if (!options)
            return;

        for (var name in options) {
            if (this.attributeList.indexOf(name) !== -1)
                this['_' + name] = options[name];
        }

        if ('positionWith' in options)
            this._positionWith = options.positionWith;
    }

    refresh(elem ? : HTMLElement) {
        if (typeof elem !== 'undefined') {
            this.refresh(elem);
        } else {
            for (var i = 0; i < this.elems.length; ++i)
                this.refreshElement(this.elems[i]);
        }
    }

    // return the index of the child closest to the co-ordinates (relative to the top, left of the element)
    static getIndex(elem: HTMLElement, x: number, y: number, ignoreChildren ? : HTMLElement[]): number {
        var numChildren = (elem ? elem.children.length : 0);
        if (numChildren === 0)
            return -1;

        var indexLeft = -1,
            diffLeft = 1e10,
            indexTop = -1,
            diffTop = 1e10,
            deltaTop = 0,
            deltaLeft = 0,
            lastTop = 0,
            lastLeft = 0;

        var rect = elem.getBoundingClientRect();
        x += rect.left;
        y += rect.top;

        // work backwards because the last child appears on top
        for (var i = numChildren - 1; i >= 0; --i) {
            var child = < HTMLElement > elem.children[i];
            if (ignoreChildren && ignoreChildren.indexOf(child) !== -1)
                continue;

            rect = child.getBoundingClientRect();
            deltaTop = Math.abs(rect.top - lastTop);
            deltaLeft = Math.abs(rect.left - lastLeft);
            lastTop = rect.top;
            lastLeft = rect.left;

            // use the card mid point so index changes to the right/bottom of the midpoint
            var top = y - (rect.top + rect.bottom) / 2,
                left = x - (rect.left + rect.right) / 2;

            if (left > 0 && left < diffLeft) {
                diffLeft = left;
                indexLeft = i;
            }
            if (top > 0 && top < diffTop) {
                diffTop = top;
                indexTop = i;
            }
        }

        if (deltaTop > deltaLeft)
            return indexTop; // cards are oriented top to bottom
        else
            return indexLeft; // cards are oriented left to right
    }

    private onMutate(mutations) {
        var dirty = false,
            targets = [],
            self = this;

        mutations.forEach(function(mutation) {
            var dirtyMutant = false;

            switch (mutation.type) {
                case 'attributes':
                    var attr = mutation.attributeName;
                    dirtyMutant = self.attributeList.indexOf(attr) !== -1;
                    break;

                case 'childList':
                    dirtyMutant = true;
                    break;
            }

            if (dirtyMutant && targets.indexOf(mutation.target) === -1)
                targets.push(mutation.target);

            dirty = dirty || dirtyMutant;
        });

        if (dirty) {
            for (var i = 0; i < targets.length; ++i)
                this.refreshElement(targets[i]);
        }
    }

    private refreshElement(elem: HTMLElement) {
        if (!elem || elem.children.length === 0)
            return; // nothing to layout

        switch (elem.getAttribute('layout') || this._layout) {
            case 'fan':
                this.refreshFan(elem);
                break;

            case 'stack':
                this.refreshStack(elem);
                break;

            case 'random':
                this.refreshRandom(elem);
                break;

            case 'grid':
                this.refreshGrid(elem);
                break;
        }

        this.refreshFaceDown(elem);
    }

    // note: don't use getBoundingClientRect() as that will get the post-scaled size

    // size
    private getInnerSize(elem: HTMLElement) {
        var style = window.getComputedStyle(elem);
        return {
            x: parseFloat(style.paddingLeft),
            y: parseFloat(style.paddingTop),
            width: parseFloat(style.width),
            height: parseFloat(style.height)
        };
    }

    // size +margin +border +padding
    // note: don't use offsetWidth or offsetHeigth, as each call forces a page refresh
    private getOuterSize(elem: HTMLElement) {
        var style = window.getComputedStyle(elem),
            marginLeft = parseFloat(style.marginLeft),
            marginTop = parseFloat(style.marginTop),
            borderLeftWidth = parseFloat(style.borderLeftWidth),
            borderRightWidth = parseFloat(style.borderRightWidth),
            borderTopWidth = parseFloat(style.borderTopWidth),
            borderBottomWidth = parseFloat(style.borderBottomWidth);

        return {
            x: -marginLeft,
            y: -marginTop,
            width: parseFloat(style.width) + borderLeftWidth + borderRightWidth + marginLeft + parseFloat(style.marginRight),
            height: parseFloat(style.height) + borderTopWidth + borderBottomWidth + marginTop + parseFloat(style.marginBottom)
        };
    }

    // size +border +padding
    // note: don't use offsetWidth or offsetHeigth, as each call forces a page refresh
    private getBorderSize(elem: HTMLElement) {
        var style = window.getComputedStyle(elem),
            borderLeftWidth = parseFloat(style.borderLeftWidth),
            borderRightWidth = parseFloat(style.borderRightWidth),
            borderTopWidth = parseFloat(style.borderTopWidth),
            borderBottomWidth = parseFloat(style.borderBottomWidth);

        return {
            x: 0,
            y: 0,
            width: parseFloat(style.width) + borderLeftWidth + borderRightWidth,
            height: parseFloat(style.height) + borderTopWidth + borderBottomWidth
        };
    }

    private refreshStack(elem: HTMLElement) {
        var numChildren = elem.children.length,
            layoutSize = this.getInnerSize(elem),
            totalWidth = layoutSize.width,
            totalHeight = layoutSize.height;

        var align = elem.getAttribute('align') || this._align,
            offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx),
            offsety = parseFloat(elem.getAttribute('offsety') || this._offsety),
            baseline = elem.getAttribute('baseline') || this._baseline;

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > elem.children[i],
                x = 0,
                y = 0,
                dimensions = this.getOuterSize(child),
                dx = totalWidth - dimensions.width,
                dy = totalHeight - dimensions.height;

            switch (align) {
                //case 'left':
                case 'right':
                    x = dx;
                    break;
                case 'centered':
                case 'justified':
                    x = dx / 2;
                    break;
            }
            switch (baseline) {
                //case 'top':
                case 'bottom':
                    y = dy;
                    break;
                case 'middle':
                    y = dy / 2;
                    break;
            }
            x += offsetx * i;
            y += offsety * i;

            this._positionWith.call(this, child, x + layoutSize.x, y + layoutSize.y);
        }
    }

    private refreshGrid(elem: HTMLElement) {
        var layoutSize = this.getInnerSize(elem),
            totalWidth = layoutSize.width,
            totalHeight = layoutSize.height,
            numChildren = elem.children.length,
            align = elem.getAttribute('align') || this._align,
            offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx),
            offsety = parseFloat(elem.getAttribute('offsety') || this._offsety),
            baseline = elem.getAttribute('baseline') || this._baseline,
            numColumns = parseInt(elem.getAttribute('numcolumns'), 10) || Math.ceil(Math.sqrt(numChildren)),
            dx = totalWidth / numColumns,
            dy = totalHeight / numColumns;

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]),
                j = (i % numColumns),
                k = (~~(i / numColumns)),
                x = j * dx,
                y = k * dy,
                dimensions = this.getOuterSize(child);

            switch (align) {
                //case 'left':
                case 'right':
                    x += dx - dimensions.width;
                    break;
                case 'centered':
                    x += (dx - dimensions.width) / 2;
                    break;
            }
            switch (baseline) {
                //case 'top':
                case 'bottom':
                    y += dy - dimensions.height;
                    break;
                case 'middle':
                    y += (dy - dimensions.height) / 2;
                    break;
            }

            x += offsetx * j;
            y += offsety * k;
            this._positionWith.call(this, child, x + layoutSize.x, y + layoutSize.y);
        }
    }

    private refreshRandom(elem: HTMLElement) {
        var layoutSize = this.getInnerSize(elem),
            totalWidth = layoutSize.width,
            totalHeight = layoutSize.height,
            numChildren = elem.children.length;

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]),
                dimensions = this.getOuterSize(child),
                x = Math.random() * (totalWidth - dimensions.width),
                y = Math.random() * (totalHeight - dimensions.height);

            this._positionWith.call(this, child, x + layoutSize.x, y + layoutSize.y);
        }
    }

    private refreshFan(elem: HTMLElement) {
        var layoutSize = this.getInnerSize(elem),
            totalWidth = layoutSize.width,
            totalHeight = layoutSize.height,
            childWidths: number[] = [],
            childHeights: number[] = [],
            totalChildWidth = 0,
            numChildren = elem.children.length;

        var align = elem.getAttribute('align') || this._align,
            offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx),
            offsety = parseFloat(elem.getAttribute('offsety') || this._offsety),
            baseline = elem.getAttribute('baseline') || this._baseline;

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]),
                dimensions = this.getOuterSize(child);

            childHeights.push(dimensions.height);
            childWidths.push(dimensions.width);
            totalChildWidth += dimensions.width;
        }

        var delta = totalWidth - totalChildWidth,
            x = 0,
            y = 0;

        if (numChildren > 1)
            delta = delta / (numChildren - 1);

        if (align !== 'justified')
            delta = Math.min(delta, offsetx);

        switch (align) {
            // case 'left':
            // case 'justified':
            //     break;
            case 'right':
                x = totalWidth - totalChildWidth - (numChildren - 1) * delta;
                break;
            case 'centered':
                x = (totalWidth - totalChildWidth - (numChildren - 1) * delta) / 2;
                break;
        }

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]);

            switch (baseline) {
                case 'bottom':
                    y = totalHeight - childHeights[i];
                    break;
                case 'middle':
                    y = (totalHeight - childHeights[i]) / 2;
                    break;
            }

            y += offsety * i;

            this._positionWith.call(this, child, x + layoutSize.x, y + layoutSize.y);

            x += childWidths[i] + delta;
        }
    }

    private refreshFaceDown(elem: HTMLElement) {
        var numChildren = elem.children.length,
            facedown = elem.getAttribute('facedown') || this._facedown;

        if (facedown === 'any')
            return;

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]);
            if (!child.hasAttribute('facedown') || child.getAttribute('facedown') !== facedown)
                child.setAttribute('facedown', facedown);
        }
    }
}

function layout(selector: string, options ? : LayoutOptions);

function layout(elem: Element, options ? : LayoutOptions);

function layout(elems: NodeList, options ? : LayoutOptions);

function layout(elems: Element[], options ? : LayoutOptions);

function layout(selectorOrElems: any, options ? : LayoutOptions) {
    return new Layout(selectorOrElems, options);
}
