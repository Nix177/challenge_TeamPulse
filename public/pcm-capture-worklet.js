class PcmCaptureWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      this.buffer[this.bufferIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

      if (this.bufferIndex >= this.buffer.length) {
        const pcmBuffer = this.buffer.slice(0, this.bufferIndex).buffer;
        this.port.postMessage(pcmBuffer, [pcmBuffer]);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-worklet', PcmCaptureWorklet);
