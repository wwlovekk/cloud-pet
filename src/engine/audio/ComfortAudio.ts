import type { PetRegion, Species } from "@/types/pet";
import { publicAssetPath } from "@/lib/assets/public-path";

const catCallFiles = ["trill", "short-meow", "soft-meow"].map(
  name => publicAssetPath(`/assets/audio/cat-calls/${name}.wav`),
);

export class ComfortAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private purr: GainNode | null = null;
  private preview: GainNode | null = null;
  private air: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private nodes: AudioNode[] = [];
  private sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private muted = false;
  private volume = .55;
  private lastDogSigh = 0;
  private catCalls: AudioBuffer[] | null = null;
  private lastCatCall: AudioBuffer | null = null;
  private catCallSource: AudioBufferSourceNode | null = null;
  private catCallTimer: ReturnType<typeof setTimeout> | null = null;
  private catCallDeadline = 0;
  private catCallRemaining = 3500 + Math.random() * 2500;
  private pettingCat = false;
  private sample: AudioBufferSourceNode | null = null;
  private sampleGain: GainNode | null = null;
  private species: Species = "cat";
  private generation = 0;

  get running() { return this.context?.state === "running"; }

  async unlock() {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) throw new Error("Web Audio is unavailable");
      const c = new Context();
      this.context = c;
      const master = c.createGain();
      master.gain.value = this.muted ? 0 : this.volume * .82;
      master.connect(c.destination);
      this.master = master;

      const purr = c.createGain(), preview = c.createGain();
      purr.gain.value = preview.gain.value = 0;
      this.purr = purr;
      this.preview = preview;

      const pulse = c.createOscillator();
      pulse.frequency.value = 25;
      const pulseDepth = c.createGain(), tremolo = c.createGain();
      pulseDepth.gain.value = .40;
      tremolo.gain.value = .60;
      pulse.connect(pulseDepth).connect(tremolo.gain);
      this.sources = [pulse];
      this.nodes = [master, purr, preview, pulseDepth, tremolo];

      // Keep the low fundamental while giving small speakers more of the audible harmonics.
      for (const [frequency, level] of [[53, .18], [106, .28], [159, .25], [212, .20], [265, .12], [318, .065]] as const) {
        const tone = c.createOscillator(), gain = c.createGain();
        tone.frequency.value = frequency;
        gain.gain.value = level;
        tone.connect(gain).connect(tremolo);
        this.sources.push(tone);
        this.nodes.push(gain);
      }
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 440;
      this.filter = filter;
      tremolo.connect(filter);
      filter.connect(purr).connect(master);
      filter.connect(preview).connect(master);
      const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), data = buffer.getChannelData(0);
      let brown = 0; for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .03) / 1.03; data[i] = brown * 5; }
      const noise = c.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const airFilter = c.createBiquadFilter(); airFilter.type = "bandpass"; airFilter.frequency.value = 620; airFilter.Q.value = .6;
      const air = c.createGain(); air.gain.value = 0; this.air = air;
      noise.connect(airFilter); airFilter.connect(air); air.connect(master);
      const throat = c.createBiquadFilter(), grain = c.createGain();
      throat.type = "bandpass";
      throat.frequency.value = 350;
      throat.Q.value = .7;
      grain.gain.value = .4;
      noise.connect(throat).connect(grain).connect(tremolo);
      this.sources.push(noise);
      this.nodes.push(filter, airFilter, air, throat, grain);
      this.sources.forEach(s => s.start());
    }
    const context = this.context;
    if (!this.running) await context.resume();
    if (this.context !== context) return;
    void this.loadCatCalls(context);
    this.scheduleCatCall();
  }

  playPreview() {
    if (!this.running || this.muted || !this.context || !this.preview) return;
    const gain = this.preview.gain;
    const now = this.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(.24, now + .11);
    gain.linearRampToValueAtTime(.18, now + .54);
    gain.linearRampToValueAtTime(0, now + .90);
  }
  async loadPack(breedId: string, species: Species) {
    this.species = species; const generation = ++this.generation;
    this.sample?.stop(); this.sample = null;
    if (!this.context || !this.master) return;
    try {
      const response = await fetch(publicAssetPath("/assets/assets.json")), manifest = await response.json();
      const cue = species === "cat" ? "purr" : "pant", clip = manifest.breeds?.[breedId]?.audio?.[cue]?.[0];
      if (!clip || typeof clip.key !== "string" || clip.key.includes("..") || clip.key.startsWith("/")) return;
      const audio = await fetch(publicAssetPath(`${manifest.baseUrl.replace(/\/$/, "")}/${clip.key}`)); if (!audio.ok) return;
      const buffer = await this.context.decodeAudioData(await audio.arrayBuffer()); if (generation !== this.generation) return;
      const source = this.context.createBufferSource(), gain = this.context.createGain(); source.buffer = buffer; source.loop = true; gain.gain.value = 0; source.connect(gain); gain.connect(this.master); source.start(); this.sample = source; this.sampleGain = gain; this.nodes.push(gain);
    } catch { /* synthesis continues if a real clip cannot be decoded */ }
  }
  update(active: boolean, speed: number, region: PetRegion | null, species: Species) {
    const c = this.context; if (!c || !this.purr || !this.air) return;
    const comfort = Math.max(.25, 1 - Math.abs(speed - .35) * .6), t = c.currentTime;
    this.purr.gain.setTargetAtTime(active && species === "cat" && !this.sample ? .28 * comfort : 0, t, active ? .09 : .26);
    const breath = .8 + Math.sin(t * (species === "dog" ? 5 : 1.5)) * .2;
    this.air.gain.setTargetAtTime(active && !this.sample ? (species === "dog" ? .15 * breath : .015) : 0, t, .2);
    this.sampleGain?.gain.setTargetAtTime(active ? .35 * comfort : 0, t, active ? .2 : .7);
    this.filter?.frequency.setTargetAtTime(365 + Math.min(speed, 2) * 70 + (region === "belly" ? 35 : 0), t, .22);
    this.pettingCat = active && species === "cat";
    if (this.pettingCat) this.scheduleCatCall();
    else this.pauseCatCall();
    if (active && species === "dog" && (region === "head" || region === "belly") && t - this.lastDogSigh > 7) {
      this.lastDogSigh = t;
      this.playDogSigh();
    }
  }
  private playDogSigh() {
    const c = this.context!, osc = c.createOscillator(), gain = c.createGain(), now = c.currentTime;
    osc.type = "sine"; osc.frequency.setValueAtTime(110, now); osc.frequency.exponentialRampToValueAtTime(65, now + .4);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.035, now + .12); gain.gain.exponentialRampToValueAtTime(.0001, now + .6);
    osc.connect(gain); gain.connect(this.master!); osc.start(); osc.stop(now + .65); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  private async loadCatCalls(context: AudioContext) {
    if (this.catCalls !== null) return;
    this.catCalls = [];
    const clips = await Promise.all(catCallFiles.map(async path => {
      try {
        const response = await fetch(path);
        if (!response.ok) return null;
        return await context.decodeAudioData(await response.arrayBuffer());
      } catch {
        return null;
      }
    }));
    if (this.context !== context) return;
    this.catCalls = clips.filter(clip => clip !== null);
    this.scheduleCatCall();
  }
  private scheduleCatCall() {
    if (!this.pettingCat || this.muted || this.volume === 0 || !this.running ||
        !this.catCalls?.length || this.catCallTimer !== null) return;

    this.catCallDeadline = performance.now() + this.catCallRemaining;
    this.catCallTimer = setTimeout(() => {
      this.catCallTimer = null;
      this.catCallRemaining = 8500 + Math.random() * 6500;
      if (!this.pettingCat || this.muted || this.volume === 0 || !this.running) return;
      this.playCatCall();
      this.scheduleCatCall();
    }, this.catCallRemaining);
  }
  private pauseCatCall() {
    if (this.catCallTimer === null) return;
    clearTimeout(this.catCallTimer);
    this.catCallTimer = null;
    this.catCallRemaining = Math.max(0, this.catCallDeadline - performance.now());
  }
  private playCatCall() {
    if (!this.context || !this.master || !this.catCalls?.length) return;
    const choices = this.catCalls.length > 1 ? this.catCalls.filter(clip => clip !== this.lastCatCall) : this.catCalls;
    const clip = choices[Math.floor(Math.random() * choices.length)];
    if (!clip) return;
    const source = this.context.createBufferSource();
    source.buffer = clip;
    source.connect(this.master);
    source.onended = () => {
      source.disconnect();
      if (this.catCallSource === source) this.catCallSource = null;
    };
    this.catCallSource = source;
    this.lastCatCall = clip;
    source.start();
  }
  private stopCatCall() {
    this.catCallSource?.stop();
    this.catCallSource = null;
  }
  preferences(muted: boolean, volume: number) {
    this.muted = muted;
    this.volume = Math.max(0, Math.min(1, volume));
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master?.gain.setTargetAtTime(muted ? 0 : this.volume * .82, now, .04);
    if (muted || this.volume === 0) {
      this.stopPreview(now);
      this.pauseCatCall();
      this.stopCatCall();
    } else {
      this.scheduleCatCall();
    }
  }
  private stopPreview(now: number) {
    this.preview?.gain.cancelScheduledValues(now);
    this.preview?.gain.setValueAtTime(0, now);
  }
  suspend() {
    if (!this.context) return;
    this.update(false, 0, null, this.species);
    this.stopPreview(this.context.currentTime);
    this.stopCatCall();
    void this.context.suspend().catch(() => {});
  }
  destroy() {
    ++this.generation;
    this.pauseCatCall();
    this.stopCatCall();
    this.catCalls = this.lastCatCall = null;
    this.sample?.stop();
    for (const s of this.sources) { try { s.stop(); } catch {} s.disconnect(); }
    for (const n of this.nodes) n.disconnect();
    void this.context?.close();
    this.context = null;
  }
}
