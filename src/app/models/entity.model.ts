export class Entity {
  color: string = 'black';

  constructor(
    private ctx: CanvasRenderingContext2D,
    private x: number,
    private y: number,
    public size: number
  ) {
    this.draw();
  }

  draw(): void {
    this.ctx.beginPath();
    this.ctx.fillStyle = this.color;
    this.ctx.rect(this.x, this.y, this.size, this.size);
    this.ctx.fill();
  }
}
