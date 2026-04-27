/**
 * Core audio synchronization engine utilizing the Web Audio API.
 * Standard HTML5 <audio> elements cannot guarantee sample-accurate
 * synchronization for multiple parallel tracks due to unpredictable network buffering.
 */
class WebAudioEngine {
    private context: AudioContext | null = null;
    private sources: AudioBufferSourceNode[] = [];
    private gainNodes: Map<string, GainNode> = new Map();
    private masterGain: GainNode | null = null;
    private startTime: number = 0;
    private pauseTime: number = 0;

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

        this.stop(); // Clear previous nodes

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

    public play(offset: number = 0): void {
        if (!this.context) return;

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Re-create sources if they were stopped (Web Audio nodes are one-time use)
        if (this.sources.length === 0 || this.sources[0].buffer === null) {
            // TODO: [Media] - Implement buffer caching mechanism to avoid re-decoding on unpause
            console.warn("Attempting to play a stopped engine without re-loading buffers.");
            return;
        }

        this.sources.forEach(source => {
            // Check if node is already started to prevent InvalidStateError
            try {
                source.start(0, offset);
            } catch (e) {
                // Ignore if already playing
            }
        });

        this.startTime = this.context.currentTime - offset;
    }

    public pause(): void {
        if (!this.context) return;
        this.context.suspend();
        this.pauseTime = this.context.currentTime - this.startTime;
    }

    public stop(): void {
        this.sources.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) { /* ignore */
            }
        });
        this.sources = [];
        this.gainNodes.clear();
        this.pauseTime = 0;
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