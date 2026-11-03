import { getRandomInt } from 'src/app/utils/utils';

export class Particle {
  private size: number = 1 * devicePixelRatio;
  private speed: number = 1;
  // private angle: number = getRandomInt(0, 360) * Math.PI / 180;
  private angle: number = -25 * Math.PI / 180;
  private color: string = 'red';

  constructor(
    private ctx: CanvasRenderingContext2D,
    // private color: string = 'black',
    private x?: number,
    private y?: number
  ) {
    // if (!x) {
    //   this.x = getRandomInt(this.ctx.canvas.width / 2 - 200 * devicePixelRatio, this.ctx.canvas.width / 2 + 200 * devicePixelRatio);
    // }
    // if (!y) {
    //   this.y = this.ctx.canvas.height / 2;
    //   // this.y = this.getRandomInt(this.ctx.canvas.height / 2 - 50 * devicePixelRatio, this.ctx.canvas.height / 2 + 50 * devicePixelRatio);
    // }

    // if (color == 'black') {
    //   this.y = getRandomInt(this.ctx.canvas.height / 2 - 100 * devicePixelRatio, this.ctx.canvas.height / 2 + 100 * devicePixelRatio);
    //   this.speed = 1;
    //   // this.size = 40 * devicePixelRatio;
    // }

    // this.draw();
  }

  draw(): void {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.draw();
  }

  moveTick(): void {
    const x: number = Math.cos(this.angle) * this.speed * devicePixelRatio;
    const y: number = Math.sin(this.angle) * this.speed * devicePixelRatio;

    // if (this.speed > 1) {
    //   this.speed -= this.speed * .8 * devicePixelRatio / 100;
    // }

    this.move(x, y);
  }
}
