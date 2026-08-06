/**
 * MicrophoneCapture — AudioWorklet-based 16kHz PCM Microphone Capture
 * 
 * Captures user audio from navigator.mediaDevices.getUserMedia and streams
 * 16kHz 16-bit mono PCM base64 chunks for Gemini Live input.
 */
export class MicrophoneCapture {
  constructor({ onAudioChunk, onError }) {
    this.onAudioChunk = onAudioChunk;
    this.onError = onError;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.isCapturing = false;
  }

  async start() {
    if (this.isCapturing) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      await this.audioContext.audioWorklet.addModule('public/pcm-capture-worklet.js');

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-worklet');

      this.workletNode.port.onmessage = (event) => {
        if (!this.isCapturing) return;
        const arrayBuffer = event.data;
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        if (this.onAudioChunk && base64) {
          this.onAudioChunk(base64);
        }
      };

      this.sourceNode.connect(this.workletNode);
      // Worklet does not need to connect to destination (avoids feedback loop)
      
      this.isCapturing = true;
    } catch (err) {
      this.isCapturing = false;
      this.stop();
      if (this.onError) {
        this.onError(err);
      } else {
        console.error('[MicrophoneCapture] Error starting microphone:', err);
      }
    }
  }

  stop() {
    this.isCapturing = false;

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch (_) {}
      this.workletNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
