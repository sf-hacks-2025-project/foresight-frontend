"use client";

import { useState } from "react";
import CameraCapture from "./components/CameraCapture";
import { useAppStore } from "./store/useAppStore";
import { motion } from "framer-motion";
import Image from "next/image";
import { ControlPanel } from "./components/ui/ControlPanel";
import { ChatInterface } from "./components/ui/ChatInterface";

export default function Home() {
  const {
    handlePressStart,
    handlePressEnd,
    isRecording,
    isPressing,
    cameraReady,
  } = useAppStore();
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);

  const handleStopVideo = () => {
    setIsVideoStopped(true);
    setIsControlPanelOpen(false);
  };

  return (
    <div
      className="flex flex-col items-center justify-between min-h-screen max-h-screen overflow-hidden font-[family-name:var(--font-geist-sans)] bg-[#1D1D1D]"
      onMouseDown={!isControlPanelOpen ? handlePressStart : undefined}
      onMouseUp={!isControlPanelOpen ? handlePressEnd : undefined}
      onMouseLeave={!isControlPanelOpen ? handlePressEnd : undefined}
      onTouchStart={!isControlPanelOpen ? handlePressStart : undefined}
      onTouchEnd={!isControlPanelOpen ? handlePressEnd : undefined}
    >
      <header className="w-full py-4 px-6 flex items-center justify-between z-10">
        <div className="flex items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <div className="w-10 h-10 mr-3 relative flex items-center">
              <Image
                src="/images/foresight-logo.svg"
                alt="Foresight Logo"
                width={40}
                height={40}
                className="object-contain [filter:brightness(0)_saturate(100%)_invert(56%)_sepia(83%)_saturate(1095%)_hue-rotate(314deg)_brightness(101%)_contrast(101%)]"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF7270] to-[#E15B73] bg-clip-text text-transparent">
              Foresight
            </h1>
          </motion.div>
        </div>

        <div className="flex items-center space-x-3">
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center bg-[#E15B73]/20 px-3 py-1 rounded-full"
            >
              <div className="h-2 w-2 rounded-full bg-[#E15B73] mr-2 animate-pulse"></div>
              <span className="text-sm text-white/80">Listening</span>
            </motion.div>
          )}

          <button
            onClick={() => setIsControlPanelOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            aria-label="Open controls"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex flex-col w-full h-full flex-grow items-center overflow-hidden relative">
        {/* Camera component that fills available vertical space */}
        <div className="w-full h-full flex-grow flex flex-col max-w-2xl mx-auto relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full h-full rounded-3xl overflow-hidden relative"
          >
            <CameraCapture isVideoStopped={isVideoStopped} />
          </motion.div>
        </div>
      </main>

      <footer className="w-full py-4 px-6 flex flex-col items-center justify-center shrink-0 text-xs text-white/50 space-y-1">
        <span>Foresight</span>
        <span className="text-white/30">
          Created by Anson, Andrey, and Dima • SFHacks 2025
        </span>
      </footer>

      {/* Recording indicator - edge glow effect similar to Siri */}
      {isRecording && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 edge-glow-effect"></div>
        </div>
      )}

      {/* Press feedback - subtle highlight when pressing */}
      {isPressing && !isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="fixed inset-0 pointer-events-none z-20"
        >
          <div className="absolute inset-4 rounded-3xl border border-[#6A81FB]/30"></div>
        </motion.div>
      )}

      {/* Press and hold indicator - moved outside of the main content flow to prevent shifting */}
      {cameraReady && !isRecording && !isVideoStopped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none pb-4 z-40"
        >
          <div
            className={`bg-black/40 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm ${
              isPressing ? "scale-90" : "scale-100"
            } transition-transform duration-200 shadow-lg`}
          >
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
              Press and hold anywhere to speak
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Interface */}
      <ChatInterface />

      {/* Control Panel */}
      <ControlPanel
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
        onStopVideo={handleStopVideo}
      />
    </div>
  );
}
