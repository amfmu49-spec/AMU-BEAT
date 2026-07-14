export class AudioEngine {
  ctx: AudioContext;
  buffer: AudioBuffer | null = null;
  bpm: number = 120;
  basePlaybackRate: number = 1.0;

  // Effects
  filter: BiquadFilterNode;
  
  // Reverb
  reverb: ConvolverNode;
  reverbWet: GainNode;
  reverbDry: GainNode;

  // Phaser
  phaserFilters: BiquadFilterNode[] = [];
  phaserLFO: OscillatorNode;
  phaserLfoGain: GainNode;
  phaserWet: GainNode;
  phaserDry: GainNode;

  // Flanger
  flangerDelay: DelayNode;
  flangerLFO: OscillatorNode;
  flangerLfoGain: GainNode;
  flangerFeedback: GainNode;
  flangerWet: GainNode;
  flangerDry: GainNode;

  // Loop (Roll)
  loopDelay: DelayNode;
  loopFeedback: GainNode;
  loopWet: GainNode;
  loopDry: GainNode;

  // XY Delay (existing)
  delay: DelayNode;
  feedback: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;

  // Scratch
  scratchDelay: DelayNode;
  scratchGain: GainNode;
  dryMasterGain: GainNode;

  masterGain: GainNode;
  analyser: AnalyserNode;

  activeSources: Map<number, AudioBufferSourceNode> = new Map();
  masterSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.masterGain.connect(this.analyser);
    
    // 1. Filter (Input)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 1;

    // --- REVERB ---
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.createReverbImpulse(2.5, 2.5);
    this.reverbWet = this.ctx.createGain(); this.reverbWet.gain.value = 0;
    this.reverbDry = this.ctx.createGain(); this.reverbDry.gain.value = 1;
    this.filter.connect(this.reverb);
    this.filter.connect(this.reverbDry);
    this.reverb.connect(this.reverbWet);

    // --- PHASER ---
    this.phaserWet = this.ctx.createGain(); this.phaserWet.gain.value = 0;
    this.phaserDry = this.ctx.createGain(); this.phaserDry.gain.value = 1;
    this.phaserLFO = this.ctx.createOscillator();
    this.phaserLFO.type = 'sine';
    this.phaserLFO.frequency.value = 0.5; // 0.5Hz sweep
    this.phaserLFO.start();
    this.phaserLfoGain = this.ctx.createGain();
    this.phaserLfoGain.gain.value = 800;
    this.phaserLFO.connect(this.phaserLfoGain);

    const phaserIn = this.ctx.createGain();
    this.reverbWet.connect(phaserIn);
    this.reverbDry.connect(phaserIn);
    
    phaserIn.connect(this.phaserDry);
    
    for (let i = 0; i < 4; i++) {
      const ap = this.ctx.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.value = 1000;
      ap.Q.value = 2;
      this.phaserLfoGain.connect(ap.frequency);
      this.phaserFilters.push(ap);
      if (i === 0) phaserIn.connect(ap);
      else this.phaserFilters[i-1].connect(ap);
    }
    this.phaserFilters[3].connect(this.phaserWet);
    // Add some feedback for phaser
    const phaserFb = this.ctx.createGain();
    phaserFb.gain.value = 0.6;
    this.phaserFilters[3].connect(phaserFb);
    phaserFb.connect(this.phaserFilters[0]);

    // --- FLANGER ---
    this.flangerWet = this.ctx.createGain(); this.flangerWet.gain.value = 0;
    this.flangerDry = this.ctx.createGain(); this.flangerDry.gain.value = 1;
    
    const flangerIn = this.ctx.createGain();
    this.phaserWet.connect(flangerIn);
    this.phaserDry.connect(flangerIn);

    flangerIn.connect(this.flangerDry);

    this.flangerDelay = this.ctx.createDelay();
    this.flangerDelay.delayTime.value = 0.005; // 5ms base delay
    
    this.flangerLFO = this.ctx.createOscillator();
    this.flangerLFO.type = 'sine';
    this.flangerLFO.frequency.value = 0.25;
    this.flangerLFO.start();
    this.flangerLfoGain = this.ctx.createGain();
    this.flangerLfoGain.gain.value = 0.004; // +/- 4ms sweep
    this.flangerLFO.connect(this.flangerLfoGain);
    this.flangerLfoGain.connect(this.flangerDelay.delayTime);

    this.flangerFeedback = this.ctx.createGain();
    this.flangerFeedback.gain.value = 0.7;

    flangerIn.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerWet);

    // --- LOOP (ROLL) ---
    this.loopWet = this.ctx.createGain(); this.loopWet.gain.value = 0;
    this.loopDry = this.ctx.createGain(); this.loopDry.gain.value = 1;
    
    const loopIn = this.ctx.createGain();
    this.flangerWet.connect(loopIn);
    this.flangerDry.connect(loopIn);

    loopIn.connect(this.loopDry);

    this.loopDelay = this.ctx.createDelay(2.0);
    this.loopDelay.delayTime.value = 0.5; // 1 beat default at 120bpm
    this.loopFeedback = this.ctx.createGain();
    this.loopFeedback.gain.value = 0; // Off normally
    
    loopIn.connect(this.loopDelay); // Input to delay
    this.loopDelay.connect(this.loopFeedback);
    this.loopFeedback.connect(this.loopDelay);
    this.loopDelay.connect(this.loopWet);

    // --- XY DELAY (Existing) ---
    const xyIn = this.ctx.createGain();
    this.loopWet.connect(xyIn);
    this.loopDry.connect(xyIn);

    this.wetGain = this.ctx.createGain(); this.wetGain.gain.value = 0;
    this.dryGain = this.ctx.createGain(); this.dryGain.gain.value = 1;
    
    xyIn.connect(this.dryGain);

    this.delay = this.ctx.createDelay(5.0);
    this.delay.delayTime.value = 0.5;
    this.feedback = this.ctx.createGain();
    this.feedback.gain.value = 0.4;
    
    xyIn.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.wetGain);

    // --- SCRATCH ---
    this.scratchDelay = this.ctx.createDelay(3.0);
    this.scratchDelay.delayTime.value = 0.5; 
    
    this.scratchGain = this.ctx.createGain(); this.scratchGain.gain.value = 0;
    this.dryMasterGain = this.ctx.createGain(); this.dryMasterGain.gain.value = 1;

    this.dryGain.connect(this.dryMasterGain);
    this.wetGain.connect(this.dryMasterGain);
    
    this.dryGain.connect(this.scratchDelay);
    this.wetGain.connect(this.scratchDelay);
    
    this.scratchDelay.connect(this.scratchGain);

    this.dryMasterGain.connect(this.masterGain);
    this.scratchGain.connect(this.masterGain);
  }

  createReverbImpulse(seconds: number, decay: number) {
    const rate = this.ctx.sampleRate;
    const length = rate * seconds;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = 1 - i / length;
      left[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
    }
    return impulse;
  }

  toggleEffect(name: string, active: boolean) {
    const t = this.ctx.currentTime;
    
    switch (name) {
      case 'REVERB':
        this.reverbWet.gain.setTargetAtTime(active ? 0.5 : 0, t, 0.05);
        break;
      case 'FLANGER':
        this.flangerWet.gain.setTargetAtTime(active ? 0.6 : 0, t, 0.05);
        this.flangerDry.gain.setTargetAtTime(active ? 0.4 : 1, t, 0.05);
        break;
      case 'PHASER':
        this.phaserWet.gain.setTargetAtTime(active ? 0.7 : 0, t, 0.05);
        this.phaserDry.gain.setTargetAtTime(active ? 0.3 : 1, t, 0.05);
        break;
      case 'DELAY':
        // Maximize XY delay effect
        this.wetGain.gain.setTargetAtTime(active ? 0.8 : 0, t, 0.05);
        this.dryGain.gain.setTargetAtTime(active ? 0.5 : 1, t, 0.05);
        break;
      case 'LOOP':
        if (active) {
          // Freeze loop: Feedback to 1.0, crossfade to wet
          this.loopFeedback.gain.setTargetAtTime(1.0, t, 0.01);
          this.loopWet.gain.setTargetAtTime(1.0, t, 0.05);
          this.loopDry.gain.setTargetAtTime(0.0, t, 0.05);
        } else {
          // Unfreeze: Feedback to 0, crossfade to dry
          this.loopFeedback.gain.setTargetAtTime(0.0, t, 0.01);
          this.loopWet.gain.setTargetAtTime(0.0, t, 0.05);
          this.loopDry.gain.setTargetAtTime(1.0, t, 0.05);
        }
        break;
    }
  }

  setPitch(rate: number) {
    this.basePlaybackRate = rate;
    
    // Apply to master source if playing
    if (this.masterSource) {
      this.masterSource.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.05);
    }
    
    // Apply to all active pad slices
    this.activeSources.forEach(source => {
      source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.05);
    });
  }

  setScratchMode(active: boolean) {
    const t = this.ctx.currentTime;
    if (active) {
      this.dryMasterGain.gain.setTargetAtTime(0, t, 0.05);
      this.scratchGain.gain.setTargetAtTime(1, t, 0.05);
      this.scratchDelay.delayTime.setTargetAtTime(0.5, t, 0.02);
    } else {
      this.scratchGain.gain.setTargetAtTime(0, t, 0.05);
      this.dryMasterGain.gain.setTargetAtTime(1, t, 0.05);
    }
  }

  setScratchDelta(deltaY: number) {
    const maxOffset = 0.4;
    const clampedDelta = Math.max(-1, Math.min(1, deltaY * 2.0)); 
    const targetDelay = 0.5 + (clampedDelta * maxOffset);
    this.scratchDelay.delayTime.setTargetAtTime(targetDelay, this.ctx.currentTime, 0.03);
  }

  async loadAudio(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  setBpm(newBpm: number) {
    this.bpm = newBpm;
    if (newBpm > 0) {
      this.delay.delayTime.value = 60 / newBpm;
      this.loopDelay.delayTime.value = (60 / newBpm) / 2; // Loop size (1/2 beat)
    }
  }

  setXY(x: number, y: number) {
    const minFreq = 50;
    const maxFreq = 20000;
    const freq = Math.exp(x * Math.log(maxFreq / minFreq)) * minFreq;
    this.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);

    // Don't overwrite DELAY button if it's forcing wet
    // We will just add to the wet gain
    this.wetGain.gain.setTargetAtTime(y, this.ctx.currentTime, 0.05);
    this.dryGain.gain.setTargetAtTime(1 - (y * 0.5), this.ctx.currentTime, 0.05);
  }

  playSlice(padIndex: number) {
    if (!this.buffer) return;
    this.stopSlice(padIndex);

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.basePlaybackRate;
    source.connect(this.filter);

    const beatDuration = 60 / this.bpm;
    const barDuration = beatDuration * 4;
    const startTimeInFile = padIndex * barDuration;
    
    if (startTimeInFile >= this.buffer.duration) return;

    source.start(0, startTimeInFile, barDuration);
    this.activeSources.set(padIndex, source);
  }

  stopSlice(padIndex: number) {
    if (this.activeSources.has(padIndex)) {
      const source = this.activeSources.get(padIndex)!;
      try { source.stop(); } catch(e) {}
      source.disconnect();
      this.activeSources.delete(padIndex);
    }
  }

  playFull() {
    if (!this.buffer) return;
    this.stopFull();

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.basePlaybackRate;
    source.connect(this.filter);
    
    source.start(0);
    this.masterSource = source;
  }

  stopFull() {
    if (this.masterSource) {
      try { this.masterSource.stop(); } catch(e) {}
      this.masterSource.disconnect();
      this.masterSource = null;
    }
  }

  getSpectrumData(array: any) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
