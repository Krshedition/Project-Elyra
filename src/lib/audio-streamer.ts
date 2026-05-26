export class AudioStreamer {
  private audioContext: AudioContext;
  private nextTime: number = 0;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;

  constructor() {
    // @ts-ignore
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  getVolume(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.dataArray as any);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
    const avg = sum / this.dataArray.length;
    return Math.min(1, avg / 128); // Normalize 0 to 1
  }

  addPCM16(base64: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const buffer = bytes.buffer;
    const view = new DataView(buffer);
    const float32Array = new Float32Array(buffer.byteLength / 2);
    for (let i = 0; i < float32Array.length; i++) {
      const int16 = view.getInt16(i * 2, true);
      float32Array[i] = int16 / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    if (this.nextTime < this.audioContext.currentTime) {
      this.nextTime = this.audioContext.currentTime;
    }
    source.start(this.nextTime);
    this.nextTime += audioBuffer.duration;
  }

  isBufferingOrPlaying(): boolean {
    if (!this.audioContext) return false;
    return this.nextTime > this.audioContext.currentTime;
  }

  interrupt() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    // @ts-ignore
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.nextTime = 0;
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.nextTime = 0;
    }
  }
}
