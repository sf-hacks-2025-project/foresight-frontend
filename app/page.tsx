"use client";

import Image from "next/image";
import CameraCapture from "./components/CameraCapture";
import { useAppStore } from "./store/useAppStore";

export default function Home() {
  const { 
    handlePressStart, 
    handlePressEnd, 
    isRecording,
    isPressing,
    cameraReady
  } = useAppStore();

  return (
    <div 
      className="flex flex-col items-center justify-between min-h-screen max-h-screen overflow-hidden font-[family-name:var(--font-geist-sans)]"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      <main className="flex flex-col w-full h-full flex-grow items-center py-2 overflow-hidden">
        <h1 className="text-2xl font-bold mb-2 text-[var(--color-bittersweet-orange)]">Vision AI</h1>
        
        {/* Camera component that fills available vertical space */}
        <div className="w-full h-full flex-grow flex flex-col px-4 max-w-2xl mx-auto relative overflow-hidden">
          <CameraCapture />
          
          {/* Tap anywhere overlay - only show when camera is ready and not recording */}
          {cameraReady && !isRecording && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm ${isPressing ? 'scale-90' : 'scale-100'} transition-transform duration-200`}>
                Press and hold anywhere to record
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="w-full py-2 flex gap-[24px] flex-wrap items-center justify-center shrink-0">
        {/* ... existing footer content ... */}
      </footer>
      
      {/* Recording indicator - perfect rainbow glowing border */}
      {isRecording && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-2 rainbow-border bg-transparent"></div>
        </div>
      )}
      
      {/* Press feedback - subtle highlight when pressing */}
      {isPressing && !isRecording && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 border-4 border-[var(--color-bittersweet-orange)] border-opacity-30"></div>
        </div>
      )}
    </div>
  );
}