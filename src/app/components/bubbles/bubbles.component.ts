import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';
import { Bubble } from 'src/app/models/bubble.model';

@Component({
  selector: 'app-bubbles',
  templateUrl: './bubbles.component.html',
  styleUrls: ['./bubbles.component.scss']
})
export class BubblesComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  email: string = this.infos.email;
  phone: string = this.infos.phone;
  ctx: CanvasRenderingContext2D;
  animationFrameId: any;
  bubbles: Bubble[] = [];
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
  playing: boolean = false;
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
  interval: any;
  // maxBubbles: number = 20;
  maxBlackBubbles: number = 8;

  constructor(
    private infos: InfosService
  ) { }

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
    // this.colors.forEach(color => {
    //   this.bubbles.push(new Bubble(this.ctx, color));
    // });
    // let index: number = 0;
    // this.interval = setInterval(() => {
    //   this.bubbles.push(new Bubble(this.ctx, this.colors[index]));
    //   index++;
    //   if (index >= this.maxBubbles) {
    //     clearInterval(this.interval);
    //   }
    // }, 50);


    const distance1: number = 1000;
    const step1: number = distance1 / this.colors.length;
    const left1 = (this.ctx.canvas.width - distance1) / 2;

    const distance2: number = 1200;
    const step2: number = distance2 / this.maxBlackBubbles;
    const left2 = (this.ctx.canvas.width - distance2) / 2;

    let index1: number = 0;
    let index2: number = 0;

    this.interval = setInterval(() => {
      console.log('tick');
      if (this.colors[index1]) {
        this.bubbles.push(new Bubble(this.ctx, this.colors[index1], left1 + index1 * step1));
        index1++;
      } else {
        this.bubbles.push(new Bubble(this.ctx, 'black', left2 + index2 * step2));
        index2++;

        if (index2 == this.maxBlackBubbles) {
          clearInterval(this.interval);
        }
      }
      // if (index >= this.maxBlackBubbles) {
      //   clearInterval(this.interval);
      // }
    }, 50);

    requestAnimationFrame(this.animate.bind(this));
  }

  stop(): void {
    clearInterval(this.interval);
    this.bubbles = [];
    cancelAnimationFrame(this.animationFrameId);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  animate(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.bubbles.forEach(mob => {
      mob.moveRandom();
    });
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
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
