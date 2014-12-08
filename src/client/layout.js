var Layout = (function () {
    function Layout(selectorOrElems, options) {
        this.elems = [];
        this._layout = 'fan';
        this._align = 'left';
        this._baseline = 'middle';
        this._offsetx = '0';
        this._offsety = '0';
        this._facedown = 'any';
        this._positionWith = Layout.topLeft;
        this.attributeList = ['layout', 'align', 'baseline', 'offsetx', 'offsety', 'numcolumns'];
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
    Layout.prototype.layout = function (value) {
        this._layout = value;
        return this;
    };

    Layout.prototype.align = function (value) {
        this._align = value;
        return this;
    };

    Layout.prototype.baseline = function (value) {
        this._baseline = value;
        return this;
    };

    Layout.prototype.offsetx = function (value) {
        this._offsetx = value;
        return this;
    };

    Layout.prototype.offsety = function (value) {
        this._offsety = value;
        return this;
    };

    Layout.prototype.positionWith = function (func) {
        this._positionWith = func;
        return this;
    };

    Layout.prototype.facedown = function (value) {
        this._facedown = value;
        return this;
    };

    Layout.prototype.setOptions = function (options) {
        if (!options)
            return;

        for (var name in options) {
            if (this.attributeList.indexOf(name) !== -1)
                this['_' + name] = options[name];
        }

        if ('positionWith' in options)
            this._positionWith = options.positionWith;
    };

    Layout.prototype.refresh = function (elem) {
        if (typeof elem !== 'undefined') {
            this.refresh(elem);
        } else {
            for (var i = 0; i < this.elems.length; ++i)
                this.refreshElement(this.elems[i]);
        }
    };

    // return the index of the child closest to the co-ordinates (relative to the top, left of the element)
    Layout.getIndex = function (elem, x, y, ignoreChildren) {
        var numChildren = (elem ? elem.children.length : 0);
        if (numChildren === 0)
            return -1;

        var indexLeft = -1, diffLeft = 1e10, indexTop = -1, diffTop = 1e10, deltaTop = 0, deltaLeft = 0, lastTop = 0, lastLeft = 0;

        var rect = elem.getBoundingClientRect();
        x += rect.left;
        y += rect.top;

        for (var i = numChildren - 1; i >= 0; --i) {
            var child = elem.children[i];
            if (ignoreChildren && ignoreChildren.indexOf(child) !== -1)
                continue;

            rect = child.getBoundingClientRect();
            deltaTop = Math.abs(rect.top - lastTop);
            deltaLeft = Math.abs(rect.left - lastLeft);
            lastTop = rect.top;
            lastLeft = rect.left;

            // use the card mid point so index changes to the right/bottom of the midpoint
            var top = y - (rect.top + rect.bottom) / 2, left = x - (rect.left + rect.right) / 2;

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
            return indexTop;
        else
            return indexLeft;
    };

    Layout.prototype.onMutate = function (mutations) {
        var dirty = false, targets = [], self = this;

        mutations.forEach(function (mutation) {
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
    };

    Layout.prototype.refreshElement = function (elem) {
        if (!elem || elem.children.length === 0)
            return;

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
    };

    // note: don't use getBoundingClientRect() as that will get the post-scaled size
    // size
    Layout.prototype.getInnerSize = function (elem) {
        var style = window.getComputedStyle(elem);
        return {
            x: parseFloat(style.paddingLeft),
            y: parseFloat(style.paddingTop),
            width: parseFloat(style.width),
            height: parseFloat(style.height)
        };
    };

    // size +margin +border +padding
    // note: don't use offsetWidth or offsetHeigth, as each call forces a page refresh
    Layout.prototype.getOuterSize = function (elem) {
        var style = window.getComputedStyle(elem), marginLeft = parseFloat(style.marginLeft), marginTop = parseFloat(style.marginTop), borderLeftWidth = parseFloat(style.borderLeftWidth), borderRightWidth = parseFloat(style.borderRightWidth), borderTopWidth = parseFloat(style.borderTopWidth), borderBottomWidth = parseFloat(style.borderBottomWidth);

        return {
            x: -marginLeft,
            y: -marginTop,
            width: parseFloat(style.width) + borderLeftWidth + borderRightWidth + marginLeft + parseFloat(style.marginRight),
            height: parseFloat(style.height) + borderTopWidth + borderBottomWidth + marginTop + parseFloat(style.marginBottom)
        };
    };

    // size +border +padding
    // note: don't use offsetWidth or offsetHeigth, as each call forces a page refresh
    Layout.prototype.getBorderSize = function (elem) {
        var style = window.getComputedStyle(elem), borderLeftWidth = parseFloat(style.borderLeftWidth), borderRightWidth = parseFloat(style.borderRightWidth), borderTopWidth = parseFloat(style.borderTopWidth), borderBottomWidth = parseFloat(style.borderBottomWidth);

        return {
            x: 0,
            y: 0,
            width: parseFloat(style.width) + borderLeftWidth + borderRightWidth,
            height: parseFloat(style.height) + borderTopWidth + borderBottomWidth
        };
    };

    Layout.prototype.refreshStack = function (elem) {
        var numChildren = elem.children.length, layoutSize = this.getInnerSize(elem), totalWidth = layoutSize.width, totalHeight = layoutSize.height;

        var align = elem.getAttribute('align') || this._align, offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx), offsety = parseFloat(elem.getAttribute('offsety') || this._offsety), baseline = elem.getAttribute('baseline') || this._baseline;

        for (var i = 0; i < numChildren; ++i) {
            var child = elem.children[i], x = 0, y = 0, dimensions = this.getOuterSize(child), dx = totalWidth - dimensions.width, dy = totalHeight - dimensions.height;

            switch (align) {
                case 'right':
                    x = dx;
                    break;
                case 'centered':
                case 'justified':
                    x = dx / 2;
                    break;
            }
            switch (baseline) {
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
    };

    Layout.prototype.refreshGrid = function (elem) {
        var layoutSize = this.getInnerSize(elem), totalWidth = layoutSize.width, totalHeight = layoutSize.height, numChildren = elem.children.length, align = elem.getAttribute('align') || this._align, offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx), offsety = parseFloat(elem.getAttribute('offsety') || this._offsety), baseline = elem.getAttribute('baseline') || this._baseline, numColumns = parseInt(elem.getAttribute('numcolumns'), 10) || Math.ceil(Math.sqrt(numChildren)), dx = totalWidth / numColumns, dy = totalHeight / numColumns;

        for (var i = 0; i < numChildren; ++i) {
            var child = (elem.children[i]), j = (i % numColumns), k = (~~(i / numColumns)), x = j * dx, y = k * dy, dimensions = this.getOuterSize(child);

            switch (align) {
                case 'right':
                    x += dx - dimensions.width;
                    break;
                case 'centered':
                    x += (dx - dimensions.width) / 2;
                    break;
            }
            switch (baseline) {
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
    };

    Layout.prototype.refreshRandom = function (elem) {
        var layoutSize = this.getInnerSize(elem), totalWidth = layoutSize.width, totalHeight = layoutSize.height, numChildren = elem.children.length;

        for (var i = 0; i < numChildren; ++i) {
            var child = (elem.children[i]), dimensions = this.getOuterSize(child), x = Math.random() * (totalWidth - dimensions.width), y = Math.random() * (totalHeight - dimensions.height);

            this._positionWith.call(this, child, x + layoutSize.x, y + layoutSize.y);
        }
    };

    Layout.prototype.refreshFan = function (elem) {
        var layoutSize = this.getInnerSize(elem), totalWidth = layoutSize.width, totalHeight = layoutSize.height, childWidths = [], childHeights = [], totalChildWidth = 0, numChildren = elem.children.length;

        var align = elem.getAttribute('align') || this._align, offsetx = parseFloat(elem.getAttribute('offsetx') || this._offsetx), offsety = parseFloat(elem.getAttribute('offsety') || this._offsety), baseline = elem.getAttribute('baseline') || this._baseline;

        for (var i = 0; i < numChildren; ++i) {
            var child = (elem.children[i]), dimensions = this.getOuterSize(child);

            childHeights.push(dimensions.height);
            childWidths.push(dimensions.width);
            totalChildWidth += dimensions.width;
        }

        var delta = totalWidth - totalChildWidth, x = 0, y = 0;

        if (numChildren > 1)
            delta = delta / (numChildren - 1);

        if (align !== 'justified')
            delta = Math.min(delta, offsetx);

        switch (align) {
            case 'right':
                x = totalWidth - totalChildWidth - (numChildren - 1) * delta;
                break;
            case 'centered':
                x = (totalWidth - totalChildWidth - (numChildren - 1) * delta) / 2;
                break;
        }

        for (var i = 0; i < numChildren; ++i) {
            var child = (elem.children[i]);

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
    };

    Layout.prototype.refreshFaceDown = function (elem) {
        var numChildren = elem.children.length, facedown = elem.getAttribute('facedown') || this._facedown;

        if (facedown === 'any')
            return;

        for (var i = 0; i < numChildren; ++i) {
            var child = (elem.children[i]);
            if (!child.hasAttribute('facedown') || child.getAttribute('facedown') !== facedown)
                child.setAttribute('facedown', facedown);
        }
    };
    Layout.topLeft = function (target, x, y) {
        target.style.position = 'absolute';
        target.style.left = ~~x + 'px';
        target.style.top = ~~y + 'px';
    };
    return Layout;
})();

function layout(selectorOrElems, options) {
    return new Layout(selectorOrElems, options);
}
