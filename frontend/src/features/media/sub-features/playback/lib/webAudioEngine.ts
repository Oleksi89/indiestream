/**
 * Core audio synchronization engine utilizing the Web Audio API.
 * Standard HTML5 <audio> elements cannot guarantee sample-accurate
 * synchronization for multiple parallel tracks due to unpredictable network buffering.
 */
class WebAudioEngine {
    private context: AudioContext | null = null;
    private sourceNodes: Map<string, MediaElementAudioSourceNode> = new Map();
    private gainNodes: Map<string, GainNode> = new Map();
    private masterGain: GainNode | null = null;

    constructor() {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
    }

    /**
     * Wires multiple HTMLAudioElements into the Web Audio graph.
     * Safely reuses MediaElementAudioSourceNodes to prevent InvalidStateError.
     * * Why: Browsers strictly enforce a 1:1 relationship between an <audio> element
     * and its SourceNode. Attempting to recreate it throws a DOMException.
     */
    public connectStems(elements: Map<string, HTMLAudioElement>): void {
        if (!this.context) return;

        this.disconnectAll();

        for (const [name, el] of elements) {
            let source = this.sourceNodes.get(name);

            if (!source || source.mediaElement !== el) {
                // Warning: element must have crossOrigin = 'anonymous' before this call
                source = this.context.createMediaElementSource(el);
                this.sourceNodes.set(name, source);
            }

            const gainNode = this.context.createGain();
            this.gainNodes.set(name, gainNode);

            source.connect(gainNode);
            gainNode.connect(this.masterGain!);
        }
    }

    public resumeContext(): void {
        if (this.context?.state === 'suspended') {
            this.context.resume();
        }
    }

    public suspendContext(): void {
        if (this.context?.state === 'running') {
            this.context.suspend();
        }
    }

    public disconnectAll(): void {
        for (const [name, source] of this.sourceNodes) {
            try {
                source.disconnect();
                const gain = this.gainNodes.get(name);
                if (gain) gain.disconnect();
            } catch (e) {
                // Ignore if already disconnected
            }
        }
        this.gainNodes.clear();
        // Do NOT clear this.sourceNodes to allow safe reuse during playback toggles
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