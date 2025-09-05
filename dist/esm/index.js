class ElementData {
    constructor(element) {
        this._element = element;
    }
    has(key) {
        return this._element.hasAttribute(`data-${key}`);
    }
    get(key) {
        return this._element.getAttribute(`data-${key}`);
    }
    set(key, value = '') {
        this._element.setAttribute(`data-${key}`, value);
    }
    remove(key) {
        this._element.removeAttribute(`data-${key}`);
    }
    toggle(key, value) {
        if (value) {
            this.set(key);
        }
        else {
            this.remove(key);
        }
    }
}

class GridAppGrid {
    constructor(app, config) {
        this._app = app;
        this._element = document.createElement('div');
        this._element.gridAppInstance = this;
        this._gridElementConstructors = config.elements;
        this._zoomConfig = config.zoom;
        const appRect = app.element.getBoundingClientRect();
        this._initialOffset = {
            x: appRect.width / 2,
            y: appRect.height / 2,
        };
        this._currentElementId = 1;
        this.element.classList.add('app-grid');
        this.element.style.setProperty('--gridapp-grid-size', config.size.toString());
        this.element.style.setProperty('--gridapp-offset-x', this._initialOffset.x.toString());
        this.element.style.setProperty('--gridapp-offset-y', this._initialOffset.y.toString());
        this.element.style.setProperty('--gridapp-zoom', config.zoom.default.toString());
        this._focusedComponent = null;
        this._pointerInteractingElement = null;
        this._modules = new Map();
        for (const [moduleName, module] of Object.entries(config.modules)) {
            const moduleObj = new module.constructor(this, module.config);
            this._modules.set(moduleName, moduleObj);
        }
        this._data = new ElementData(this._element);
        this.setActiveTool('grab');
    }
    get app() {
        return this._app;
    }
    get element() {
        return this._element;
    }
    get data() {
        return this._data;
    }
    get gridElementConstructors() {
        return this._gridElementConstructors;
    }
    get initialOffset() {
        return this._initialOffset;
    }
    get pointerInteractingElement() {
        return this._pointerInteractingElement;
    }
    get focusedComponent() {
        return this._focusedComponent;
    }
    get zoom() {
        return Number(this.element.style.getPropertyValue('--gridapp-zoom'));
    }
    get offset() {
        return {
            x: Number(this.element.style.getPropertyValue('--gridapp-offset-x')),
            y: Number(this.element.style.getPropertyValue('--gridapp-offset-y')),
        };
    }
    get isGridMoving() {
        return this.data.get('moving') === 'grid';
    }
    get gridElements() {
        return Array.from(this.element.querySelectorAll('.app-element')).map((el) => el.gridAppInstance);
    }
    get activeTool() {
        let activeTool = this.data.get('active-tool');
        if (!activeTool) {
            activeTool = 'grab';
            this._data.set('active-tool', activeTool);
        }
        return activeTool;
    }
    append(...elements) {
        for (const element of elements) {
            this._element.append(element.element);
        }
    }
    setMoving(value) {
        this._data.set('moving', value);
    }
    stopMoving() {
        this._data.remove('moving');
    }
    getNextGridElementId() {
        return this._currentElementId++;
    }
    createElement(type, label) {
        const GridElementConstructor = this._gridElementConstructors.find((c) => c.type === type && c.label === label)?.constructor;
        if (!GridElementConstructor) {
            throw new Error(`No component type registered for type "${type}" and id "${label}".`);
        }
        const component = new GridElementConstructor(this);
        component.setId(this.getNextGridElementId());
        return component;
    }
    calculateMovePosition(viewPortMouseCoords, position) {
        const zoom = this.zoom;
        const delta = {
            x: (this.app.lastMousePosition.x - viewPortMouseCoords.x) / zoom,
            y: (this.app.lastMousePosition.y - viewPortMouseCoords.y) / zoom,
        };
        return {
            x: position.x - delta.x,
            y: position.y - delta.y,
        };
    }
    setZoom(zoom) {
        this.element.style.setProperty('--gridapp-zoom', zoom.toString());
    }
    updateZoom(moveDelta) {
        const zoom = moveDelta * this._zoomConfig.step;
        const currentZoom = this.zoom;
        const newZoom = Math.min(this._zoomConfig.max, Math.max(this._zoomConfig.min, currentZoom + zoom));
        this.setZoom(newZoom);
    }
    setOffset(offset) {
        this.element.style.setProperty('--gridapp-offset-x', offset.x.toString());
        this.element.style.setProperty('--gridapp-offset-y', offset.y.toString());
    }
    updateOffset(move) {
        const offset = this.offset;
        this.setOffset({
            x: offset.x - move.x,
            y: offset.y - move.y,
        });
    }
    setPointerInteractingElement(element) {
        this._pointerInteractingElement = element;
    }
    setFocusedComponent(component) {
        if (this._focusedComponent) {
            this._focusedComponent.toggleFocused(false);
        }
        this._focusedComponent = component;
        if (this._focusedComponent) {
            this._focusedComponent.toggleFocused(true);
            let currentElement = this._focusedComponent.element;
            while (currentElement.parentElement && currentElement.parentElement.closest('.app-grid')) {
                currentElement.parentElement.append(currentElement);
                currentElement = currentElement.parentElement;
            }
        }
    }
    setActiveTool(tool) {
        this.data.set('active-tool', tool);
    }
    onMouseDown(e) {
        const target = e.target;
        if (!target.closest('.app-grid'))
            return;
        // fix for mouse up outside window
        if (this._pointerInteractingElement) {
            this._pointerInteractingElement.gridAppInstance.toggleMoving(false);
            this._pointerInteractingElement = null;
        }
        for (const module of this._modules.values()) {
            module.onMouseDown(e);
        }
        if (this.activeTool === 'grab' && this.pointerInteractingElement === null) {
            this.setMoving('grid');
            this.setFocusedComponent(null);
        }
    }
    onMouseMove(e) {
        const target = e.target;
        if (!target.closest('.app-grid'))
            return;
        if (!this.app.mouseDown)
            return;
        for (const module of this._modules.values()) {
            module.onMouseMove(e);
        }
        if (this.isGridMoving) {
            const zoom = this.zoom;
            this.updateOffset({
                x: (this.app.lastMousePosition.x - e.clientX) / zoom,
                y: (this.app.lastMousePosition.y - e.clientY) / zoom,
            });
        }
    }
    onMouseUp(e) {
        const target = e.target;
        if (!target.closest('.app-grid'))
            return;
        if (!this.app.mouseDown)
            return;
        for (const module of this._modules.values()) {
            module.onMouseUp(e);
        }
        if (this.isGridMoving) {
            this.stopMoving();
        }
        this.setPointerInteractingElement(null);
    }
    onClick(e) {
        const target = e.target;
        if (!target.closest('.app-grid'))
            return;
        for (const module of this._modules.values()) {
            module.onClick(e);
        }
    }
    onWheelMove(e) {
        const target = e.target;
        if (!target.closest('.app-grid'))
            return;
        this.updateZoom(e.deltaY < 0 ? 1 : -1);
    }
    onKeyDown(_e) { }
    onKeyUp(_e) { }
    onContextMenu(_e) { }
    import(data) {
        this._currentElementId = data.currentElementId;
        this.setZoom(data.zoom);
        this.setOffset(data.offset);
        for (const elementData of data.elements) {
            const component = this.createElement(elementData.type, elementData.label);
            component.import(elementData);
            this.element.append(component.element);
        }
    }
    export() {
        const currentElementId = this._currentElementId;
        const zoom = this.zoom;
        const offset = this.offset;
        const elementsData = this.gridElements.map((component) => component.export());
        const modulesData = {};
        for (const [name, module] of this._modules.entries()) {
            modulesData[name] = module.export();
        }
        return {
            currentElementId: currentElementId,
            zoom: zoom,
            offset: offset,
            elements: elementsData,
            modules: modulesData,
        };
    }
}

class GridAppGridElement {
    constructor(grid, config) {
        this._grid = grid;
        this._element = document.createElement('div');
        this._element.gridAppInstance = this;
        this._data = new ElementData(this._element);
        this._data.set('type', config.type);
        this._data.set('label', config.label);
        this.setPosition({ x: 0, y: 0 });
        this.setMinSize({ w: 0, h: 0 });
        this.setSize({ w: 0, h: 0 });
        this.setBackgroundColor(config.defaultBackgroundColor);
        this.setTextColor(config.defaultTextColor);
    }
    get element() {
        return this._element;
    }
    get parentElement() {
        const parentElement = this._element.parentElement;
        if (!parentElement) {
            throw new Error('Element has no parent element.');
        }
        return parentElement;
    }
    get parent() {
        if (this.parentElement.gridAppInstance instanceof GridAppGrid) {
            return this.parentElement.gridAppInstance;
        }
        return this.parentElement.gridAppInstance.component;
    }
    get data() {
        return this._data;
    }
    get type() {
        const type = this._data.get('type');
        if (!type) {
            throw new Error('Element type is not set.');
        }
        return type;
    }
    get label() {
        const label = this._data.get('label');
        if (!label) {
            throw new Error('Element label is not set.');
        }
        return label;
    }
    get id() {
        const id = this._data.get('id');
        if (!id) {
            throw new Error('Element id is not set.');
        }
        return Number(id);
    }
    get grid() {
        return this._grid;
    }
    get position() {
        return {
            x: Number(this._element.style.getPropertyValue('--gridapp-element-x')),
            y: Number(this._element.style.getPropertyValue('--gridapp-element-y')),
        };
    }
    get minSize() {
        return {
            w: Number(this._element.style.getPropertyValue('--gridapp-element-min-w')),
            h: Number(this._element.style.getPropertyValue('--gridapp-element-min-h')),
        };
    }
    get size() {
        return {
            w: Number(this._element.style.getPropertyValue('--gridapp-element-w')),
            h: Number(this._element.style.getPropertyValue('--gridapp-element-h')),
        };
    }
    get isMoving() {
        return this._data.has('moving');
    }
    get backgroundColor() {
        const bgColor = this._element.style.getPropertyValue('--gridapp-element-bg-color');
        return bgColor.split(',').map(Number);
    }
    get textColor() {
        const textColor = this._element.style.getPropertyValue('--gridapp-element-text-color');
        return textColor.split(',').map(Number);
    }
    toggleMoving(value) {
        this._data.toggle('moving', value);
    }
    setMinSize(size) {
        this._element.style.setProperty('--gridapp-element-min-w', size.w.toString());
        this._element.style.setProperty('--gridapp-element-min-h', size.h.toString());
    }
    setSize(size) {
        this._element.style.setProperty('--gridapp-element-w', size.w.toString());
        this._element.style.setProperty('--gridapp-element-h', size.h.toString());
    }
    setId(value) {
        this._data.set('id', value.toString());
    }
    setPosition(position) {
        this._element.style.setProperty('--gridapp-element-x', position.x.toString());
        this._element.style.setProperty('--gridapp-element-y', position.y.toString());
    }
    setBackgroundColor(color) {
        this._element.style.setProperty('--gridapp-element-bg-color', color.join(', '));
    }
    setTextColor(color) {
        this._element.style.setProperty('--gridapp-element-text-color', color.join(', '));
    }
}

var CONNECTOR_TYPES;
(function (CONNECTOR_TYPES) {
    CONNECTOR_TYPES["INPUT"] = "input";
    CONNECTOR_TYPES["OUTPUT"] = "output";
})(CONNECTOR_TYPES || (CONNECTOR_TYPES = {}));
var RESIZE_TYPES;
(function (RESIZE_TYPES) {
    RESIZE_TYPES["LEFT"] = "left";
    RESIZE_TYPES["RIGHT"] = "right";
    RESIZE_TYPES["TOP"] = "top";
    RESIZE_TYPES["BOTTOM"] = "bottom";
})(RESIZE_TYPES || (RESIZE_TYPES = {}));

class GridAppComponentContainer {
    constructor(grid, _config) {
        this._grid = grid;
        this._element = document.createElement('div');
        this._element.gridAppInstance = this;
        this._element.classList.add(`app-component-container`);
    }
    get element() {
        return this._element;
    }
    get grid() {
        return this._grid;
    }
    get component() {
        const componentElement = this._element.closest('.app-element[data-type="component"]');
        if (!componentElement) {
            throw new Error('No grid component found for connector.');
        }
        return componentElement.gridAppInstance;
    }
}

class GridAppComponent extends GridAppGridElement {
    constructor(grid, config) {
        super(grid, config);
        this.element.classList.add('app-element');
        this.setMinSize(config.minSize);
        this.setSize(config.size);
        if (config.resize.length > 0) {
            const resizeElements = this._generateResizeElements(config.resize);
            this.element.append(...resizeElements);
        }
        if (config.container) {
            const container = new GridAppComponentContainer(this.grid, {});
            this.element.append(container.element);
        }
    }
    get isResizing() {
        return this.data.has('resizing');
    }
    get isFocused() {
        return this.data.has('focused');
    }
    get resizingType() {
        const resizingType = this.data.get('resizing');
        if (!resizingType) {
            throw new Error('Resizing type is not set.');
        }
        return resizingType;
    }
    get containerElement() {
        return this.element.querySelector('.app-component-container');
    }
    get container() {
        const containerElement = this.containerElement;
        if (!containerElement) {
            return null;
        }
        return containerElement.gridAppInstance;
    }
    _generateResizeElements(resizeConfig) {
        const resizeElements = [];
        for (const resizeType of resizeConfig) {
            const resizeElement = document.createElement('div');
            resizeElement.classList.add('app-component-resize');
            resizeElement.dataset['resizeType'] = resizeType;
            resizeElements.push(resizeElement);
        }
        return resizeElements;
    }
    _checkPositionInContainerBounds(position) {
        const parent = this.parent;
        console.log(parent);
        if (!(parent instanceof GridAppComponent)) {
            return true;
        }
        const container = parent.container;
        console.log(container);
        if (!container) {
            return true;
        }
        const componentSize = this.size;
        const containerRect = container.element.getBoundingClientRect();
        console.log('Container Rect:', containerRect);
        console.log('Position to check:', position);
        return (position.x >= 0 &&
            position.x + componentSize.w <= containerRect.width &&
            position.y >= 0 &&
            position.y + componentSize.h <= containerRect.height);
    }
    toggleFocused(value) {
        this.data.toggle('focused', value);
    }
    setResizing(value) {
        this.data.set('resizing', value);
    }
    stopResizing() {
        this.data.remove('resizing');
    }
    moveConnectionElements(delta) {
        const id = this.id;
        const startConnectionElements = this.grid.element.querySelectorAll(`[data-type="connection"][data-start-anchor-id="${id}"]`);
        for (const connectionElement of startConnectionElements) {
            const gridAppConnection = connectionElement.gridAppInstance;
            const connectionStartPosition = gridAppConnection.position;
            const connectionEndPosition = gridAppConnection.endPosition;
            gridAppConnection.setPosition({
                x: connectionStartPosition.x - delta.x,
                y: connectionStartPosition.y - delta.y,
            });
            gridAppConnection.generateConnectionPath(connectionEndPosition);
        }
        const endConnectionElements = this.grid.element.querySelectorAll(`[data-type="connection"][data-end-anchor-id="${id}"]`);
        for (const connectionElement of endConnectionElements) {
            const gridAppConnection = connectionElement.gridAppInstance;
            const connectionEndPosition = gridAppConnection.endPosition;
            gridAppConnection.generateConnectionPath({
                x: connectionEndPosition.x - delta.x,
                y: connectionEndPosition.y - delta.y,
            });
        }
    }
    move(e) {
        const zoom = this.grid.zoom;
        const position = this.position;
        const delta = {
            x: (this.grid.app.lastMousePosition.x - e.clientX) / zoom,
            y: (this.grid.app.lastMousePosition.y - e.clientY) / zoom,
        };
        const newPosition = {
            x: position.x - delta.x,
            y: position.y - delta.y,
        };
        if (this._checkPositionInContainerBounds(newPosition)) {
            this.setPosition(newPosition);
            this.moveConnectionElements(delta);
        }
    }
    resize(e) {
        const zoom = this.grid.zoom;
        const position = this.position;
        const resizingType = this.resizingType;
        const size = this.size;
        const minSize = this.minSize;
        const delta = {
            x: (this.grid.app.lastMousePosition.x - e.clientX) / zoom,
            y: (this.grid.app.lastMousePosition.y - e.clientY) / zoom,
        };
        switch (resizingType) {
            case RESIZE_TYPES.LEFT:
                if (size.w + delta.x < minSize.w) {
                    delta.x = minSize.w - size.w;
                }
                this.setSize({ w: size.w + delta.x, h: size.h });
                this.setPosition({ x: position.x - delta.x, y: position.y });
                break;
            case RESIZE_TYPES.RIGHT:
                this.setSize({ w: size.w - delta.x, h: size.h });
                break;
            case RESIZE_TYPES.TOP:
                if (size.h + delta.y < minSize.h) {
                    delta.y = minSize.h - size.h;
                }
                this.setSize({ w: size.w, h: size.h + delta.y });
                this.setPosition({ x: position.x, y: position.y - delta.y });
                break;
            case RESIZE_TYPES.BOTTOM:
                this.setSize({ w: size.w, h: size.h - delta.y });
                break;
            default:
                throw new Error(`Invalid resize type: ${resizingType}`);
        }
        this.moveConnectionElements(delta);
    }
    onMouseDown(e) {
        const target = e.target;
        switch (this.grid.activeTool) {
            case 'grab': {
                this.grid.setPointerInteractingElement(this.element);
                this.toggleMoving(true);
                this.grid.setMoving('element');
                break;
            }
            case 'resize': {
                if (target.classList.contains('app-component-resize')) {
                    const resizeType = target.dataset['resizeType'];
                    if (!resizeType) {
                        throw new Error('Resize type is not set.');
                    }
                    this.grid.setPointerInteractingElement(this.element);
                    this.setResizing(resizeType);
                }
                break;
            }
        }
    }
    onMouseMove(e) {
        if (this.isMoving) {
            this.move(e);
        }
        else if (this.isResizing) {
            this.resize(e);
        }
    }
    onMouseUp(e) {
        const target = e.target;
        const targetComponentContainerElement = target.closest('.app-element[data-type="component"] > .app-component-container');
        if (targetComponentContainerElement) {
            const componentElement = targetComponentContainerElement.closest('.app-element[data-type="component"]');
            if (!componentElement) {
                throw new Error('Component element not found.');
            }
            if (this.parentElement !== targetComponentContainerElement) {
                const component = componentElement.gridAppInstance;
                if (confirm(`Place ${this.type} component inside this ${component.type} component container?`)) {
                    targetComponentContainerElement.append(this.element);
                    this.setPosition({ x: 0, y: 0 });
                }
            }
        }
        this.toggleMoving(false);
        this.grid.stopMoving();
        this.stopResizing();
    }
    onClick(_e) { }
    onWheelMove(_e) { }
    onKeyDown(_e) { }
    onKeyUp(_e) { }
}

class GridAppGroupComponent extends GridAppComponent {
    constructor(grid) {
        super(grid, {
            type: 'component',
            label: 'group',
            defaultBackgroundColor: [40, 46, 48],
            defaultTextColor: [0, 0, 0],
            size: { w: 200, h: 200 },
            minSize: { w: 100, h: 100 },
            resize: [RESIZE_TYPES.LEFT, RESIZE_TYPES.RIGHT, RESIZE_TYPES.TOP, RESIZE_TYPES.BOTTOM],
            container: true,
        });
    }
    copy() {
        const newComponent = this.grid.createElement(this.type, this.label);
        newComponent.setPosition(this.position);
        newComponent.setBackgroundColor(this.backgroundColor);
        newComponent.setTextColor(this.textColor);
        return newComponent;
    }
    import(data) {
        this.setId(data.id);
        this.setPosition(data.position);
        this.setSize(data.size);
        this.setBackgroundColor(data.backgroundColor);
        this.setTextColor(data.textColor);
    }
    export() {
        const id = this.id;
        const type = this.type;
        const label = this.label;
        const position = this.position;
        const size = this.size;
        const backgroundColor = this.backgroundColor;
        const textColor = this.textColor;
        return {
            id: id,
            type: type,
            label: label,
            position: { x: position.x, y: position.y },
            size: { w: size.w, h: size.h },
            backgroundColor: backgroundColor,
            textColor: textColor,
        };
    }
}

export { GridAppGroupComponent };
