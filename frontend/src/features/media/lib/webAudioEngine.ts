/**
 * WebAudioEngine - responsible for low-level synchronization of stems.
 * Uses AudioContext to ensure sample-accurate playback.
 */
class WebAudioEngine {
    private context: AudioContext | null = null;
    private sources: AudioBufferSourceNode[] = [];
    private gainNodes: Map<string, GainNode> = new Map();
    private masterGain: GainNode | null = null;

    constructor() {
        // Initialize the context only after user interaction (browser requirement)
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
    }

    /**
     * Створює граф для кожного стему: Source -> GainNode -> MasterGain
     */
    public async loadStems(stems: Map<string, ArrayBuffer>) {
        if (!this.context) return;

        this.stop(); // Очищаємо попередні вузли

        for (const [name, data] of stems) {
            const buffer = await this.context.decodeAudioData(data);
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.context.createGain();
            this.gainNodes.set(name, gainNode);

            source.connect(gainNode);
            gainNode.connect(this.masterGain!);
            this.sources.push(source);
        }
    }

    public play(time: number = 0) {
        if (this.context?.state === 'suspended') {
            this.context.resume();
        }
        this.sources.forEach(source => source.start(0, time));
    }

    public stop() {
        this.sources.forEach(source => {
            try {
                source.stop();
            } catch (e) { /* ignore */
            }
        });
        this.sources = [];
        this.gainNodes.clear();
    }

    public setStemVolume(name: string, volume: number) {
        const node = this.gainNodes.get(name);
        if (node && this.context) {
            node.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
        }
    }

    public setMasterVolume(volume: number) {
        if (this.masterGain && this.context) {
            this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
        }
    }
}

export const audioEngine = new WebAudioEngine();