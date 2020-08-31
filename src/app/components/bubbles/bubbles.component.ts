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
  tick: number = 0;
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
  maxBubbles: number = 22;
  // devicePixelRatio: number = 1;

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
    // this.devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.nativeElement.width = this.canvasWidth * devicePixelRatio;
    this.canvas.nativeElement.height = this.canvasHeight * devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx.globalAlpha = .8;
    console.log(this.ctx.canvas.height / devicePixelRatio);
  }

  start(): void {
    // this.colors.forEach(color => {
    //   this.bubbles.push(new Bubble(this.ctx, color));
    // });
    let index: number = 0;
    this.interval = setInterval(() => {
      this.bubbles.push(new Bubble(this.ctx, this.colors[index]));
      // this.bubbles.push(new Bubble(this.ctx));
      index++;
      if (index >= this.maxBubbles) {
        clearInterval(this.interval);
      }
    }, 50);
    requestAnimationFrame(this.animate.bind(this));
  }

  stop(): void {
    this.bubbles = [];
    cancelAnimationFrame(this.animationFrameId);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  animate(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.tick++;
    this.bubbles.forEach(mob => {
      mob.moveRandom();
    });

    // if (this.ctx.globalAlpha < 0.6) {
    //   this.ctx.globalAlpha += .01;
    // }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    // if (this.tick == 500) {
    //   this.pause();
    // }
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
