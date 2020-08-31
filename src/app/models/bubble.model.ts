export class Bubble {
  private size: number = 20 * devicePixelRatio;
  private speed: number = 5;
  private angle: number = this.getRandomInt(0, 360) * Math.PI / 180;
  private angleDelta: number = 0;
  private maxSize: number = this.ctx.canvas.height * .5;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private color: string = 'black',
    private x?: number,
    private y?: number
  ) {
    if (!x) {
      this.x = this.getRandomInt(this.ctx.canvas.width / 2 - 200 * devicePixelRatio, this.ctx.canvas.width / 2 + 200 * devicePixelRatio);
      // private y: number = this.getRandomInt(this.ctx.canvas.height / 2 - 100 * devicePixelRatio, this.ctx.canvas.height / 2 + 100 * devicePixelRatio);
    }
    if (!y) {
      this.y = this.ctx.canvas.height / 2;
    }

    if (color == 'black') {
      // this.x = this.getRandomInt(this.ctx.canvas.width / 2 - 300 * devicePixelRatio, this.ctx.canvas.width / 2 + 300 * devicePixelRatio);
      this.y = this.getRandomInt(this.ctx.canvas.height / 2 - 100 * devicePixelRatio, this.ctx.canvas.height / 2 + 100 * devicePixelRatio);
      this.speed = 1;
    }

    this.draw();
  }

  private draw(): void {
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

  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
