import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  // Error state
  error: string | null;
  setError: (error: string | null) => void;
  
  // Status message
  statusMessage: string;
  setStatusMessage: (message: string) => void;
  
  // Recording state
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  
  // Audio URL for playback
  audioURL: string | null;
  setAudioURL: (url: string | null) => void;
  
  // Camera state
  cameraReady: boolean;
  setCameraReady: (ready: boolean) => void;
  
  // Device detection
  isIOSDevice: boolean;
  setIsIOSDevice: (isIOS: boolean) => void;
  
  // Press state for press-and-hold functionality
  isPressing: boolean;
  setIsPressing: (isPressing: boolean) => void;
  
  // Media recorder reference
  mediaRecorder: MediaRecorder | null;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  
  // User ID
  userId: string | null;
  setUserId: (id: string | null) => void;
  
  // User interaction flag
  hasUserInteracted: boolean;
  setHasUserInteracted: (hasInteracted: boolean) => void;
  
  // Press handling functions
  handlePressStart: () => void;
  handlePressEnd: () => void;
  
  // Reset state
  resetState: () => void;
}

const initialState = {
  error: null,
  statusMessage: "Initializing camera...",
  isRecording: false,
  audioURL: null,
  cameraReady: false,
  isIOSDevice: false,
  isPressing: false,
  mediaRecorder: null,
  userId: null,
  hasUserInteracted: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // State setters
      setError: (error) => set({ error }),
      setStatusMessage: (statusMessage) => set({ statusMessage }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setAudioURL: (audioURL) => set({ audioURL }),
      setCameraReady: (cameraReady) => set({ cameraReady }),
      setIsIOSDevice: (isIOSDevice) => set({ isIOSDevice }),
      setIsPressing: (isPressing) => set({ isPressing }),
      setMediaRecorder: (mediaRecorder) => set({ mediaRecorder }),
      setUserId: (userId) => set({ userId }),
      setHasUserInteracted: (hasUserInteracted) => set({ hasUserInteracted }),
      
      // Press handling functions
      handlePressStart: () => {
        const state = get();
        if (state.cameraReady && !state.isRecording) {
          set((state) => {
            // Mark that user has interacted when they press to record
            if (!state.hasUserInteracted) {
              state.setHasUserInteracted(true);
            }
            
            return { isPressing: true };
          });
          
          // Start a timer to begin recording after a short press
          const pressTimer = setTimeout(() => {
            const currentState = get();
            if (currentState.isPressing && !currentState.isRecording && currentState.mediaRecorder) {
              // Start recording
              try {
                currentState.mediaRecorder.start();
                set({ 
                  isRecording: true,
                  statusMessage: 'Recording audio...',
                  audioURL: '' // Clear any previous audio URL when recording starts
                });
              } catch (err) {
                set({ 
                  error: 'Failed to start recording',
                  statusMessage: 'Recording error'
                });
              }
            }
          }, 500); // 500ms press to start recording
          
          // Store the timer ID in a variable that can be accessed by handlePressEnd
          (window as any).__pressTimerId = pressTimer;
        }
      },
      
      handlePressEnd: () => {
        const state = get();
        set({ isPressing: false });
        
        // Clear the press timer if it exists
        if ((window as any).__pressTimerId) {
          clearTimeout((window as any).__pressTimerId);
          (window as any).__pressTimerId = null;
        }
        
        // If recording, stop it
        if (state.isRecording && state.mediaRecorder) {
          try {
            state.mediaRecorder.stop();
            set({ 
              statusMessage: 'Processing audio...'
            });
            // Note: isRecording will be set to false when the ondataavailable event fires
          } catch (err) {
            set({ 
              isRecording: false,
              error: 'Failed to stop recording',
              statusMessage: 'Recording error'
            });
          }
        }
      },
      
      // Reset state
      resetState: () => set(initialState),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userId: state.userId,
      }),
    }
  )
);
