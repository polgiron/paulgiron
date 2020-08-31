export class Bubble {
  // private size: number = 20;
  // private size: number = this.getRandomInt(40, 60);
  private size: number = 100;
  // private x: number = this.getRandomInt(0, this.ctx.canvas.width);
  // private y: number = this.getRandomInt(0, this.ctx.canvas.height);
  private x: number = this.getRandomInt(this.ctx.canvas.width / 2 - 400, this.ctx.canvas.width / 2 + 400);
  private y: number = this.getRandomInt(this.ctx.canvas.height / 2 - 100, this.ctx.canvas.height / 2 + 100);
  // private x: number = this.ctx.canvas.width / 2 - this.size / 2;
  // private y: number = this.ctx.canvas.height / 2 - this.size / 2;
  private speed: number = 10;
  private angle: number = this.getRandomInt(0, 360) * Math.PI / 180;
  // private angle: number = 0;
  private angleDelta: number = 5;
  // private angleDelta: number = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private color: string = 'black'
  ) {
    this.draw();
  }

  private draw(): void {
    // this.ctx.fillRect(this.x, this.y, 20, 20);
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
    const x: number = Math.cos(this.angle) * this.speed;
    const y: number = Math.sin(this.angle) * this.speed;
    // console.log(Math.round(this.angle % 360));

    if (this.size < this.ctx.canvas.height * .65) {
      this.size += 5;
    }

    if (this.speed > 1) {
      this.speed -= this.speed * 1 / 100;
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
