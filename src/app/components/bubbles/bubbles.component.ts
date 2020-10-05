import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { InfosService } from 'src/app/services/infos.service';
import { getRandomInt } from 'src/app/utils/utils';
import { COLORS } from 'src/app/utils/colors';
import { Bubble } from './bubble.model';

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
  intervalColors: any;
  intervalBlacks: any;
  maxBlackBubbles: number = 8;
  animateCanvas: boolean;

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
    this.startPoppingColors();
    requestAnimationFrame(this.animate.bind(this));
  }

  startPoppingColors(): void {
    const distance: number = 500 * devicePixelRatio;
    const step: number = distance / (COLORS.length - 1);
    const left = (this.ctx.canvas.width - distance) / 2;
    let index: number = 0;

    let points: number[] = [];
    for (let i = 0; i < COLORS.length; i++) {
      points.push(left + i * step);
    }

    this.intervalColors = setInterval(() => {
      if (COLORS[index]) {
        const position: number = getRandomInt(0, points.length - 1);
        this.bubbles.push(new Bubble(this.ctx, COLORS[index], points[position]));
        points.splice(position, 1);
        index++;
      } else {
        clearInterval(this.intervalColors);
        // setTimeout(() => {
          this.startPoppingBlacks();
        // }, 300);
      }
    }, 50);
  }

  startPoppingBlacks(): void {
    const distance: number = 600 * devicePixelRatio;
    const step: number = distance / (this.maxBlackBubbles - 1);
    const left = (this.ctx.canvas.width - distance) / 2;
    let index: number = 0;

    this.intervalBlacks = setInterval(() => {
      this.bubbles.push(new Bubble(this.ctx, 'black', left + index * step));
      index++;

      if (index == this.maxBlackBubbles) {
        clearInterval(this.intervalBlacks);
      }
    }, 50);
  }

  stop(): void {
    clearInterval(this.intervalColors);
    clearInterval(this.intervalBlacks);
    this.intervalColors = null;
    this.intervalBlacks = null;
    this.bubbles = [];
    cancelAnimationFrame(this.animationFrameId);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  animate(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.bubbles.forEach(mob => {
      mob.moveRandom();
      // mob.draw();
    });
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  onClickScroll(): void {
    this.animateCanvas = true;
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
