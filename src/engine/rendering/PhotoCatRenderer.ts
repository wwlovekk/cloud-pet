import { type PhotoSettings, type PhotoView } from "@/config/photo-cats";
import { publicAssetPath } from "@/lib/assets/public-path";
import { FurContact } from "./FurContact";
import { CAT_ASPECT as RATIO, TailRig, type Point } from "./TailRig";

const images = new Map<string, Promise<HTMLImageElement>>();
function readImage(url: string) {
  let pending = images.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { images.delete(url); reject(new Error(`Image unavailable: ${url}`)); };
      image.src = url;
    });
    images.set(url, pending);
  }
  return pending;
}
const VERTEX = `precision mediump float;
attribute vec2 aUv; attribute vec2 aPosition;
uniform vec4 uFrame; uniform vec2 uTouch; uniform vec2 uTravel;
uniform float uTime,uForce,uWidth,uRoll,uBody,uMotion;
varying vec2 vUv;
void main(){
 vUv=aUv; vec2 p=aPosition;
 if(uBody>.5){
  float waist=exp(-pow(abs((p.x-.46)/.20),4.))*smoothstep(.21,.32,p.x)*(1.-smoothstep(.64,.73,p.x));
  p.y+=(p.y-.51)*waist*(uWidth-1.);
  p.y+=(p.y-.51)*waist*sin(uTime*1.85)*.019*uMotion;
  vec2 d=aPosition-uTouch; vec2 metric=d*vec2(1.,.61);
  float load=exp(-dot(metric,metric)/.0065);
  float soft=mix(.46,1.,smoothstep(.19,.36,p.x));
  p-=d*load*uForce*.23*soft;
  p+=uTravel*load*uForce*vec2(.016,.025)*soft;
  p.y+=load*uForce*.018*soft;
  p.y-=(p.y-.51)*waist*uForce*.025;
  vec2 earDistance=vec2((p.x-.133)/.038,(abs(p.y-.475)-.14)/.035);
  float ear=exp(-dot(earDistance,earDistance));
  p.x+=sin(uTime*8.)*pow(max(0.,sin(uTime*.47)),36.)*ear*.006*uMotion;
 }
 p.y=(p.y-.48)*max(.11,abs(cos(uRoll*3.14159265)))+.48;
 p.x+=sin(uRoll*3.14159265)*(p.y-.48)*.03;
 vec2 at=uFrame.xy+p*uFrame.zw;
 gl_Position=vec4(at*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
}`;
const FRAGMENT = `precision mediump float;
uniform sampler2D uPhoto; uniform sampler2D uPile;
uniform vec2 uTouch,uTravel,uTexel;
uniform float uForce,uBody,uShadow;
varying vec2 vUv;
float luma(vec3 c){return dot(c,vec3(.24,.58,.18));}
void main(){
 vec2 d=(vUv-uTouch)*vec2(1.,.61);
 float load=exp(-dot(d,d)/.005)*max(0.,uForce)*uBody;
 vec3 pile=uBody>.5?texture2D(uPile,vUv).rgb:vec3(0.);
 vec2 brush=(pile.gb-vec2(128./255.))*2.;
 vec2 nap=vec2(1.,clamp((vUv.y-.51)*2.5,-.7,.7));
 float groove=sin(vUv.y*1500.+vUv.x*350.+sin(vUv.x*225.));
 vec2 slide=brush*pile.r*.010+nap*groove*pile.r*.0016;
 vec4 c=texture2D(uPhoto,vUv+slide+uTravel*load*.0018);
 if(uShadow>0.){vec2 blur=uTexel*(uShadow>.7?10.:4.);float a=c.a+texture2D(uPhoto,vUv+blur).a+texture2D(uPhoto,vUv-blur).a;gl_FragColor=vec4(.22,.17,.10,a*(uShadow>.7?.068:.046));return;}
 if(c.a<.006)discard;
 float nearby=luma(texture2D(uPhoto,vUv+slide+uTexel*nap*2.).rgb)-luma(texture2D(uPhoto,vUv+slide-uTexel*nap*2.).rgb);
 float slope=dot(d,vec2(-.7,-.72))*load*2.8;
 float against=clamp(-dot(brush,nap),-.65,.65)*pile.r;
 c.rgb*=1.-load*.20+slope+against*.24;
 c.rgb+=vec3(1.,.94,.84)*(max(0.,slope)*.13+nearby*.58*pile.r+groove*.009*pile.r+max(0.,against)*.026);
 gl_FragColor=vec4(c.rgb,c.a);
}`;

export class PhotoCatRenderer {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private uvBuffer: WebGLBuffer | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private textures: WebGLTexture[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private frameId = 0;
  private destroyed = false;
  private generation = 0;
  private started = performance.now();
  private previous = this.started;
  private pressed = false;
  private readonly fur = new FurContact();
  private readonly tailRig = new TailRig();
  private pileTexture: WebGLTexture | null = null;
  private pileDirty = false;
  private touch: Point = { x: -1, y: -1 };
  private travel: Point = { x: 0, y: 0 };
  private target: PhotoSettings;
  private view: PhotoView;
  private flipAt = 0;
  private flipping = false;
  private body: HTMLCanvasElement | null = null;
  private tail: HTMLCanvasElement | null = null;
  private mask: ImageData | null = null;
  private bodyMesh: { uv: Float32Array; idx: Uint16Array };
  private tailMesh: { uv: Float32Array; idx: Uint16Array };
  private tailPositions: Float32Array;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private frame = { x: 0, y: 0, w: 1, h: 1 };
  constructor(private canvas: HTMLCanvasElement, settings: PhotoSettings, private onReady: (ready: boolean) => void) {
    this.target = settings; this.view = settings.view;
    this.bodyMesh = this.grid(88, 54); this.tailMesh = this.grid(32, 4); this.tailPositions = new Float32Array(this.tailMesh.uv.length);
    this.gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: false, premultipliedAlpha: false });
    if (this.gl) this.initGL();
    void this.load(); this.draw();
  }
  private grid(cols: number, rows: number) { const uv: number[] = [], idx: number[] = []; for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) uv.push(x / cols, y / rows); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const a = y * (cols + 1) + x, b = a + cols + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } return { uv: new Float32Array(uv), idx: new Uint16Array(idx) }; }
  private initGL() {
    const gl = this.gl!, program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed"); gl.attachShader(program, shader); gl.deleteShader(shader); }
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) ?? "Shader link failed"); gl.useProgram(program); this.program = program;
    this.uvBuffer = gl.createBuffer(); this.positionBuffer = gl.createBuffer(); this.indexBuffer = gl.createBuffer();
    for (const [name, buffer] of [["aUv", this.uvBuffer], ["aPosition", this.positionBuffer]] as const) { gl.bindBuffer(gl.ARRAY_BUFFER, buffer); const attribute = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0); }
    for (const name of ["uPhoto", "uPile", "uFrame", "uTouch", "uTravel", "uTime", "uForce", "uWidth", "uRoll", "uBody", "uMotion", "uShadow", "uTexel"]) this.uniforms[name] = gl.getUniformLocation(program, name);
    for (let i = 0; i < 2; i++) { const texture = gl.createTexture()!; this.textures.push(texture); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.pileTexture = gl.createTexture();
    gl.uniform1i(this.uniforms.uPile!, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.pileTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.fur.width, this.fur.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.fur.texels);
    gl.activeTexture(gl.TEXTURE0);
  }
  private async load() {
    const generation = ++this.generation, { coat } = this.target, view = this.view;
    const folder = publicAssetPath(`/assets/photoreal/${coat}`);
    const bodyPromise = readImage(`${folder}/${view}.webp`);
    void readImage(`${folder}/${view === "back" ? "belly" : "back"}.webp`).catch(() => {});
    try {
      const [bodyImage, tailImage] = await Promise.all([bodyPromise, readImage(`${folder}/tail.webp`)]);
      if (generation !== this.generation || this.destroyed) return;
      const body = document.createElement("canvas"); body.width = 1517; body.height = 935; const context = body.getContext("2d")!;
      const width = Math.min(900, 567 * bodyImage.width / bodyImage.height);
      const height = width * bodyImage.height / bodyImage.width;
      const right = 1065;
      context.drawImage(bodyImage, right - width, 480 - height * .5, width, height);
      const tail = document.createElement("canvas"); tail.width = tailImage.width; tail.height = tailImage.height;
      tail.getContext("2d")!.drawImage(tailImage, 0, 0);
      this.body = body; this.tail = tail;
      const mask = document.createElement("canvas"); mask.width = 384; mask.height = 237; const mc = mask.getContext("2d", { willReadFrequently: true })!; mc.drawImage(body, 0, 0, 384, 237); this.mask = mc.getImageData(0, 0, 384, 237);
      this.tailRig.configure(this.findTailRoot(), ["ragdoll", "siberian", "norwegian"].includes(coat), view === "belly");
      this.fur.clear(); this.pileDirty = true;
      if (this.gl) for (const [i, photo] of [body, tail].entries()) { this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[i]!); this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, photo); }
      this.onReady(true);
    } catch { if (!this.destroyed && generation === this.generation) this.onReady(false); }
  }
  update(settings: PhotoSettings) {
    const coatChange = settings.coat !== this.target.coat, flip = settings.view !== this.target.view;
    this.target = settings;
    if (coatChange) { this.release(); this.view = settings.view; this.flipping = false; void this.load(); }
    else if (flip) { this.release(); this.flipAt = performance.now(); this.flipping = true; }
  }
  private alpha(x: number, y: number) {
    if (!this.mask || x < 0 || y < 0 || x >= 1 || y >= 1) return 0;
    return this.mask.data[(Math.floor(y * 237) * 384 + Math.floor(x * 384)) * 4 + 3] ?? 0;
  }
  private findTailRoot() {
    const y = this.view === "belly" ? .55 : .53;
    for (let x = .715; x > .44; x -= .004) {
      if (this.alpha(x, y) > 155 && this.alpha(x, y - .018) > 140 && this.alpha(x, y + .018) > 140) return { x: x - .031, y };
    }
    return { x: .62, y };
  }
  private poseTail(dt: number, time: number) {
    this.tailRig.step(dt, time, this.reduced);
    const points = this.tailRig.points, segments = points.length - 1;
    const band = this.tailRig.radius * 2.25;
    for (let i = 0; i < this.tailMesh.uv.length; i += 2) {
      const index = Math.round(this.tailMesh.uv[i]! * segments);
      const across = this.tailMesh.uv[i + 1]! - .5;
      const p = points[index]!, next = points[Math.min(segments, index + 1)]!, before = points[Math.max(0, index - 1)]!;
      const dx = next.x - before.x, dy = (next.y - before.y) * RATIO, length = Math.max(.00001, Math.hypot(dx, dy));
      this.tailPositions[i] = p.x - dy / length * across * band;
      this.tailPositions[i + 1] = p.y + dx / length * across * band / RATIO;
    }
  }
  contact(point: Point, down: boolean, direction: Point = { x: 0, y: 0 }) {
    const { x, y, w, h } = this.frame;
    if (!this.mask || this.flipping || w < 1 || h < 1) return null;
    const u = (point.x - x) / w, v = (point.y - y) / h;
    const local = { x: u, y: v };
    const waist = Math.exp(-Math.pow((u - .46) / .2, 4)) * (u > .26 && u < .71 ? 1 : 0);
    const bodyY = .51 + (v - .51) / (1 + waist * (this.target.width - 1));
    const inside = this.alpha(u, bodyY) > 55;
    const tail = this.tailRig.nearest(local);
    const onTail = !inside && tail.at > .12 && tail.distance < this.tailRig.radius + .022;
    if (this.tailRig.held && inside && this.tailRig.shouldReturnToBody(local)) this.tailRig.release();
    if (down && onTail && !this.tailRig.held) this.tailRig.hold(tail.at, local);
    if (this.tailRig.held && down) this.tailRig.drag(local);
    this.pressed = down && inside && !this.tailRig.held;
    if (this.pressed) { this.touch = { x: u, y: bodyY }; this.travel = direction; }
    if (onTail || this.tailRig.held) return "tail";
    return inside ? u < .27 ? "head" : this.view === "belly" ? "belly" : "spine" : null;
  }
  release() { this.pressed = false; this.tailRig.release(); }
  get gripAngle() { return this.tailRig.gripPoint?.angle ?? 0; }
  private draw = () => {
    if (this.destroyed) return;
    const now = performance.now(), dt = Math.min(.028, (now - this.previous) / 1000); this.previous = now;
    const currentBrush = this.pressed ? (this.view === "belly" ? 1.12 : .95) : 0;
    const activePile = this.fur.step(dt, this.touch, this.travel, currentBrush);
    if (!activePile && this.pileDirty) this.fur.clear();
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr); }
    const width = Math.min(w * .88, h / RATIO), height = width * RATIO;
    this.frame = { x: (w - width) * .25 + width * (1 - this.target.size) * .46, y: (h - height * this.target.size) * .5, w: width * this.target.size, h: height * this.target.size };
    let roll = 0;
    if (this.flipping) { roll = Math.min(1, (now - this.flipAt) / (this.reduced ? 180 : 680)); if (roll >= .5 && this.view !== this.target.view) { this.view = this.target.view; void this.load(); } if (roll >= 1) { this.flipping = false; roll = 0; } }
    const time = (now - this.started) / 1000;
    this.poseTail(dt, time);
    const gl = this.gl;
    if (gl && this.body && this.tail) {
      gl.useProgram(this.program); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const f = (name: string, value: number) => gl.uniform1f(this.uniforms[name]!, value);
      const at = this.frame;
      gl.uniform2f(this.uniforms.uTouch!, this.fur.center.x, this.fur.center.y);
      gl.uniform2f(this.uniforms.uTravel!, this.fur.drag.x, this.fur.drag.y);
      f("uTime", time); f("uForce", this.fur.depth); f("uWidth", this.target.width); f("uRoll", roll); f("uMotion", this.reduced ? 0 : 1);
      if (activePile || this.pileDirty) {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.pileTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.fur.width, this.fur.height, gl.RGBA, gl.UNSIGNED_BYTE, this.fur.texels);
        gl.activeTexture(gl.TEXTURE0);
      }
      this.pileDirty = activePile;
      const draw = (body: boolean) => {
        const mesh = body ? this.bodyMesh : this.tailMesh;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, body ? mesh.uv : this.tailPositions, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.DYNAMIC_DRAW); gl.bindTexture(gl.TEXTURE_2D, this.textures[body ? 0 : 1]!); f("uBody", body ? 1 : 0);
        const photo = body ? this.body! : this.tail!;
        gl.uniform2f(this.uniforms.uTexel!, 1 / photo.width, 1 / photo.height);
        for (const shadow of [1, .5, 0]) {
          gl.uniform4f(this.uniforms.uFrame!, (at.x + shadow * 4) / w, (at.y + shadow * 10) / h, at.w / w, at.h / h);
          f("uShadow", shadow); gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
        }
      };
      draw(false); draw(true);
    } else if (!gl && this.body && this.tail) {
      this.drawFallback(dpr, roll);
    }
    this.frameId = requestAnimationFrame(this.draw);
  };
  private drawFallback(dpr: number, roll: number) {
    const context = this.canvas.getContext("2d");
    if (!context || !this.body || !this.tail) return;
    const { x, y, w, h } = this.frame;
    const turn = Math.max(.11, Math.abs(Math.cos(roll * Math.PI)));
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(dpr, 0, 0, dpr * turn, x * dpr, (y + h * .48 * (1 - turn)) * dpr);
    const points = this.tailRig.points;
    const count = points.length - 1;
    const band = w * this.tailRig.radius * 2.25;
    for (let i = 0; i < count; i++) {
      const a = points[i]!, b = points[i + 1]!;
      const dx = (b.x - a.x) * w, dy = (b.y - a.y) * h;
      context.save();
      context.translate(a.x * w, a.y * h);
      context.rotate(Math.atan2(dy, dx));
      context.drawImage(this.tail, this.tail.width * i / count, 0, this.tail.width / count, this.tail.height, 0, -band / 2, Math.hypot(dx, dy) + .55, band);
      context.restore();
    }
    context.drawImage(this.body, 0, 0, w, h);
  }
  destroy() { this.destroyed = true; ++this.generation; cancelAnimationFrame(this.frameId); if (this.gl) { for (const t of this.textures) this.gl.deleteTexture(t); this.gl.deleteTexture(this.pileTexture); for (const b of [this.uvBuffer, this.positionBuffer, this.indexBuffer]) this.gl.deleteBuffer(b); this.gl.deleteProgram(this.program); } }
}
