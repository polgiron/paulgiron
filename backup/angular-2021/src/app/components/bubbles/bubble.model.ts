import { getRandomInt } from 'src/app/utils/utils';

export class Bubble {
  private size: number = 22 * devicePixelRatio;
  private speed: number = 5;
  private angle: number = getRandomInt(0, 360) * Math.PI / 180;
  private angleDelta: number = 0;
  private maxSize: number = this.ctx.canvas.height * .5;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private color: string = 'black',
    private x?: number,
    private y?: number
  ) {
    if (!x) {
      this.x = getRandomInt(this.ctx.canvas.width / 2 - 200 * devicePixelRatio, this.ctx.canvas.width / 2 + 200 * devicePixelRatio);
    }
    if (!y) {
      this.y = this.ctx.canvas.height / 2;
      // this.y = this.getRandomInt(this.ctx.canvas.height / 2 - 50 * devicePixelRatio, this.ctx.canvas.height / 2 + 50 * devicePixelRatio);
    }

    if (color == 'black') {
      this.y = getRandomInt(this.ctx.canvas.height / 2 - 100 * devicePixelRatio, this.ctx.canvas.height / 2 + 100 * devicePixelRatio);
      this.speed = 1;
      // this.size = 40 * devicePixelRatio;
    }

    this.draw();
  }

  draw(): void {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  moveRandom(): void {
    // const plusOrMinus: number = Math.random() < .5 ? -1 : 1;
    // const newAngle: number = this.getRandomInt(0, this.angleDelta) * (Math.PI / 180) * plusOrMinus;
    const newAngle: number = getRandomInt(0, this.angleDelta) * (Math.PI / 180);
    this.angle += newAngle;
    const x: number = Math.cos(this.angle) * this.speed * devicePixelRatio;
    const y: number = Math.sin(this.angle) * this.speed * devicePixelRatio;

    if (this.size < this.maxSize) {
      this.size += 5 * devicePixelRatio;
    }

    if (this.speed > 1) {
      this.speed -= this.speed * .8 * devicePixelRatio / 100;
    }

    if (this.angleDelta < 5) {
      this.angleDelta += .5;
    }

    this.move(x, y);
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;

    if (this.x + this.size / 2 > this.ctx.canvas.width) {
      this.angle += 45;
      this.x = this.ctx.canvas.width - this.size / 2;
    } else if (this.x - this.size / 2 < 0) {
      this.angle += 45;
      this.x = this.size / 2;
    }

    if (this.y + this.size / 2 > this.ctx.canvas.height) {
      this.angle += 45;
      this.y = this.ctx.canvas.height - this.size / 2;
    } else if (this.y - this.size / 2 < 0) {
      this.angle += 45;
      this.y = this.size / 2;
    }

    this.draw();
  }

  animateCurve(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, t0: number, t1: number): void {
    this.ctx.beginPath();

    if (0.0 == t0 && t1 == 1.0) {
      this.ctx.moveTo(x0, y0);
      this.ctx.quadraticCurveTo(x1, y1, x2, y2);
    } else if (t0 != t1) {
      var t00 = t0 * t0,
        t01 = 1.0 - t0,
        t02 = t01 * t01,
        t03 = 2.0 * t0 * t01;

      var nx0 = t02 * x0 + t03 * x1 + t00 * x2,
        ny0 = t02 * y0 + t03 * y1 + t00 * y2;

      t00 = t1 * t1;
      t01 = 1.0 - t1;
      t02 = t01 * t01;
      t03 = 2.0 * t1 * t01;

      var nx2 = t02 * x0 + t03 * x1 + t00 * x2,
        ny2 = t02 * y0 + t03 * y1 + t00 * y2;

      var nx1 = this.lerp(this.lerp(x0, x1, t0), this.lerp(x1, x2, t0), t1),
        ny1 = this.lerp(this.lerp(y0, y1, t0), this.lerp(y1, y2, t0), t1);

      this.ctx.moveTo(nx0, ny0);
      this.ctx.quadraticCurveTo(nx1, ny1, nx2, ny2);
    }

    this.ctx.stroke();
    this.ctx.closePath();
  }

  lerp(v0: number, v1: number, t: number): number {
    return (1.0 - t) * v0 + t * v1;
  }
}
