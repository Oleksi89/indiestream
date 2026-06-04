import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {TrackMetadataFormValues} from '../types/track.schema';
import type {StemUploadPayload} from '../types';

export type WizardStep = 'METADATA' | 'MEDIA' | 'STEMS' | 'UPLOADING' | 'PROCESSING';

// Transient state
interface TransientState {
    masterFile: File | null;
    coverFile: File | null;
    stems: StemUploadPayload[];
    uploadProgress: number;
    uploadedTrackId: string | null;
    uploadError: string | null;
}

// Persisted state (survives page reloads)
interface PersistedState {
    currentStep: WizardStep;
    metadata: TrackMetadataFormValues;
}

interface UploadWizardStore extends TransientState, PersistedState {
    // Actions
    setStep: (step: WizardStep) => void;
    setMetadata: (metadata: TrackMetadataFormValues) => void;
    setFiles: (master: File, cover: File | null) => void;
    setStems: (stems: StemUploadPayload[]) => void;
    setProgress: (progress: number) => void;
    setUploadedTrackId: (id: string) => void;
    setUploadError: (error: string | null) => void;
    resetWizard: () => void;
}

const defaultTransientState: TransientState = {
    masterFile: null,
    coverFile: null,
    stems: [],
    uploadProgress: 0,
    uploadedTrackId: null,
    uploadError: null,
};

const defaultPersistedState: PersistedState = {
    currentStep: 'METADATA',
    metadata: {
        title: '',
        isExplicit: false,
        customTags: []
    }
};

export const useUploadWizardStore = create<UploadWizardStore>()(
    persist(
        (set) => ({
            ...defaultTransientState,
            ...defaultPersistedState,

            setStep: (step) => set({currentStep: step}),

            setMetadata: (metadata) => set({metadata}),

            setFiles: (masterFile, coverFile) => set({masterFile, coverFile}),

            setStems: (stems) => set({stems}),

            setProgress: (uploadProgress) => set({uploadProgress}),

            setUploadedTrackId: (uploadedTrackId) => set({uploadedTrackId}),

            setUploadError: (uploadError) => set({uploadError}),

            resetWizard: () => set({...defaultTransientState, ...defaultPersistedState})
        }),
        {
            name: 'indiestream-upload-wizard',
            // persist text metadata and current step.
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                currentStep: state.currentStep === 'UPLOADING' || state.currentStep === 'PROCESSING'
                    ? 'METADATA'
                    : state.currentStep,
                metadata: state.metadata
            }),
        }
    )
);