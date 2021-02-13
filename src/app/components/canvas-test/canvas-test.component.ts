import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Particle, Star } from './particle.model';

@Component({
  selector: 'app-canvas-test',
  templateUrl: './canvas-test.component.html',
  styleUrls: ['./canvas-test.component.scss']
})
export class CanvasTestComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number = window.innerWidth;
  canvasHeight: number = window.innerHeight;
  animationFrameId: any;
  star: Star;
  planets: Particle[] = [];

  constructor() { }

  ngOnInit(): void {
    this.initCanvas();
    this.start();
  }

  initCanvas(): void {
    this.canvas.nativeElement.width = this.canvasWidth * devicePixelRatio;
    this.canvas.nativeElement.height = this.canvasHeight * devicePixelRatio;
    this.canvas.nativeElement.style.width = this.canvasWidth + 'px';
    this.canvas.nativeElement.style.height = this.canvasHeight + 'px';
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

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
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.star.draw();
    this.planets.forEach(planet => {
      planet.draw();
    });
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  start(): void {
    this.star = new Star(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 150);
    this.planets.push(new Particle(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 300));
    this.planets.push(new Particle(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 450));
    this.planets.push(new Particle(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 600));
    this.planets.push(new Particle(this.ctx, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 750));
    this.planets.push(new Particle(this.ctx, this.ctx.canvas.width / 2 - 750, this.ctx.canvas.height / 2, 100, 20, true));

    requestAnimationFrame(this.animate.bind(this));
  }
}
