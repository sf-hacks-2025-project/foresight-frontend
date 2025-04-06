"use client";

import { RefObject, useEffect, useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";

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
  const hasTriedAutoplayAfterInteractionRef = useRef(false);

  // Use the provided audioRef or our local one
  const audioElement = audioRef?.current || localAudioRef.current;

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    };

    setIsMobile(checkMobile());

    // Add a touch event listener to the document to help with autoplay
    const enableAutoplay = () => {
      // This creates a user gesture that might help with autoplay
      document.removeEventListener('touchstart', enableAutoplay);
      document.removeEventListener('click', enableAutoplay);
    };

    document.addEventListener('touchstart', enableAutoplay, { once: true });
    document.addEventListener('click', enableAutoplay, { once: true });

    return () => {
      document.removeEventListener('touchstart', enableAutoplay);
      document.removeEventListener('click', enableAutoplay);
    };
  }, []);

  useEffect(() => {
    if (!audioURL) {
      setIsLoading(false);
      return;
    }

    const element = audioRef?.current || localAudioRef.current;
    if (!element) return;

    hasAutoPlayedRef.current = false; // Reset for new audio

    setIsLoading(true);
    console.log("[AudioPlayer] New audio URL:", audioURL, isMobile ? "(mobile device)" : "(desktop)");

    // Clear any existing volume intervals on new audio setup
    let volumeInterval: NodeJS.Timeout | null = null;

    const setupAudio = () => {
      // Reset state
      setIsPlaying(false);
      setProgress(0);

      const onCanPlay = () => {
        console.log("[AudioPlayer] Audio can play");
        setIsLoading(false);
        setDuration(element.duration);

        // Only attempt autoplay if we haven't tried yet for this audio
        if (!hasAutoPlayedRef.current) {
          console.log("[AudioPlayer] First autoplay attempt, hasUserInteracted:", hasUserInteracted);
          attemptAutoplay(element);
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
      element.load();

      // Unmute after a short delay (after autoplay hopefully succeeds)
      setTimeout(() => {
        if (element.paused) {
          // If still paused, try playing again
          element.play().catch(() => {
            // Silent catch - we'll handle errors elsewhere
            element.muted = false;
          });
        } else {
          // If playing, unmute
          element.muted = false;
        }
      }, 1000);

      return () => {
        // First clear any existing volume interval
        if (volumeInterval) {
          clearInterval(volumeInterval);
        }

        element.removeEventListener("canplay", onCanPlay);
        element.removeEventListener("timeupdate", onTimeUpdate);
        element.removeEventListener("ended", onEnded);
        element.removeEventListener("error", onError);
        element.removeEventListener("playing", onPlaying);
        element.removeEventListener("pause", onPause);

        // Explicitly pause and reset when cleaning up
        element.pause();
        element.currentTime = 0;
        element.src = '';
      };
    };

    const cleanup = setupAudio();
    return cleanup;
  }, [audioURL]);

  useEffect(() => {
    // Only run this effect if user has interacted AND we have an audio URL
    // AND we haven't tried this particular approach yet
    if (!hasUserInteracted || !audioURL || hasTriedAutoplayAfterInteractionRef.current) {
      return;
    }

    const element = audioRef?.current || localAudioRef.current;
    if (!element || isPlaying) return;

    // Mark that we've tried this approach for this audio
    hasTriedAutoplayAfterInteractionRef.current = true;

    console.log("[AudioPlayer] User has interacted, attempting playback again");

    // Store the interval ID for cleanup
    let volumeInterval: NodeJS.Timeout | null = null;

    // Try playing again - this might work now that user has interacted
    element.volume = 0; // Start with volume at 0
    element.currentTime = 0; // Reset to beginning

    const playAttempt = element.play()
      .then(() => {
        console.log("[AudioPlayer] Delayed autoplay successful after user interaction");

        // If successful, pause immediately to not miss the beginning
        element.pause();
        element.currentTime = 0; // Rewind to beginning again

        // Small delay to ensure everything is ready
        const timeoutId = setTimeout(() => {
          // Play again from the beginning
          element.play().then(() => {
            // Gradually increase volume
            let vol = 0;
            volumeInterval = setInterval(() => {
              if (vol < 1) {
                vol += 0.1;
                element.volume = Math.min(vol, 1);
              } else if (volumeInterval) {
                clearInterval(volumeInterval);
                volumeInterval = null;
              }
            }, 100);
          }).catch(e => {
            console.error("[AudioPlayer] Second play attempt failed:", e);
            element.volume = 1;
          });
        }, 100);

        // Return the timeout ID for cleanup
        return timeoutId;
      })
      .catch(e => {
        console.error("[AudioPlayer] Delayed autoplay still failed:", e);
        element.volume = 1;
        return null;
      });

    // Clean up function
    return () => {
      // Cancel the play attempt if possible
      if (playAttempt) {
        playAttempt.then(timeoutId => {
          if (timeoutId) clearTimeout(timeoutId);
        });
      }

      // Clear volume interval if it exists
      if (volumeInterval) {
        clearInterval(volumeInterval);
      }
    };
  }, [hasUserInteracted, audioURL, isPlaying]);

  useEffect(() => {
    hasTriedAutoplayAfterInteractionRef.current = false;
  }, [audioURL]);

  const attemptAutoplay = (element: HTMLAudioElement) => {
    hasAutoPlayedRef.current = true; // Mark that we've attempted autoplay
    console.log("[AudioPlayer] Attempting to play audio automatically");

    // Set volume to 0 first (helps with autoplay)
    element.volume = 0;

    // First, rewind to beginning to ensure we don't miss anything
    element.currentTime = 0;

    // Store any setInterval or setTimeout IDs for cleanup
    let volumeInterval: NodeJS.Timeout | null = null;
    let delayTimeout: NodeJS.Timeout | null = null;

    // Use a user activation event to trigger playback
    const playPromise = element.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log("[AudioPlayer] Autoplay successful, gradually increasing volume");

        // If successful, pause immediately to not miss the beginning
        element.pause();

        // Rewind to beginning again
        element.currentTime = 0;

        // Small delay to ensure everything is ready
        delayTimeout = setTimeout(() => {
          // Play again from the beginning
          element.play().then(() => {
            // Now gradually increase volume
            let vol = 0;
            volumeInterval = setInterval(() => {
              if (vol < 1) {
                vol += 0.1;
                element.volume = Math.min(vol, 1);
              } else if (volumeInterval) {
                clearInterval(volumeInterval);
                volumeInterval = null;
              }
            }, 100);
          }).catch(e => {
            console.error("[AudioPlayer] Second play attempt failed:", e);
            element.volume = 1;
          });
        }, 100);
      }).catch((e) => {
        console.error("[AudioPlayer] Auto-play failed:", e);
        setError("Auto-play blocked. Click play to listen.");
        // Reset volume if autoplay fails
        element.volume = 1;
      });
    }

    // Return a cleanup function that can be called externally if needed
    return () => {
      if (volumeInterval) clearInterval(volumeInterval);
      if (delayTimeout) clearTimeout(delayTimeout);
    };
  };

  const togglePlayback = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      // Clear any previous errors
      setError(null);

      // Reset to the beginning if we're at the end
      if (audioElement.currentTime >= audioElement.duration - 0.1) {
        audioElement.currentTime = 0;
      }

      // Ensure volume is set to full for manual play
      audioElement.volume = 1;

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