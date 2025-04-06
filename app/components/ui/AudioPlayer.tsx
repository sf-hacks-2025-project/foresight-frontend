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
  
    const setupAudio = () => {
      // Reset state
      setIsPlaying(false);
      setProgress(0);
  
      const onCanPlay = () => {
        console.log("[AudioPlayer] Audio can play");
        setIsLoading(false);
        setDuration(element.duration);
  
        // Always attempt autoplay regardless of device type
        if (!hasAutoPlayedRef.current) {
          hasAutoPlayedRef.current = true; // Prevent further auto-play attempts
          console.log("[AudioPlayer] Attempting to play audio automatically on all devices");
          
          // Set volume to 0 first (sometimes helps with autoplay)
          element.volume = 0;
          
          // Use a user activation event to trigger playback
          const playPromise = element.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log("[AudioPlayer] Autoplay successful, gradually increasing volume");
              // If successful, gradually increase volume
              let vol = 0;
              const volumeInterval = setInterval(() => {
                if (vol < 1) {
                  vol += 0.1;
                  element.volume = Math.min(vol, 1);
                } else {
                  clearInterval(volumeInterval);
                }
              }, 100);
            }).catch((e) => {
              console.error("[AudioPlayer] Auto-play failed:", e);
              setError("Auto-play blocked. Click play to listen.");
              // Reset volume if autoplay fails
              element.volume = 1;
            });
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