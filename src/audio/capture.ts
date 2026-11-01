/** Owns resources even while permission or AudioContext.resume is pending. */
export class CaptureSession {
  private generation = 0;
  private pending = false;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private detach: (() => void) | null = null;

  stop() {
    this.generation++;
    this.pending = false;
    this.detach?.();
    this.detach = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  async start(onInterrupted: () => void): Promise<{ stream: MediaStream; context: AudioContext } | null> {
    if (this.pending || this.context) return null;
    this.pending = true;
    const generation = ++this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      this.stream = stream;
      const context = new AudioContext({ latencyHint: 'interactive' });
      this.context = context;
      const interrupted = () => { if (generation === this.generation) onInterrupted(); };
      const changed = () => { if (context.state !== 'running') interrupted(); };
      stream.getTracks().forEach(track => track.addEventListener('ended', interrupted));
      this.detach = () => {
        stream.getTracks().forEach(track => track.removeEventListener('ended', interrupted));
        context.removeEventListener('statechange', changed);
      };
      await context.resume();
      if (generation !== this.generation) return null;
      context.addEventListener('statechange', changed);
      if (context.state !== 'running' || stream.getTracks().some(track => track.readyState === 'ended')) {
        throw new Error('Capture interrupted');
      }
      this.pending = false;
      return { stream, context };
    } catch (error) {
      if (generation !== this.generation) return null;
      this.stop();
      throw error;
    }
  }
}
