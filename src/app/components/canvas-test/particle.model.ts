import { getRandomInt } from 'src/app/utils/utils';

export class Particle {
  // private speed: number = getRandomInt(20, 200) / 10;
  private speed: number = 1;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private x: number,
    private y: number,
    private radius: number,
    private size: number = getRandomInt(30, 60),
    private isMoon: boolean = false
  ) {
    this.draw();
  }

  rotate(): void {
    this.ctx.translate(this.x, this.y);
    const time = new Date();
    this.ctx.rotate(((2 * Math.PI) / 60) * this.speed * time.getSeconds() + ((2 * Math.PI) / 60000) * this.speed * time.getMilliseconds());
  }

  drawCircle(): void {
    const gradient = this.ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, '#ECECEC');
    gradient.addColorStop(1, 'black');

    this.ctx.save();

    // if (this.isMoon) {
    //   this.rotate();
    // }

    this.ctx.globalAlpha = .07;
    this.ctx.beginPath();

    // if (this.isMoon) {
    //   this.ctx.arc(0, this.y, this.radius, 0, 2 * Math.PI);
    // } else {
      this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    // }

    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPlanet(): void {
    this.ctx.save();

    this.rotate();

    this.ctx.globalAlpha = .6;
    this.ctx.beginPath();
    this.ctx.arc(0, this.radius, this.size, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'black';
    this.ctx.fill();


    this.ctx.restore();
  }

  draw(): void {
    this.drawCircle();
    this.drawPlanet();
  }
}

export class Star {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private x: number,
    private y: number,
    private radius: number
  ) {
    this.draw();
  }

  draw(): void {
    this.ctx.globalAlpha = .6;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'black';
    this.ctx.fill();
  }
}
