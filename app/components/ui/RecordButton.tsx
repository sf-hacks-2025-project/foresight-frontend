"use client";

import { useState, useEffect } from "react";

interface RecordButtonProps {
  isRecording: boolean;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
  disabled?: boolean;
}

export function RecordButton({
  isRecording,
  onRecordStart,
  onRecordStop,
  disabled = false
}: RecordButtonProps) {
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  const handleClick = () => {
    if (isRecording) {
      onRecordStop?.();
    } else {
      onRecordStart?.();
    }
  };

  return (
    <div className="w-full flex items-center justify-center my-2">
      <div 
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          isRecording 
            ? 'bg-[var(--color-mandy-pink)] text-white' 
            : 'bg-black bg-opacity-50 text-white'
        } ${disabled ? 'opacity-50' : ''}`}
        onClick={disabled ? undefined : handleClick}
        onTouchStart={(e) => e.preventDefault()} // Prevent default behavior
        onTouchEnd={(e) => {
          e.preventDefault();
          if (!disabled) handleClick();
        }}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {isRecording ? (
          <>
            <span className="h-3 w-3 rounded-full bg-white animate-pulse"></span>
            <span>Recording...</span>
          </>
        ) : (
          <span>Press anywhere to record</span>
        )}
      </div>
    </div>
  );
}