import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Particle } from './particle.model';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
  animationFrameId: any;
  star: Particle;

  constructor() { }

  ngOnInit(): void {
    this.initCanvas();
    this.start();
  }

  initCanvas(): void {
    this.canvas.nativeElement.width = this.canvasWidth * devicePixelRatio;
    this.canvas.nativeElement.height = this.canvasHeight * devicePixelRatio;
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  // startPoppingColors(): void {
  //   const distance: number = 500 * devicePixelRatio;
  //   const step: number = distance / (COLORS.length - 1);
  //   const left = (this.ctx.canvas.width - distance) / 2;
  //   let index: number = 0;

  //   let points: number[] = [];
  //   for (let i = 0; i < COLORS.length; i++) {
  //     points.push(left + i * step);
  //   }

  //   this.intervalColors = setInterval(() => {
  //     if (COLORS[index]) {
  //       const position: number = getRandomInt(0, points.length - 1);
  //       this.bubbles.push(new Bubble(this.ctx, COLORS[index], points[position]));
  //       points.splice(position, 1);
  //       index++;
  //     } else {
  //       clearInterval(this.intervalColors);
  //       // setTimeout(() => {
  //       this.startPoppingBlacks();
  //       // }, 300);
  //     }
  //   }, 50);
  // }

  // stop(): void {
  //   // clearInterval(this.intervalColors);
  //   // clearInterval(this.intervalBlacks);
  //   // this.intervalColors = null;
  //   // this.intervalBlacks = null;
  //   // this.bubbles = [];
  //   cancelAnimationFrame(this.animationFrameId);
  //   this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  // }

  animate(): void {
    // this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    // this.bubbles.forEach(mob => {
    //   mob.moveRandom();
    //   // mob.draw();
    // });
    this.star.moveTick();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  start(): void {
    this.star = new Particle(this.ctx, 200, 200);
    requestAnimationFrame(this.animate.bind(this));
  }
}
