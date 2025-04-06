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
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const hasAutoPlayedRef = useRef(false);
  
  // Use the provided audioRef or our local one
  const audioElement = audioRef?.current || localAudioRef.current;
  
  useEffect(() => {
    if (!audioURL) {
      setIsLoading(false);
      return;
    }
  
    const element = audioRef?.current || localAudioRef.current;
    if (!element) return;

    hasAutoPlayedRef.current = false; // Reset for new audio
  
    setIsLoading(true);
    console.log("[AudioPlayer] New audio URL:", audioURL);
  
    const setupAudio = () => {
      // Reset state
      setIsPlaying(false);
      setProgress(0);
  
      const onCanPlay = () => {
        console.log("[AudioPlayer] Audio can play");
        setIsLoading(false);
        setDuration(element.duration);
  
        if (hasUserInteracted && !hasAutoPlayedRef.current) {
          hasAutoPlayedRef.current = true; // Prevent further auto-play attempts
          console.log("[AudioPlayer] Attempting to play audio automatically");
          element.play().catch((e) => {
            console.error("[AudioPlayer] Auto-play failed:", e);
            setError("Auto-play blocked. Click play to listen.");
          });
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
  
      element.src = audioURL;
      element.loop = false;
      element.load();
  
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
  }, [audioURL, hasUserInteracted]);
  
  
  const togglePlayback = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play()
        .then(() => {
          console.log("[AudioPlayer] Play successful");
        })
        .catch(e => {
          console.error("[AudioPlayer] Play failed:", e);
          setError(`Playback error: ${e}`);
        });
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