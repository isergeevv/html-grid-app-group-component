import { GridAppGrid, GridAppComponent, RESIZE_TYPES } from '@isergeevv/html-grid-app-base';
import type { GridAppComponentElementData } from '@isergeevv/html-grid-app-base';

export class GridAppGroupComponent extends GridAppComponent {
  constructor(grid: GridAppGrid) {
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

  copy(): GridAppGroupComponent {
    const newComponent = this.grid.createElement(this.type, this.label) as GridAppGroupComponent;

    newComponent.setPosition(this.position);
    newComponent.setBackgroundColor(this.backgroundColor);
    newComponent.setTextColor(this.textColor);

    return newComponent;
  }

  import(data: GridAppComponentElementData): void {
    this.setId(data.id);
    this.setPosition(data.position);
    this.setSize(data.size);
    this.setBackgroundColor(data.backgroundColor);
    this.setTextColor(data.textColor);
  }

  export(): GridAppComponentElementData {
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
