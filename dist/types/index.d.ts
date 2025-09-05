import { GridAppComponent, GridAppGrid, GridAppComponentElementData } from '@isergeevv/html-grid-app-base';

declare class GridAppGroupComponent extends GridAppComponent {
    constructor(grid: GridAppGrid);
    copy(): GridAppGroupComponent;
    import(data: GridAppComponentElementData): void;
    export(): GridAppComponentElementData;
}

export { GridAppGroupComponent };
