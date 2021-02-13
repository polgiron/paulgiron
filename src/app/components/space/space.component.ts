import { Component, OnInit } from '@angular/core';
import { fabric } from 'fabric';
import { Canvas, Circle } from 'fabric/fabric-impl';

const options: Options = {
  sunRadius: 60,
  colors: {
    main: '#ececec'
  }
};

@Component({
  selector: 'app-space',
  templateUrl: './space.component.html',
  styleUrls: ['./space.component.scss']
})
export class SpaceComponent implements OnInit {
  canvas: Canvas;
  lineSpacing: number = 56;
  canvasWidth: number = 600;
  canvasHeight: number = 600;
  // idAnimationFrame: number;

  constructor() { }

  ngOnInit(): void {
    this.initCanvas();
  }

  initCanvas(): void {
    if (!this.canvas) {
      this.canvas = new fabric.Canvas('canvas');
      this.canvas.selection = false;
      this.canvas.setWidth(this.canvasWidth);
      this.canvas.setHeight(this.canvasHeight);
      // this.addLines();

      // this.addCirc(this.canvasWidth / 2, this.canvasHeight / 2, options.sunRadius);
      // this.addCirc(this.canvasWidth / 2, this.canvasHeight / 2, 200);
      // this.addCirc(this.canvasWidth / 2, this.canvasHeight / 2, 250);
      // this.addCirc(this.canvasWidth / 2, this.canvasHeight / 2, 200);
      // this.addCirc(this.canvas.width / 2, this.canvas.height / 2, 100, 'red');
      this.addCirc(this.canvasWidth / 2, this.canvasHeight / 2, 160);

      this.canvas.renderAll();
    }
  }

  // addEventListeners(): void {
  //   this.canvas.on('mouse:over', (event: any) => {
  //     if (event.target && event.target.name == 'bar' && event.target.data.value != '') {
  //       this.hoverInfos = {
  //         top: event.target.top - 8,
  //         left: event.target.left + event.target.width + 8,
  //         value: event.target.data.value,
  //         subValue: event.target.data.subValue,
  //         date: event.target.data.date
  //       };
  //       this.ref.markForCheck();
  //     }
  //   });

  //   this.canvas.on('mouse:out', (event: any) => {
  //     if (event.target && event.target.name == 'bar') {
  //       this.hoverInfos = null;
  //       this.ref.markForCheck();
  //     }
  //   });
  // }

  addCirc(x: number, y: number, radius: number, gradientColor: string = 'black'): void {
    const circle: Circle = new fabric.Circle({
      left: x,
      top: y,
      // originX: 'center',
      // originY: 'center',
      radius: radius,
      fill: options.colors.main,
      selectable: false,
      hoverCursor: 'default',
      // opacity: .07
    });
    circle.set('fill', new fabric.Gradient({
      type: 'radial',
      // offsetX: -radius,
      // offsetY: -radius,
      coords: {
        x1: x,
        y1: y,
        r1: 0,
        x2: x,
        y2: y,
        r2: radius
      },
      colorStops: [
        {
          offset: '0',
          color: options.colors.main
        },
        {
          offset: '1',
          // color: 'black'
          color: gradientColor
          // color: '#DBDBDB'
        },
      ]
    }));
    this.canvas.add(circle);
  }

  // animate(): void {
  //   this.clearAnimation();
  //   const animate = () => {
  //     if (!this.idAnimationFrame) {
  //       return;
  //     }
  //     this.canvas.renderAll();
  //     requestAnimationFrame(animate);
  //   }
  //   this.idAnimationFrame = requestAnimationFrame(animate);
  // }

  // clearAnimation(): void {
  //   cancelAnimationFrame(this.idAnimationFrame);
  //   this.idAnimationFrame = null;
  // }
}

interface Options {
  sunRadius: number;
  colors: {
    main: string;
  };
}

interface Position {
  x: number;
  y: number;
}
