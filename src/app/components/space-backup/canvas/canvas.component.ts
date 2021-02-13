import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

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
  // star: Particle;
  meteors = [];

  config = {
    frequency: 1,
    angle: .95,
    age: 600,
    length: .1,
    thickness: .1
  }

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

  animate(time: number): void {
    const normH = this.canvasHeight / this.canvasWidth;
    this.ctx.fillStyle = '#5B5B5B';
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.scale(this.canvasWidth, this.canvasWidth);
    this.ctx.clearRect(0, 0, 1, normH);

    const r = Math.sqrt(1 + normH * normH) / 2;

    this.ctx.translate(1 / 2, normH / 2);
    this.ctx.rotate(this.config.angle * Math.PI * 2);

    for (var i = this.meteors.length; i--;) {
      var meteor = this.meteors[i];
      var age = time - meteor.time;

      if (age > this.config.age * (1 + this.config.length)) {
        continue;
      }

      var x = (age / this.config.age - 0.5) * r * 2;
      var y = (meteor.p - 0.5) * normH;

      this.ctx.beginPath();
      this.ctx.arc(x, y, this.config.thickness / 100 / 2, Math.PI / 2, -Math.PI / 2, true);
      this.ctx.lineTo(x - this.config.length * 2 * r, y);
      this.ctx.fill();
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);


    if (Math.random() < this.config.frequency / 100) {
      this.meteors.push({
        p: Math.random(),
        time: time
      });
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  start(): void {
    // this.star = new Particle(this.ctx, 200, 200);
    requestAnimationFrame(this.animate.bind(this));
  }
}
