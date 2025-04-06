"use client";

import { RefObject, useEffect, useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";

// AudioContext for unlocking audio on mobile
let audioContext: AudioContext | null = null;

// Helper function to unlock audio context on mobile
const unlockAudioContext = () => {
  if (!audioContext) {
    try {
      window.AudioContext = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      audioContext = new AudioContext();
      
      // Resume the audio context
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create and play a silent buffer to unlock the audio context
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (e) {
      console.error('Failed to unlock audio context:', e);
    }
  }
};

interface AudioPlayerProps {
  audioURL: string;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export function AudioPlayer({ audioURL, audioRef }: AudioPlayerProps) {
  const { hasUserInteracted } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayedRef = useRef(false);
  const autoplayAttemptsRef = useRef(0);
  const autoplayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use the provided audioRef or our local one
  const audioElement = audioRef?.current || localAudioRef.current;
  
  // Detect if user is on mobile device and set up audio context
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };
    
    const isMobileDevice = checkMobile();
    setIsMobile(isMobileDevice);
    
    // Unlock audio context on page load
    unlockAudioContext();
    
    // Set up various event listeners to help with autoplay
    const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'scroll'];
    
    const unlockAudio = () => {
      unlockAudioContext();
      
      // Try to play any audio element
      const element = audioRef?.current || localAudioRef.current;
      if (element && element.paused) {
        element.muted = true; // Start muted to increase chances
        element.play().then(() => {
          setTimeout(() => {
            element.muted = false;
          }, 1000);
        }).catch(() => {});
      }
    };
    
    // Add listeners for all unlock events
    unlockEvents.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });
    
    // Simulate user interaction for iOS
    if (isMobileDevice) {
      // Create a temporary silent audio element and play it
      const silentAudio = new Audio();
      silentAudio.setAttribute('src', 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
      silentAudio.setAttribute('playsinline', '');
      silentAudio.setAttribute('webkit-playsinline', '');
      silentAudio.muted = true;
      silentAudio.play().catch(() => {});
    }
    
    return () => {
      // Clean up event listeners
      unlockEvents.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
      
      // Clear any autoplay interval
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
    };
  }, [audioRef]); // Include audioRef in dependencies

  useEffect(() => {
    if (!audioURL) {
      setIsLoading(false);
      return;
    }
  
    const element = audioRef?.current || localAudioRef.current;
    if (!element) return;

    hasAutoPlayedRef.current = false; // Reset for new audio
    autoplayAttemptsRef.current = 0; // Reset attempts counter
    
    // Clear any existing autoplay interval
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    }
  
    setIsLoading(true);
    console.log("[AudioPlayer] New audio URL:", audioURL, isMobile ? "(mobile device)" : "(desktop)");
    
    // Unlock audio context immediately
    unlockAudioContext();
  
    const setupAudio = () => {
      // Reset state
      setIsPlaying(false);
      setProgress(0);
  
      const onCanPlay = () => {
        console.log("[AudioPlayer] Audio can play");
        setIsLoading(false);
        setDuration(element.duration);
        
        // Function to attempt autoplay
        const attemptAutoplay = () => {
          console.log(`[AudioPlayer] Autoplay attempt #${autoplayAttemptsRef.current + 1}`);
          
          // Unlock audio context before attempting to play
          unlockAudioContext();
          
          // Set attributes that help with autoplay
          element.muted = true;
          element.volume = 0;
          
          // Try to play
          const playPromise = element.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log("[AudioPlayer] Autoplay successful!");
              hasAutoPlayedRef.current = true;
              
              // If successful, gradually increase volume and unmute
              setTimeout(() => {
                element.muted = false;
                let vol = 0;
                const volumeInterval = setInterval(() => {
                  if (vol < 1) {
                    vol += 0.1;
                    element.volume = Math.min(vol, 1);
                  } else {
                    clearInterval(volumeInterval);
                  }
                }, 50);
              }, 100);
              
              // Clear the retry interval if it exists
              if (autoplayIntervalRef.current) {
                clearInterval(autoplayIntervalRef.current);
                autoplayIntervalRef.current = null;
              }
            }).catch((e) => {
              console.error("[AudioPlayer] Autoplay attempt failed:", e);
              element.volume = 1; // Reset volume
              
              // Increment attempt counter
              autoplayAttemptsRef.current++;
              
              // If we've tried less than 5 times, try again
              if (autoplayAttemptsRef.current < 5 && !hasAutoPlayedRef.current) {
                // Don't set error message during retry attempts
                if (autoplayAttemptsRef.current === 4) {
                  setError("Auto-play blocked. Click play to listen.");
                }
              } else if (autoplayIntervalRef.current) {
                // Stop trying after 5 attempts
                clearInterval(autoplayIntervalRef.current);
                autoplayIntervalRef.current = null;
              }
            });
          }
        };
        
        // Always attempt autoplay regardless of device type
        if (!hasAutoPlayedRef.current) {
          // Try immediately
          attemptAutoplay();
          
          // And set up an interval to try multiple times (mobile browsers sometimes need multiple attempts)
          if (!autoplayIntervalRef.current) {
            autoplayIntervalRef.current = setInterval(() => {
              if (!hasAutoPlayedRef.current && autoplayAttemptsRef.current < 5) {
                attemptAutoplay();
              } else {
                // Stop trying after success or 5 attempts
                if (autoplayIntervalRef.current) {
                  clearInterval(autoplayIntervalRef.current);
                  autoplayIntervalRef.current = null;
                }
              }
            }, 1000); // Try every second
          }
        }
      };
  
      const onTimeUpdate = () => setProgress(element.currentTime);
  
      const onEnded = () => {
        console.log("[AudioPlayer] Playback ended");
        setIsPlaying(false);
        setProgress(0);
        element.currentTime = 0;
        element.pause();
      };
  
      const onError = () => {
        console.error("[AudioPlayer] Audio error:", element.error);
        setError(`Error: ${element.error?.message || "Unknown error"}`);
        setIsLoading(false);
      };
  
      const onPlaying = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
  
      element.addEventListener("canplay", onCanPlay);
      element.addEventListener("timeupdate", onTimeUpdate);
      element.addEventListener("ended", onEnded);
      element.addEventListener("error", onError);
      element.addEventListener("playing", onPlaying);
      element.addEventListener("pause", onPause);
  
      // Set attributes that might help with autoplay
      element.src = audioURL;
      element.loop = false;
      element.muted = true; // Start muted (helps with autoplay)
      element.setAttribute('playsinline', ''); // Important for iOS
      element.setAttribute('webkit-playsinline', ''); // For older iOS
      element.setAttribute('autoplay', ''); // Try native autoplay attribute
      element.crossOrigin = 'anonymous'; // Allow cross-origin if needed
      
      // Force low latency mode if available (helps with mobile)
      // Check for Firefox-specific autoplay property
      if ('mozAutoplayEnabled' in element) {
        (element as HTMLAudioElement & {mozAutoplayEnabled?: boolean}).mozAutoplayEnabled = true;
      }
      
      // Load the audio
      element.load();
      
      // Create a user gesture simulation
      const simulateUserGesture = () => {
        const event = new MouseEvent('touchend', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      };
      
      // Simulate user gesture after a short delay
      setTimeout(simulateUserGesture, 500);
  
      return () => {
        element.removeEventListener("canplay", onCanPlay);
        element.removeEventListener("timeupdate", onTimeUpdate);
        element.removeEventListener("ended", onEnded);
        element.removeEventListener("error", onError);
        element.removeEventListener("playing", onPlaying);
        element.removeEventListener("pause", onPause);
        element.pause();
      };
    };
  
    const cleanup = setupAudio();
    return cleanup;
  }, [audioURL, hasUserInteracted, isMobile]);
  
  
  const togglePlayback = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      // Clear any previous errors
      setError(null);
      
      // On mobile, we need to ensure the play happens in response to a user gesture
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[AudioPlayer] Play successful");
            hasAutoPlayedRef.current = true; // Mark as played successfully
          })
          .catch(e => {
            console.error("[AudioPlayer] Play failed:", e);
            setError(`Playback error: ${e.message || e}`);
          });
      }
    }
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioElement) {
      audioElement.currentTime = seekTime;
      setProgress(seekTime);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="mt-4 w-full overflow-hidden">
      <h3 className="text-lg font-medium mb-2">AI Response Audio:</h3>
      
      {/* Audio element - use ref from props or local ref */}
      <audio 
        ref={audioRef || localAudioRef}
        preload="auto"
        loop={false}
        muted
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      
      {/* Custom player UI */}
      <div className="bg-gray-100 p-3 rounded-lg w-full overflow-hidden">
        {!isPlaying && audioURL && !isLoading && (
          <div className="mb-2 text-center">
            <button 
              onClick={togglePlayback}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-full text-sm"
            >
              Play Audio
            </button>
          </div>
        )}
        <div className="flex items-center mb-2 w-full">
          <button 
            onClick={togglePlayback}
            className={`${isPlaying ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0`}
            disabled={!audioURL || isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="6" y="5" width="3" height="10" fill="currentColor" />
                <rect x="11" y="5" width="3" height="10" fill="currentColor" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4v12l8-6-8-6z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="w-full"
              disabled={!audioURL || duration === 0 || isLoading}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        
        {isLoading && audioURL && (
          <p className="text-blue-600 text-sm mt-1">
            Loading audio... please wait
          </p>
        )}
        
        {error && (
          <p className="text-red-500 text-sm mt-1">
            {error}
          </p>
        )}
        
        {!audioURL && (
          <p className="text-gray-500 text-sm">
            No audio available yet
          </p>
        )}
      </div>
    </div>
  );
}