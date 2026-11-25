export type Point = { x: number; y: number };
export const CAT_ASPECT = .61;
const JOINTS = 32;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const smooth = (n: number) => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };

/** All bones retain their length. A grab straightens the portion before the grip. */
export class TailRig {
  readonly points: Point[] = Array.from({ length: JOINTS + 1 }, () => ({ x: 0, y: 0 }));
  private angles = new Float32Array(JOINTS);
  private velocities = new Float32Array(JOINTS);
  private root: Point = { x: .66, y: .53 };
  private grab: { at: number; initial: Point; point: Point } | null = null;
  private length = .315;
  private bendSign = -1;
  radius = .026;

  configure(root: Point, plume: boolean, belly: boolean) {
    this.root = root;
    this.length = 1.04 - root.x;
    this.radius = plume ? .039 : .023;
    this.bendSign = belly ? 1 : -1;
    this.grab = null;
    this.velocities.fill(0);
    for (let i = 0; i < JOINTS; i++) this.angles[i] = this.restAngle(i / (JOINTS - 1));
    this.step(0, 0, true);
  }

  private restAngle(t: number) {
    return this.bendSign * (2.37 * smooth((t - .14) / .86) - .17);
  }

  nearest(point: Point) {
    let at = 0, distance = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]!;
      const d = Math.hypot(point.x - p.x, (point.y - p.y) * CAT_ASPECT);
      if (d < distance) { distance = d; at = i / JOINTS; }
    }
    return { at, distance };
  }

  get held() { return this.grab !== null; }
  get gripPoint() {
    if (!this.grab) return null;
    const index = Math.round(this.grab.at * JOINTS);
    return { point: this.points[index]!, angle: this.angles[Math.min(index, JOINTS - 1)]! };
  }
  shouldReturnToBody(point: Point) { return point.x < this.root.x - .05; }
  hold(at: number, point: Point) { this.grab = { at, initial: point, point }; }
  drag(point: Point) { if (this.grab) this.grab.point = point; }
  release() { this.grab = null; }

  step(dt: number, time: number, reducedMotion: boolean) {
    const grab = this.grab;
    let straightness = 0, direction = 0;
    if (grab) {
      const x = grab.point.x - this.root.x;
      const y = (grab.point.y - this.root.y) * CAT_ASPECT;
      const pull = grab.point.x - grab.initial.x;
      const reach = Math.hypot(x, y) / Math.max(.07, this.length * grab.at);
      straightness = Math.max(smooth(pull / .13), .92 * smooth((reach - .74) / .27) * smooth(Math.abs(pull) / .035));
      direction = clamp(Math.atan2(y, Math.max(.06, x)), -.78, .78);
    }
    let x = this.root.x, y = this.root.y;
    const bone = this.length / JOINTS;
    for (let i = 0; i < JOINTS; i++) {
      Object.assign(this.points[i]!, { x, y });
      const t = i / (JOINTS - 1);
      const swish = reducedMotion ? 0 : Math.sin(time * 1.26 - t * 1.9) * t * .20;
      const rest = this.restAngle(t) + swish;
      const fraction = grab ? straightness * (1 - .40 * smooth((t - grab.at) / .34) * (1 - straightness)) : 0;
      const target = rest + fraction * (direction - rest);
      const error = this.angles[i]! - target;
      const rate = grab ? 22 : 10 + 4 * (1 - t);
      const inertia = this.velocities[i]! + rate * error;
      const decay = Math.exp(-rate * dt);
      this.angles[i] = target + (error + inertia * dt) * decay;
      this.velocities[i] = (this.velocities[i]! - rate * inertia * dt) * decay;
      x += Math.cos(this.angles[i]!) * bone;
      y += Math.sin(this.angles[i]!) * bone / CAT_ASPECT;
    }
    Object.assign(this.points[JOINTS]!, { x, y });
  }
}
