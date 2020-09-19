import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Bubble } from './bubble.model';

@Component({
  selector: 'app-bubbles2',
  templateUrl: './bubbles2.component.html',
  styleUrls: ['./bubbles2.component.scss']
})
export class Bubbles2Component implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  animationFrameId: any;
  bubbles: Bubble[] = [];
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
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
  maxBlackBubbles: number = 8;
  tick: number = 0;

  constructor() { }

  @HostListener('window:resize') onScroll(): void {
    this.initCanvas();
    this.stop();
    this.start();
  };

  // @HostListener('document:mousemove', ['$event']) onMouseMove(event: MouseEvent): void {
  //   if (this.tick % 5 == 0) {
  //     this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], event.clientX, event.clientY));
  //   }
  // };

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
    // this.ctx.globalAlpha = .8;
  }

  start(): void {
    // this.startPoppingColors();
    requestAnimationFrame(this.animate.bind(this));
    // this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], 400, 400));
    // this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], 400, 400));
    // this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], 400, 400));
  }

  stop(): void {
    this.bubbles = [];
    cancelAnimationFrame(this.animationFrameId);
    this.clearCanvas();
  }

  animate(): void {
    this.tick++;
    this.clearCanvas();
    this.bubbles = this.bubbles.filter(bubble => bubble.opacity > 0);
    this.bubbles.forEach(bubble => {
      // console.log(bubble.opacity);
      bubble.moveRandom();
      // bubble.draw();
    });
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    // this.ctx.globalAlpha = 1;
  }

  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  onClickButton(event: MouseEvent): void {
    const target: HTMLButtonElement = <HTMLButtonElement>event.target;
    const top: number = target.offsetTop + target.clientHeight / 2;
    const left: number = target.offsetLeft + target.clientWidth / 2;
    this.popBubbles(left, top, 32);
  }

  popBubbles(x: number, y: number, numberOfBubbles: number): void {
    // let i: number = 0;
    // const interval = setInterval(() => {
    //   i++;
    //   this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], x, y));
    //   if (i == numberOfBubbles) {
    //     clearInterval(interval);
    //   }
    // }, 10);

    for (let i = 0; i < numberOfBubbles; i++) {
      this.bubbles.push(new Bubble(this.ctx, this.colors[this.getRandomInt(0, this.colors.length - 1)], x, y));
    }
  }
}
