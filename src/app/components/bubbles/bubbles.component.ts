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
    '#c0392b',

    // '#1abc9c',
    // '#2ecc71',
    // '#3498db',
    // '#9b59b6',
    // '#16a085',
    // '#27ae60',
    // '#2980b9',
    // '#8e44ad',
    // '#f1c40f',
    // '#e67e22',
    // '#e74c3c',
    // '#f39c12',
    // '#d35400',
    // '#c0392b'
  ];
  intervalColors: any;
  intervalBlacks: any;
  // maxBubbles: number = 20;
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
    const step: number = distance / (this.colors.length - 1);
    const left = (this.ctx.canvas.width - distance) / 2;
    let index: number = 0;

    let points: number[] = [];
    for (let i = 0; i < this.colors.length; i++) {
      points.push(left + i * step);
    }

    this.intervalColors = setInterval(() => {
      if (this.colors[index]) {
        const position: number = this.getRandomInt(0, points.length - 1);
        this.bubbles.push(new Bubble(this.ctx, this.colors[index], points[position]));
        points.splice(position, 1);
        index++;
      } else {
        clearInterval(this.intervalColors);
        setTimeout(() => {
          this.startPoppingBlacks();
        }, 300);
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
