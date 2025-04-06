"use client"

import { motion } from "framer-motion"

interface StatusDisplayProps {
  message: string
  error: string | null
  isRecording?: boolean
  isPressing?: boolean
  lastImageTime?: string | null
  isVideoStopped?: boolean
}

export function StatusDisplay({
  message,
  error,
  isRecording,
  isPressing,
  lastImageTime,
  isVideoStopped,
}: StatusDisplayProps) {
  return (
    <div className="w-full px-4 py-2 z-20 relative flex-shrink-0 status-display">
      {/* Status information */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`text-sm p-3 rounded-xl ${
          isVideoStopped && !isRecording
            ? "bg-gradient-to-r from-[#6A81FB]/20 to-[#6A81FB]/10 text-[#6A81FB] border border-[#6A81FB]/30"
            : isRecording
              ? "bg-gradient-to-r from-[#E15B73]/20 to-[#E15B73]/10 text-[#FF7270] border border-[#E15B73]/30"
              : "bg-gradient-to-r from-[#1D1D1D]/90 to-[#1D1D1D]/90 text-slate-300 border border-slate-700/50 backdrop-blur-sm"
        } flex items-center justify-between shadow-md status-display-text`}
      >
        <div className="flex items-center">
          {isVideoStopped && !isRecording ? (
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 text-[#6A81FB]"
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
              <span className="text-[#6A81FB] font-medium">Video paused, audio active</span>
            </div>
          ) : isRecording ? (
            <div className="flex items-center">
              <div className="flex items-end h-4 mr-2">
                <div className="audio-wave-bar h-3"></div>
                <div className="audio-wave-bar h-2"></div>
                <div className="audio-wave-bar h-4"></div>
                <div className="audio-wave-bar h-2"></div>
                <div className="audio-wave-bar h-3"></div>
              </div>
              <span className="text-[#FF7270] font-medium">{message}</span>
            </div>
          ) : (
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 text-[#6A81FB]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>{message}</span>
            </div>
          )}
          {isRecording && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#E15B73] animate-pulse"></span>}
        </div>

        {lastImageTime && !isVideoStopped && (
          <div className="text-xs text-slate-400 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4"></path>
              <path d="M12 18v4"></path>
              <path d="m4.93 4.93 2.83 2.83"></path>
              <path d="m16.24 16.24 2.83 2.83"></path>
              <path d="M2 12h4"></path>
              <path d="M18 12h4"></path>
              <path d="m4.93 19.07 2.83-2.83"></path>
              <path d="m16.24 7.76 2.83-2.83"></path>
            </svg>
            Last update: {lastImageTime}
          </div>
        )}

        {isVideoStopped && (
          <div className="text-xs text-[#6A81FB] flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M8 8v8"></path>
              <path d="M16 8v8"></path>
            </svg>
            Video paused
          </div>
        )}
      </motion.div>

      {/* Error message if any */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[#FF7270] p-4 border border-[#E15B73]/20 rounded-xl bg-[#E15B73]/10 mt-2 text-sm"
        >
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" x2="12" y1="8" y2="12"></line>
              <line x1="12" x2="12.01" y1="16" y2="16"></line>
            </svg>
            {error}
          </div>
        </motion.div>
      )}
    </div>
  )
}

