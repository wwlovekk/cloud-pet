import { CAT_ASPECT, type Point } from "./TailRig";

const WIDTH = 80;
const HEIGHT = 52;

/** A short-lived brushed-fur field. Red stores compression, green/blue store the brush direction. */
export class FurContact {
  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly texels = new Uint8Array(WIDTH * HEIGHT * 4);
  readonly center: Point = { x: .5, y: .5 };
  readonly drag: Point = { x: 0, y: 0 };
  depth = 0;
  private velocity = 0;
  private remaining = 0;

  constructor() { this.clear(); }

  clear() {
    for (let i = 0; i < this.texels.length; i += 4) {
      this.texels[i] = 0;
      this.texels[i + 1] = this.texels[i + 2] = 128;
      this.texels[i + 3] = 255;
    }
    this.depth = this.velocity = this.remaining = 0;
  }

  step(dt: number, point: Point, direction: Point, weight: number) {
    if (weight > 0 && this.depth < .02) Object.assign(this.center, point);
    const follow = 1 - Math.exp(-dt * 27);
    this.center.x += (point.x - this.center.x) * follow;
    this.center.y += (point.y - this.center.y) * follow;
    this.drag.x += (direction.x * weight - this.drag.x) * follow;
    this.drag.y += (direction.y * weight - this.drag.y) * follow;
    this.velocity += (220 * (weight - this.depth) - 19 * this.velocity) * dt;
    this.depth += this.velocity * dt;
    if (weight > 0) this.remaining = 1.7;
    else this.remaining -= dt;
    if (this.remaining <= 0) return false;

    const fade = Math.exp(-dt * 2.9);
    for (let i = 0; i < this.texels.length; i += 4) this.texels[i] = Math.round(Math.max(0, this.texels[i]! * fade - .45));
    if (weight <= 0) return true;

    const radius = .059;
    const cx = this.center.x * WIDTH, cy = this.center.y * HEIGHT;
    const halfX = radius * WIDTH * 2, halfY = radius / CAT_ASPECT * HEIGHT * 2;
    for (let y = Math.max(0, Math.floor(cy - halfY)); y < Math.min(HEIGHT, cy + halfY); y++) {
      for (let x = Math.max(0, Math.floor(cx - halfX)); x < Math.min(WIDTH, cx + halfX); x++) {
        const distance = ((x - cx) / WIDTH) ** 2 + ((y - cy) / HEIGHT * CAT_ASPECT) ** 2;
        const pressure = 255 * Math.exp(-distance / (radius * radius)) * weight;
        const i = (y * WIDTH + x) * 4;
        if (pressure < this.texels[i]!) continue;
        this.texels[i] = Math.min(255, Math.round(pressure));
        this.texels[i + 1] = 128 + Math.round(100 * this.drag.x);
        this.texels[i + 2] = 128 + Math.round(100 * this.drag.y);
      }
    }
    return true;
  }
}
