"\"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "../store/useAppStore"
import { useChatStore } from "../store/useChatStore"
import { uploadImage, sendAudioPrompt } from "../utils/api"

interface CameraCaptureProps {
  onImageCapture?: (imageBlob: Blob) => void
}

export function CameraCapture({ onImageCapture }: CameraCaptureProps) {
  // State for camera access and recording
  const [hasAccess, setHasAccess] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lastCaptureTime, setLastCaptureTime] = useState<number | null>(null)
  const [captureInterval, setCaptureInterval] = useState<number>(1000) // 1 second default
  const [showPressIndicator, setShowPressIndicator] = useState(true)

  // Refs for media elements and streams
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Global app state
  const {
    userId,
    setStatusMessage,
    setError,
    setAudioURL,
    isRecording: isAppRecording,
    setIsRecording: setIsAppRecording,
    audioURL,
    cameraReady,
    setCameraReady,
    isIOSDevice,
    setIsIOSDevice,
    isPressing,
    setIsPressing,
    mediaRecorder,
    setMediaRecorder,
    hasUserInteracted,
    setHasUserInteracted,
  } = useAppStore()

  // Chat store for adding messages
  const { addMessage } = useChatStore()

  // Function to handle errors
  const handleError = (error: Error) => {
    console.error("Camera error:", error)
    setError(`Camera error: ${error.message}`)
    setHasAccess(false)
  }

  // Function to request camera access
  const requestCameraAccess = useCallback(async () => {
    try {
      setStatusMessage("Requesting camera access...")

      // Get list of video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setDevices(videoDevices)

      // Use the first device by default, or the selected one if available
      const deviceId = selectedDeviceId || (videoDevices.length > 0 ? videoDevices[0].deviceId : "")

      // Request access to camera and microphone
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setHasAccess(true)
      setStatusMessage("Camera access granted")
      setSelectedDeviceId(deviceId)
      setCameraReady(true)
    } catch (error) {
      handleError(error as Error)
      setCameraReady(false)
    }
  }, [selectedDeviceId, setError, setStatusMessage, setCameraReady])

  // Function to switch camera device
  const switchCamera = async (deviceId: string) => {
    if (streamRef.current) {
      // Stop all tracks in the current stream
      streamRef.current.getTracks().forEach((track) => track.stop())
    }

    setSelectedDeviceId(deviceId)
    setShowDeviceSelector(false)
    await requestCameraAccess()
  }

  // Function to toggle device selector
  const toggleDeviceSelector = () => {
    setShowDeviceSelector(!showDeviceSelector)
  }

  // Function to toggle controls
  const toggleControls = () => {
    setShowControls(!showControls)
  }

  // Function to start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    try {
      setStatusMessage("Starting recording...")
      setIsRecording(true)
      setIsAppRecording(true)
      setRecordingStartTime(Date.now())
      setElapsedTime(0)
      audioChunksRef.current = []

      // Create a MediaRecorder instance
      const options = { mimeType: "audio/webm" }
      const mediaRecorder = new MediaRecorder(streamRef.current, options)
      mediaRecorderRef.current = mediaRecorder
      setMediaRecorder(mediaRecorder)

      // Event handler for when data is available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Event handler for when recording stops
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          await processAudioRecording(audioBlob)
        }
        setIsRecording(false)
        setIsAppRecording(false)
        setRecordingStartTime(null)
        setElapsedTime(0)
        setMediaRecorder(null)
      }

      // Start recording
      mediaRecorder.start()

      // Start a timer to update elapsed time
      recordingIntervalRef.current = setInterval(() => {
        if (recordingStartTime) {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
          setElapsedTime(elapsed)
        }
      }, 1000)

      // Start capturing images at regular intervals
      startImageCapture()
    } catch (error) {
      console.error("Error starting recording:", error)
      setError(`Error starting recording: ${(error as Error).message}`)
      setIsRecording(false)
      setIsAppRecording(false)
      setMediaRecorder(null)
    }
  }, [setError, setStatusMessage, recordingStartTime, setIsAppRecording, setMediaRecorder])

  // Function to stop recording
  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        setStatusMessage("Stopping recording...")
        mediaRecorderRef.current.stop()
      }

      // Clear intervals and timeouts
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current)
        captureTimeoutRef.current = null
      }

      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current)
        uploadIntervalRef.current = null
      }

      setLastCaptureTime(null)
      setUploadProgress(0)
      setIsUploading(false)
    } catch (error) {
      console.error("Error stopping recording:", error)
      setError(`Error stopping recording: ${(error as Error).message}`)
    }
  }, [setError, setStatusMessage])

  // Function to process audio recording
  const processAudioRecording = async (audioBlob: Blob) => {
    if (!userId) {
      setError("User ID not found. Please refresh the page.")
      return
    }

    try {
      setStatusMessage("Processing audio...")

      // Add the audio message to the chat history
      addMessage({
        id: Date.now().toString(),
        text: "[Audio Message]",
        sender: "user",
        timestamp: new Date(),
        isAudio: true,
      })

      // Send the audio to the API
      const response = await sendAudioPrompt(userId, audioBlob)

      // Extract the response text
      const responseText =
        typeof response === "string"
          ? response
          : response && typeof response === "object" && "text" in response
            ? (response as { text: string }).text
            : response && typeof response === "object" && "message" in response
              ? (response as { message: string }).message
              : "I didn't understand that. Could you try again?"

      // Add the AI response to the chat
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai" as const,
        timestamp: new Date(),
      }

      addMessage(aiMessage)

      // Create audio URL for playback
      const audioURL = URL.createObjectURL(audioBlob)
      setAudioURL(audioURL)
      setStatusMessage("Audio processed successfully")
    } catch (error) {
      console.error("Error processing audio:", error)
      setError(`Error processing audio: ${(error as Error).message}`)
    }
  }

  // Function to capture an image from the video stream
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !userId || isPaused) return

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Could not get canvas context")
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else throw new Error("Failed to create image blob")
        }, "image/png")
      })

      // Call the onImageCapture callback if provided
      if (onImageCapture) {
        onImageCapture(blob)
      }

      // Upload the image to the server
      await uploadImage(userId, blob)
      setLastCaptureTime(Date.now())
      setStatusMessage("Visual context analyzed")
    } catch (error) {
      console.error("Error capturing image:", error)
      setError(`Error capturing image: ${(error as Error).message}`)
    }
  }, [userId, onImageCapture, isPaused, setError, setStatusMessage])

  // Function to start capturing images at regular intervals
  const startImageCapture = useCallback(() => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current)
    }

    const captureAndSchedule = () => {
      if (!isRecording || isPaused) return

      captureImage()
      captureTimeoutRef.current = setTimeout(captureAndSchedule, captureInterval)
    }

    captureAndSchedule()
  }, [captureImage, captureInterval, isRecording, isPaused])

  // Function to toggle video pause state
  const togglePause = () => {
    setIsPaused(!isPaused)
    setStatusMessage(isPaused ? "Video resumed" : "Video paused")
  }

  // Function to handle long press for recording
  const handleLongPressStart = () => {
    setShowPressIndicator(false)
    longPressTimeoutRef.current = setTimeout(() => {
      startRecording()
    }, 300) // Short delay to prevent accidental recordings
  }

  // Function to handle long press end
  const handleLongPressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    if (isRecording) {
      stopRecording()
    }

    setTimeout(() => {
      setShowPressIndicator(true)
    }, 500)
  }

  // Effect to request camera access on component mount
  useEffect(() => {
    requestCameraAccess()

    // Cleanup function to stop all media tracks when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current)
      }
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current)
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [requestCameraAccess])

  // Render the component
  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Video display */}
      <div
        className={`relative flex-grow overflow-hidden rounded-lg ${isPaused ? "filter blur-md" : ""}`}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
      >
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {/* Canvas for capturing images (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute inset-0 border-4 border-red-500 rounded-lg z-10 pointer-events-none">
            <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
              <span className="animate-pulse mr-1">●</span>
              {elapsedTime}s
            </div>
          </div>
        )}

        {/* Video paused indicator */}
        {isPaused && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-20">
            Video Paused
          </div>
        )}
      </div>

      {/* Press and hold indicator */}
      <AnimatePresence>
        {showPressIndicator && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-20 flex items-center"
          >
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
            Press and hold anywhere to ask
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CameraCapture

