"use client"

import type React from "react"

import { type RefObject, useEffect, useState, useRef } from "react"
import { useAppStore } from "../../store/useAppStore"
import { motion } from "framer-motion"

interface AudioPlayerProps {
  audioURL: string
  audioRef?: RefObject<HTMLAudioElement | null>
}

export function AudioPlayer({ audioURL, audioRef }: AudioPlayerProps) {
  const { hasUserInteracted } = useAppStore()
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const hasAutoPlayedRef = useRef(false)
  const hasTriedAutoplayAfterInteractionRef = useRef(false)

  // Use the provided audioRef or our local one
  const audioElement = audioRef?.current || localAudioRef.current

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    }

    setIsMobile(checkMobile())

    // Add a touch event listener to the document to help with autoplay
    const enableAutoplay = () => {
      // This creates a user gesture that might help with autoplay
      document.removeEventListener("touchstart", enableAutoplay)
      document.removeEventListener("click", enableAutoplay)
    }

    document.addEventListener("touchstart", enableAutoplay, { once: true })
    document.addEventListener("click", enableAutoplay, { once: true })

    return () => {
      document.removeEventListener("touchstart", enableAutoplay)
      document.removeEventListener("click", enableAutoplay)
    }
  }, [])

  useEffect(() => {
    if (!audioURL) {
      setIsLoading(false)
      return
    }

    const element = audioRef?.current || localAudioRef.current
    if (!element) return

    hasAutoPlayedRef.current = false // Reset for new audio

    setIsLoading(true)
    console.log("[AudioPlayer] New audio URL:", audioURL, isMobile ? "(mobile device)" : "(desktop)")

    // Clear any existing volume intervals on new audio setup
    const volumeInterval: NodeJS.Timeout | null = null

    const setupAudio = () => {
      // Reset state
      setIsPlaying(false)
      setProgress(0)

      const onCanPlay = () => {
        console.log("[AudioPlayer] Audio can play")
        setIsLoading(false)
        setDuration(element.duration)

        // Only attempt autoplay if we haven't tried yet for this audio
        if (!hasAutoPlayedRef.current) {
          console.log("[AudioPlayer] First autoplay attempt, hasUserInteracted:", hasUserInteracted)
          attemptAutoplay(element)
        }
      }

      const onTimeUpdate = () => setProgress(element.currentTime)

      const onEnded = () => {
        console.log("[AudioPlayer] Playback ended")
        setIsPlaying(false)
        setProgress(0)
        element.currentTime = 0
        element.pause()
      }

      const onError = () => {
        console.error("[AudioPlayer] Audio error:", element.error)
        setError(`Error: ${element.error?.message || "Unknown error"}`)
        setIsLoading(false)
      }

      const onPlaying = () => setIsPlaying(true)
      const onPause = () => setIsPlaying(false)

      element.addEventListener("canplay", onCanPlay)
      element.addEventListener("timeupdate", onTimeUpdate)
      element.addEventListener("ended", onEnded)
      element.addEventListener("error", onError)
      element.addEventListener("playing", onPlaying)
      element.addEventListener("pause", onPause)

      // Set attributes that might help with autoplay
      element.src = audioURL
      element.loop = false
      element.muted = false // Start muted (helps with autoplay)
      element.setAttribute("playsinline", "") // Important for iOS
      element.setAttribute("webkit-playsinline", "") // For older iOS
      element.load() // Load the audio but don't try to autoplay with attribute

      // Unmute after a short delay
      setTimeout(() => {
        element.muted = false
      }, 1)

      return () => {
        // First clear any existing volume interval
        if (volumeInterval) {
          clearInterval(volumeInterval)
        }

        element.removeEventListener("canplay", onCanPlay)
        element.removeEventListener("timeupdate", onTimeUpdate)
        element.removeEventListener("ended", onEnded)
        element.removeEventListener("error", onError)
        element.removeEventListener("playing", onPlaying)
        element.removeEventListener("pause", onPause)

        // Explicitly pause and reset when cleaning up
        element.pause()
        element.currentTime = 0
        element.src = ""
      }
    }

    const cleanup = setupAudio()
    return cleanup
  }, [audioURL])

  useEffect(() => {
    // Only run this effect if user has interacted AND we have an audio URL
    // AND we haven't tried this particular approach yet
    if (!hasUserInteracted || !audioURL || hasTriedAutoplayAfterInteractionRef.current) {
      return
    }

    const element = audioRef?.current || localAudioRef.current
    if (!element || isPlaying) return

    // Mark that we've tried this approach for this audio
    hasTriedAutoplayAfterInteractionRef.current = true

    console.log("[AudioPlayer] User has interacted, attempting playback again")

    // Store the interval ID for cleanup
    let volumeInterval: NodeJS.Timeout | null = null

    // Try playing again - this might work now that user has interacted
    element.volume = 0 // Start with volume at 0
    element.currentTime = 0 // Reset to beginning

    // Clean up function
    return () => {
      // Clear volume interval if it exists
      if (volumeInterval) {
        clearInterval(volumeInterval)
      }
    }
  }, [hasUserInteracted, audioURL, isPlaying, audioRef])

  useEffect(() => {
    hasTriedAutoplayAfterInteractionRef.current = false
  }, [audioURL, audioRef])

  const attemptAutoplay = (element: HTMLAudioElement) => {
    hasAutoPlayedRef.current = true // Mark that we've attempted autoplay
    console.log("[AudioPlayer] Attempting to play audio automatically")

    // Set volume to 0 first (helps with autoplay)
    element.volume = 0

    // First, rewind to beginning to ensure we don't miss anything
    element.currentTime = 0

    // Store any setInterval or setTimeout IDs for cleanup
    let volumeInterval: NodeJS.Timeout | null = null

    // Use a user activation event to trigger playback
    const playPromise = element.play()

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("[AudioPlayer] Autoplay successful, starting at full volume")
          element.volume = 1
        })
        .catch((e) => {
          console.error("[AudioPlayer] Auto-play failed:", e)
          element.volume = 1
        })
    }

    // Return a cleanup function that can be called externally if needed
    return () => {
      if (volumeInterval) clearInterval(volumeInterval)
    }
  }

  const togglePlayback = () => {
    if (!audioElement) return

    if (isPlaying) {
      audioElement.pause()
    } else {
      // Clear any previous errors
      setError(null)

      // Reset to the beginning if we're at the end
      if (audioElement.currentTime >= audioElement.duration - 0.1) {
        audioElement.currentTime = 0
      }

      // Ensure volume is set to full for manual play
      audioElement.volume = 1

      // On mobile, we need to ensure the play happens in response to a user gesture
      const playPromise = audioElement.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[AudioPlayer] Play successful")
            hasAutoPlayedRef.current = true // Mark as played successfully
          })
          .catch((e) => {
            console.error("[AudioPlayer] Play failed:", e)
            setError(`Playback error: ${e.message || e}`)
          })
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number.parseFloat(e.target.value)
    if (audioElement) {
      audioElement.currentTime = seekTime
      setProgress(seekTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="mt-4 w-full overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-[#1D1D1D] to-[#1D1D1D] border border-slate-700/50 p-4 rounded-2xl shadow-lg w-full overflow-hidden"
      >
        <div className="flex items-center mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-[#6A81FB]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"></path>
            <path d="M20.94 11A8.994 8.994 0 0 0 13 4.06V2"></path>
            <path d="M12 12V8"></path>
            <path d="M4 12H2"></path>
            <path d="M12 20v2"></path>
            <path d="M20.94 13A8.994 8.994 0 0 1 13 19.94"></path>
            <path d="M22 12h-2"></path>
            <path d="M4.06 13A8.994 8.994 0 0 0 12 19.94"></path>
            <path d="M4.06 11A8.994 8.994 0 0 1 12 4.06"></path>
          </svg>
          <h3 className="text-lg font-medium text-white">Foresight Response</h3>
        </div>

        {/* Audio element - use ref from props or local ref */}
        <audio ref={audioRef || localAudioRef} preload="auto" loop={false} style={{ display: "none" }} />

        {/* Custom player UI */}
        <div className="w-full overflow-hidden">
          <div className="flex items-center mb-2 w-full">
            <button
              onClick={togglePlayback}
              className={`${isPlaying ? "bg-gradient-to-r from-[#E15B73] to-[#FF7270]" : "bg-gradient-to-r from-[#FF7270] to-[#E15B73] hover:from-[#FF7270] hover:to-[#E15B73]"} text-white rounded-full w-12 h-12 flex items-center justify-center mr-4 flex-shrink-0 shadow-lg transition-all duration-300 transform ${isPlaying ? "scale-95" : "scale-100"}`}
              disabled={!audioURL || isLoading}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>

            <div className="flex-1">
              <div className="relative w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#6A81FB] to-[#E15B73] rounded-full"
                  style={{ width: `${(progress / duration) * 100}%` }}
                ></div>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="absolute w-full opacity-0 cursor-pointer"
                disabled={!audioURL || duration === 0 || isLoading}
                style={{ margin: 0, height: "4px", width: "calc(100% - 80px)", marginLeft: "48px" }}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {isLoading && audioURL && (
            <p className="text-[#6A81FB] text-sm mt-2 flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading audio response...
            </p>
          )}

          {error && (
            <p className="text-[#FF7270] text-sm mt-2 flex items-center">
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" x2="12" y1="8" y2="12"></line>
                <line x1="12" x2="12.01" y1="16" y2="16"></line>
              </svg>
              {error}
            </p>
          )}

          {!audioURL && !isLoading && (
            <p className="text-slate-500 text-sm mt-2 flex items-center justify-center">
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
              Press and hold anywhere to ask Foresight a question
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
