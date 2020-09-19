import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Entity } from 'src/app/models/entity.model';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  animationFrameId: any;
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
  entities: Entity[] = [];
  colors: string[] = [
    '#1abc9c',
    '#2ecc71',
    '#3498db',
    '#9b59b6',
    '#16a085',
    '#27ae60',
    '#2980b9',
    '#8e44ad',
    '#f1c40f',
    '#e67e22',
    '#e74c3c',
    '#f39c12',
    '#d35400',
    '#c0392b'
  ];

  constructor() { }

  @HostListener('window:resize') onScroll(): void {
    this.initCanvas();
    this.stop();
    this.start();
  };

  ngOnInit(): void {
    this.initCanvas();
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  initCanvas(): void {
    this.canvas.nativeElement.width = this.canvasWidth * devicePixelRatio;
    this.canvas.nativeElement.height = this.canvasHeight * devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.globalAlpha = .8;
  }

  start(): void {
    this.addEntities();
    requestAnimationFrame(this.animate.bind(this));
  }

  addEntities(): void {
    const numberOfCells: number = 5000;
    const cellWidth: number = this.split(this.canvasWidth, this.canvasHeight, numberOfCells);
    console.log('cellWidth', cellWidth);
    for (let index = 0; index < this.ctx.canvas.width / cellWidth; index++) {
      for (let index2 = 0; index2 < this.ctx.canvas.height / cellWidth; index2++) {
        this.entities.push(new Entity(this.ctx, index * (cellWidth - 1) * devicePixelRatio, index2 * (cellWidth - 1) * devicePixelRatio, cellWidth * devicePixelRatio));
      }
    }
  }

  stop(): void {
    // clearInterval(this.intervalBlacks);
    // this.intervalBlacks = null;
    this.entities = [];
    cancelAnimationFrame(this.animationFrameId);
    this.clearCanvas();
  }

  animate(): void {
    // this.clearCanvas();

    const entity = this.entities[this.getRandomInt(0, this.entities.length - 1)];
    entity.color = this.colors[this.getRandomInt(0, this.colors.length - 1)];
    entity.draw();
    // this.entities.forEach(mob => {
    //   mob.draw();
    // });

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  split(w: number, h: number, n: number): number {
    // L x h = N x a ^ 2
    return Math.sqrt(w * h / n);
  }

  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // getEase(currentProgress: number, start: number, distance: number, steps: number): number {
  //   currentProgress /= steps / 2;
  //   if (currentProgress < 1) {
  //     return (distance / 2) * (Math.pow(currentProgress, 3)) + start;
  //   }
  //   currentProgress -= 2;
  //   return distance / 2 * (Math.pow(currentProgress, 3) + 2) + start;
  // }
}
