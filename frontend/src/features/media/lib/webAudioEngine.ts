/**
 * Core audio synchronization engine utilizing the Web Audio API.
 * Standard HTML5 <audio> elements cannot guarantee sample-accurate
 * synchronization for multiple parallel tracks due to unpredictable network buffering.
 */
class WebAudioEngine {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private activeSources: Map<string, AudioBufferSourceNode> = new Map();
    private gainNodes: Map<string, GainNode> = new Map();
    private masterGain: GainNode | null = null;

    // Timeline Tracking State
    private startTimestamp: number = 0;
    private currentOffset: number = 0;
    private isEnginePlaying: boolean = false;

    constructor() {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
    }

    /**
     * Reconstructs the audio graph for a new set of stems.
     * Memory allocation happens here via decodeAudioData.
     */
    public async loadStems(stems: Map<string, ArrayBuffer>): Promise<void> {
        if (!this.context) return;

        this.stop();
        this.buffers.clear();

        for (const [name, data] of stems) {
            const buffer = await this.context.decodeAudioData(data);
            this.buffers.set(name, buffer);

            const gainNode = this.context.createGain();
            this.gainNodes.set(name, gainNode);
            gainNode.connect(this.masterGain!);
        }
    }

    /**
     * Initializes playback from a specific offset.
     * Records the exact context timeline coordinate for accurate progress calculation.
     */
    public play(offset: number = 0): void {
        if (!this.context || this.buffers.size === 0) return;

        this.stopActiveSources();

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Initialize timeline tracking
        this.currentOffset = offset;
        this.startTimestamp = this.context.currentTime;
        this.isEnginePlaying = true;

        for (const [name, buffer] of this.buffers) {
            const source = this.context.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.gainNodes.get(name);
            if (gainNode) {
                source.connect(gainNode);
                source.start(0, offset);
                this.activeSources.set(name, source);
            }
        }
    }

    public pause(): void {
        this.stopActiveSources();
        this.isEnginePlaying = false;
        if (this.context?.state === 'running') {
            this.context.suspend();
        }
    }

    public stop(): void {
        this.stopActiveSources();
        this.gainNodes.clear();
        this.buffers.clear();
        this.isEnginePlaying = false;
        this.currentOffset = 0;
    }

    private stopActiveSources(): void {
        for (const source of this.activeSources.values()) {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Ignore if node is already disconnected
            }
        }
        this.activeSources.clear();
    }

    /**
     * Calculates the exact current progress in seconds.
     * Why: AudioContext.currentTime continuously increments even when suspended.
     * We must calculate delta relative to our explicit startTimestamp.
     */
    public getCurrentProgress(): number {
        if (!this.context) return 0;
        if (!this.isEnginePlaying) return this.currentOffset;
        return this.currentOffset + (this.context.currentTime - this.startTimestamp);
    }

    public setStemVolume(name: string, volume: number): void {
        const node = this.gainNodes.get(name);
        if (node && this.context) {
            // setTargetAtTime prevents audio "clicks" during sudden volume changes
            node.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
        }
    }

    public setMasterVolume(volume: number): void {
        if (this.masterGain && this.context) {
            this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
        }
    }
}

export const audioEngine = new WebAudioEngine();