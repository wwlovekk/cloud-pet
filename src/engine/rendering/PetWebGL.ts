import { findBreed, findCoat } from "@/config/catalog";
import { createPetTexture } from "../procedural/pet-texture";
import type { PetConfiguration, PetRegion, Vec2 } from "@/types/pet";
import type { AssetManifest, ImageAsset } from "@/types/assets";

const vertex = `
precision mediump float;
attribute vec2 aPosition;
uniform vec2 uResolution;
uniform vec2 uContact;
uniform float uTime, uSize, uChubby, uPressure, uFlip, uShadow, uMotion, uBelly, uDog;
varying vec2 vUv;
void main(){
 vUv=aPosition; vec2 p=aPosition;
 float waist=exp(-pow((p.x-.535)/.17,4.))*smoothstep(.23,.36,p.x)*(1.-smoothstep(.70,.78,p.x));
 p.y+=(p.y-.5)*waist*((uChubby-.5)*.48+sin(uTime*1.95)*.019*uMotion);
 float tail=smoothstep(.735,.88,aPosition.x);
 p.y+=sin(uTime*(1.3+uPressure*2.)+(p.x-.75)*5.)*tail*(.012+uPressure*.02)*uMotion;
 p.x+=cos(uTime*1.1)*tail*.005*uMotion;
 float ear=exp(-pow((p.x-.21)/.055,2.))*smoothstep(.11,.19,abs(p.y-.5));
 p.x+=sin(uTime*7.)*pow(max(0.,sin(uTime*.65)),24.)*ear*.012*uMotion;
 float paw=uBelly*smoothstep(.12,.2,abs(aPosition.y-.5));
 p.x+=sin(uTime*(uDog>0.5?13.:5.))*paw*uPressure*.018*uMotion;
 vec2 d=aPosition-uContact; float f=exp(-dot(d*vec2(1.,1.6),d*vec2(1.,1.6))*100.);
 p+=d*f*uPressure*(uBelly>.5?.2:.13); p.y+=f*uPressure*.008;
 float turn=max(.12,abs(cos(uFlip*3.14159265)));
 p.y=(p.y-.5)*turn+.5; p.x+=sin(uFlip*3.14159265)*.015*sin(aPosition.y*3.14159);
 vec2 pos=(p-.5)*2.; pos*=uSize*.97;
 pos.y*=uResolution.x/(1.75*uResolution.y);
 pos.y+=uShadow*.024;
 gl_Position=vec4(pos.x,-pos.y,0.,1.);
}`;
const fragment = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uNight, uPressure, uShadow;
uniform vec2 uContact;
varying vec2 vUv;
void main(){
 vec4 c=texture2D(uTexture,vUv);
 if(uShadow>.5){float a=c.a; a+=texture2D(uTexture,vUv+vec2(.005,.008)).a; a+=texture2D(uTexture,vUv-vec2(.005,.008)).a; a+=texture2D(uTexture,vUv+vec2(-.005,.008)).a; gl_FragColor=vec4(.17,.12,.08,a*.055);return;}
 if(c.a<.01)discard;
 float d=length((vUv-uContact)*vec2(1.,1.65));
 float contact=exp(-d*d*120.)*uPressure;
 c.rgb*=1.-contact*.15; c.rgb+=vec3(.08,.06,.035)*exp(-pow((d-.07)*24.,2.))*uPressure;
 c.rgb=mix(c.rgb,c.rgb*vec3(.53,.64,.80),uNight*.78);
 gl_FragColor=c;
}`;

export class PetWebGL {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private buffers: WebGLBuffer[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private indexCount = 0;
  private image: HTMLCanvasElement | HTMLImageElement;
  private frame = 0;
  private start = performance.now();
  private last = this.start;
  private pressure = 0;
  private velocity = 0;
  private down = false;
  private contact = { x: -2, y: -2 };
  private config: PetConfiguration;
  private view: PetConfiguration["view"];
  private flipStart = 0;
  private flipping = false;
  private generation = 0;
  private destroyed = false;
  private manifest: AssetManifest | null = null;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  constructor(private canvas: HTMLCanvasElement, config: PetConfiguration) {
    this.config = config; this.view = config.view;
    this.image = createPetTexture(findBreed(config.breedId), findCoat(config.breedId, config.coatPatternId), config.view);
    this.gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (this.gl) this.initGL();
    this.loadManifest(); this.draw();
  }
  private initGL() {
    const gl = this.gl!;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed"); return shader; };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link pet shader");
    this.program = program; gl.useProgram(program);
    const columns = 72, rows = 44, positions: number[] = [], indices: number[] = [];
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) positions.push(x / columns, y / rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) { const a = y * (columns + 1) + x, b = a + columns + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    this.indexCount = indices.length;
    const pos = gl.createBuffer()!, idx = gl.createBuffer()!; this.buffers.push(pos, idx);
    gl.bindBuffer(gl.ARRAY_BUFFER, pos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "aPosition"); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    for (const name of ["uResolution", "uContact", "uTime", "uSize", "uChubby", "uPressure", "uFlip", "uShadow", "uMotion", "uBelly", "uDog", "uNight", "uTexture"]) this.uniforms[name] = gl.getUniformLocation(program, name);
    this.texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.upload(); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  private upload() { const gl = this.gl; if (gl && this.texture) { gl.bindTexture(gl.TEXTURE_2D, this.texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image); } }
  private regenerate() {
    const g = ++this.generation, b = findBreed(this.config.breedId), c = findCoat(b.id, this.config.coatPatternId);
    this.image = createPetTexture(b, c, this.view); this.upload();
    const override = this.manifest?.coats[`${b.slug}/${c.slug}`]?.views?.[this.view]?.albedo ?? this.manifest?.breeds[b.slug]?.views?.[this.view]?.albedo;
    const url = override ? this.assetUrl(override) : (this.view === "back" ? c.backTextureUrl ?? b.backAssetUrl : c.bellyTextureUrl ?? b.bellyAssetUrl);
    if (url) { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => { if (this.generation === g && img.naturalWidth && (!override || (img.naturalWidth === override.dimensions.width && img.naturalHeight === override.dimensions.height))) { this.image = img; this.upload(); } }; img.src = url; }
  }
  private assetUrl(asset: ImageAsset) { if (!this.manifest || asset.key.startsWith("/") || asset.key.split("/").includes("..")) return ""; return `${this.manifest.baseUrl.replace(/\/$/, "")}/${asset.key}`; }
  private async loadManifest() { try { const r = await fetch("/assets/assets.json"); if (r.ok && !this.destroyed) { const m = await r.json() as AssetManifest; if (!this.destroyed && m.schemaVersion === 1 && /^(\/|https:\/\/)/.test(m.baseUrl)) { this.manifest = m; this.regenerate(); } } } catch { /* procedural texture stays available */ } }
  update(config: PetConfiguration) {
    const textureChanged = config.breedId !== this.config.breedId || config.coatPatternId !== this.config.coatPatternId;
    const viewChanged = config.view !== this.config.view;
    this.config = config;
    if (textureChanged) { this.view = config.view; this.flipping = false; this.regenerate(); }
    else if (viewChanged) { this.flipping = true; this.flipStart = performance.now(); this.down = false; }
  }
  pointer(position: Vec2, down: boolean): PetRegion | null {
    const bounds = this.canvas.getBoundingClientRect(), scale = this.config.size * .97;
    const x = .5 + (position.x - .5) / scale;
    const aspect = bounds.width / (1.75 * bounds.height);
    let y = .5 + (position.y - .5) / (scale * aspect);
    const waist = Math.exp(-Math.pow((x - .535) / .17, 4)) * (x > .32 && x < .75 ? 1 : 0);
    y = .5 + (y - .5) / (1 + waist * (this.config.chubbiness - .5) * .48);
    this.contact = { x, y };
    const head = ((x - .245) / .115) ** 2 + ((y - .5) / .158) ** 2 < 1;
    const body = ((x - .525) / .255) ** 2 + ((y - .5) / (findBreed(this.config.breedId).skeletonParams.proportions.torsoRadius.y)) ** 2 < 1;
    const region = head ? "head" : body ? x > .66 ? "rump" : x < .38 ? "neck" : this.view === "belly" ? "belly" : "spine" : null;
    this.down = down && !!region && !this.flipping;
    return this.flipping ? null : region;
  }
  release() { this.down = false; }
  private draw = () => {
    const now = performance.now(), dt = Math.min(.032, (now - this.last) / 1000); this.last = now;
    this.velocity += ((this.down ? 1 : 0) - this.pressure) * 120 * dt - this.velocity * 17 * dt; this.pressure += this.velocity * dt;
    const ratio = Math.min(window.devicePixelRatio || 1, 2), w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * ratio) || this.canvas.height !== Math.round(h * ratio)) { this.canvas.width = Math.round(w * ratio); this.canvas.height = Math.round(h * ratio); }
    let flip = 0;
    if (this.flipping) { flip = Math.min(1, (now - this.flipStart) / (this.reduced ? 200 : 650)); if (flip >= .5 && this.view !== this.config.view) { this.view = this.config.view; this.regenerate(); } if (flip >= 1) { this.flipping = false; flip = 0; } }
    const gl = this.gl;
    if (gl && this.program) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const f = (name: string, value: number) => gl.uniform1f(this.uniforms[name]!, value);
      gl.uniform2f(this.uniforms.uResolution!, w, h); gl.uniform2f(this.uniforms.uContact!, this.contact.x, this.contact.y);
      f("uTime", (now - this.start) / 1000); f("uSize", this.config.size); f("uChubby", this.config.chubbiness); f("uPressure", this.pressure); f("uFlip", flip); f("uNight", this.config.lighting === "night" ? 1 : 0); f("uMotion", this.reduced || document.hidden ? 0 : 1); f("uBelly", this.view === "belly" ? 1 : 0); f("uDog", this.config.species === "dog" ? 1 : 0);
      f("uShadow", 1); gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0); f("uShadow", 0); gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      const c = this.canvas.getContext("2d"); if (c) { c.clearRect(0, 0, this.canvas.width, this.canvas.height); c.save(); c.scale(ratio, ratio); c.translate(w / 2, h / 2); const s = w / 1400 * this.config.size * .97; c.scale(s, s * Math.max(.12, Math.abs(Math.cos(flip * Math.PI)))); c.drawImage(this.image, -700, -400, 1400, 800); c.restore(); }
    }
    this.frame = requestAnimationFrame(this.draw);
  };
  destroy() { this.destroyed = true; ++this.generation; cancelAnimationFrame(this.frame); if (this.gl) { for (const b of this.buffers) this.gl.deleteBuffer(b); this.gl.deleteTexture(this.texture); this.gl.deleteProgram(this.program); } }
}
