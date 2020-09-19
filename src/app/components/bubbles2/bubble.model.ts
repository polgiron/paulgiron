export class Bubble {
  private size: number = 20;
  private speed: number = 4;
  private angle: number = this.getRandomInt(0, 360) * Math.PI / 180;
  // private angle: number = 0;
  private angleDelta: number = 10;
  private maxSize: number = this.getRandomInt(10, 20) * devicePixelRatio;
  public opacity: number = 1;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private color: string = 'black',
    private x?: number,
    private y?: number
  ) {
    this.draw();
  }

  draw(): void {
    if (this.ctx.globalAlpha > this.opacity) {
      return;
    }
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
  }

  moveRandom(): void {
    // const plusOrMinus: number = Math.random() < .5 ? -1 : 1;
    // const newAngle: number = this.getRandomInt(0, this.angleDelta) * (Math.PI / 180) * plusOrMinus;
    const newAngle: number = this.getRandomInt(0, this.angleDelta) * (Math.PI / 180);
    this.angle += newAngle;
    const x: number = Math.cos(this.angle) * this.speed * devicePixelRatio;
    const y: number = Math.sin(this.angle) * this.speed * devicePixelRatio;

    if (this.size < this.maxSize) {
      this.size += 1 * devicePixelRatio;
    }

    if (this.speed > .1) {
      this.speed -= this.speed * this.getRandomInt(0, 6) * devicePixelRatio / 100;
    }

    if (this.angleDelta < 5) {
      this.angleDelta += 1;
    }

    if (this.opacity > 0) {
      this.opacity -= .02;
    }

    this.ctx.globalAlpha = this.opacity;
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

  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
