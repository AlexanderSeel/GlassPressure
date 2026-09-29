import type { DrillState } from "../tools/DrillController";

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private motorOscillator: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastContactNoiseTime = -1;

  public async unlock(): Promise<void> {
    if (!this.context) this.createContext();
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
  }

  public updateDrill(
    state: DrillState,
    stress01: number,
    progress01: number,
  ): void {
    if (!this.context || !this.motorGain || !this.motorOscillator || !this.motorFilter) {
      return;
    }

    const now = this.context.currentTime;
    const active =
      state === "approach" ||
      state === "contact" ||
      state === "drilling" ||
      state === "breakthrough";

    const targetGain =
      state === "drilling"
        ? 0.045
        : state === "contact"
          ? 0.03
          : active
            ? 0.018
            : 0;

    this.motorGain.gain.cancelScheduledValues(now);
    this.motorGain.gain.linearRampToValueAtTime(targetGain, now + 0.035);

    const load =
      state === "drilling"
        ? Math.min(1, Math.max(stress01, progress01 * 0.45))
        : 0;

    const frequency =
      170 + (1 - load) * 70 + (state === "approach" ? 35 : 0);
    this.motorOscillator.frequency.cancelScheduledValues(now);
    this.motorOscillator.frequency.linearRampToValueAtTime(
      frequency,
      now + 0.04,
    );

    this.motorFilter.frequency.cancelScheduledValues(now);
    this.motorFilter.frequency.linearRampToValueAtTime(
      650 + (1 - load) * 850,
      now + 0.05,
    );

    if (
      state === "drilling" &&
      now - this.lastContactNoiseTime >= 0.065
    ) {
      this.lastContactNoiseTime = now;
      this.emitContactNoise(
        0.006 + stress01 * 0.006,
        0.022,
        1800 + progress01 * 1200,
      );
    }
  }

  public breakthrough(): void {
    if (!this.context || !this.master) return;
    this.playTransient(420, 120, 0.055, 0.11);
    this.emitContactNoise(0.055, 0.09, 3200);
    this.vibrate([16, 28, 24]);
  }

  public glassFailure(): void {
    if (!this.context || !this.master) return;
    this.playTransient(220, 70, 0.075, 0.16);
    this.emitContactNoise(0.09, 0.16, 5200);
    this.vibrate([32, 28, 52]);
  }

  public reset(): void {
    if (!this.context || !this.motorGain) return;
    const now = this.context.currentTime;
    this.motorGain.gain.cancelScheduledValues(now);
    this.motorGain.gain.linearRampToValueAtTime(0, now + 0.03);
    this.lastContactNoiseTime = -1;
  }

  private createContext(): void {
    const AudioContextCtor =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextCtor) return;

    this.context = new AudioContextCtor();

    this.master = this.context.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(this.context.destination);

    this.motorGain = this.context.createGain();
    this.motorGain.gain.value = 0;

    this.motorFilter = this.context.createBiquadFilter();
    this.motorFilter.type = "bandpass";
    this.motorFilter.frequency.value = 1200;
    this.motorFilter.Q.value = 1.4;

    this.motorOscillator = this.context.createOscillator();
    this.motorOscillator.type = "sawtooth";
    this.motorOscillator.frequency.value = 220;

    this.motorOscillator
      .connect(this.motorFilter)
      .connect(this.motorGain)
      .connect(this.master);

    this.motorOscillator.start();
    this.noiseBuffer = this.createNoiseBuffer();
  }

  private playTransient(
    startFrequency: number,
    endFrequency: number,
    gainValue: number,
    duration: number,
  ): void {
    if (!this.context || !this.master) return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration,
    );

    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  private emitContactNoise(
    gainValue: number,
    duration: number,
    filterFrequency: number,
  ): void {
    if (!this.context || !this.master || !this.noiseBuffer) return;

    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = filterFrequency;

    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.context) {
      throw new Error("Audio context is required");
    }

    const length = Math.floor(this.context.sampleRate * 0.25);
    const buffer = this.context.createBuffer(
      1,
      length,
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  private vibrate(pattern: number[]): void {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }
}
