interface LayoutOptions {
    layout ? : string;
    align ? : string;
    baseline ? : string;
    padding ? : string;
    positionWith ? : (target: HTMLElement, x: number, y: number) => void;
}

class Layout {
    private elems: HTMLElement[] = [];
    private _layout: string = 'fan';
    private _align: string = 'left';
    private _baseline: string = 'middle';
    private _padding: string = '0';
    private _positionWith: (target: HTMLElement, x: number, y: number) => void = Layout.topLeft;
    private attributeList: string[] = ['layout', 'align', 'baseline', 'padding']

    static topLeft = function(target: HTMLElement, x: number, y: number) {
        target.style.position = 'absolute';
        target.style.left = x + 'px';
        target.style.top = y + 'px';
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

    padding(value: string): Layout {
        this._padding = value;
        return this;
    }

    positionWith(func: (target: HTMLElement, x: number, y: number) => void): Layout {
        this._positionWith = func;
        this.refresh();
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

    private onMutate(mutations) {
        var dirty = false;
        var targets = [];

        mutations.forEach(function(mutation) {
            var dirtyMutant = false;

            switch (mutation.type) {
                case 'attributes':
                    var attr = mutation.attributeName;
                    dirtyMutant = this.attributeList.indexOf(attr) !== -1;
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

    refresh(elem ? : HTMLElement) {
        if (typeof elem !== 'undefined') {
            this.refresh(elem);
        } else {
            for (var i = 0; i < this.elems.length; ++i)
                this.refreshElement(this.elems[i]);
        }
    }

    private refreshElement(elem: HTMLElement) {
        var totalWidth = elem.offsetWidth,
            totalHeight = elem.offsetHeight,
            childWidths: number[] = [],
            childHeights: number[] = [],
            totalChildWidth = 0,
            numChildren = elem.children.length;

        var align = elem.getAttribute('align') || this._align,
            padding = elem.getAttribute('padding') || this._padding,
            baseline = elem.getAttribute('baseline') || this._baseline,
            layout = elem.getAttribute('layout') || this._layout;

        if (numChildren === 0)
            return; // nothing to layout

        for (var i = 0; i < numChildren; ++i) {
            var child = < HTMLElement > (elem.children[i]),
                style = getComputedStyle(child),
                rect = child.getBoundingClientRect();

            var childWidth = rect.width + parseInt(style.marginLeft) + parseInt(style.marginRight),
                childHeight = rect.height + parseInt(style.marginTop) + parseInt(style.marginBottom);

            childHeights.push(childHeight);
            childWidths.push(childWidth);
            totalChildWidth += childWidth;
        }

        var delta = totalWidth - totalChildWidth,
            x = 0,
            y = 0;

        if (numChildren > 1)
            delta = delta / (numChildren - 1);

        if (align !== 'justified')
            delta = Math.min(delta, parseFloat(padding));

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

            this._positionWith.call(this, child, x, y);

            x += childWidths[i] + delta;
        }
    }
}

var layout = function(elem: HTMLElement, options: LayoutOptions) {
    return new Layout(elem, options);
}
