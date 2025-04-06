"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { StatusDisplay } from "./ui/StatusDisplay";
import { RecordButton } from "./ui/RecordButton";
import { createUser, uploadImage, getUserId, sendAudioPrompt, generateSpeech } from "../utils/api";
import { useAppStore } from "../store/useAppStore";
import { AudioPlayer } from "./ui/AudioPlayer";

export default function CameraCapture() {
  // Refs
  const webcamRef = useRef<Webcam>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imageUploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{x: number, y: number} | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const visualFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for user ID
  const [userId, setUserId] = useState<string | null>(null);
  const [showVisualFeedback, setShowVisualFeedback] = useState<boolean>(false);

  // Get state from Zustand store
  const { 
    error, 
    statusMessage, 
    isRecording, 
    audioURL, 
    cameraReady, 
    isIOSDevice, 
    isPressing, 
    mediaRecorder,
    hasUserInteracted,
    userId: storeUserId,
    setError,
    setStatusMessage,
    setIsRecording,
    setAudioURL,
    setCameraReady,
    setIsIOSDevice,
    setIsPressing,
    setMediaRecorder,
    setHasUserInteracted,
    setUserId: setStoreUserId,
    handlePressStart,
    handlePressEnd
  } = useAppStore();

  // Logger function
  const logger = (message: string) => {
    console.log(`[CameraCapture] ${message}`);
  };

  // Helper to detect iOS devices
  const detectIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);

  // Function to set up video element attributes (crucial for iOS)
  const setupVideoElement = useCallback(() => {
    if (webcamRef.current) {
      const videoElement = webcamRef.current.video;
      if (videoElement) {
        videoElementRef.current = videoElement;
        
        // These attributes are critical for iOS to display video
        videoElement.setAttribute('autoplay', '');
        videoElement.setAttribute('muted', '');
        videoElement.setAttribute('playsinline', '');
        
        // Force play for iOS
        if (isIOSDevice) {
          videoElement.play().catch(err => {
            logger(`Error playing video: ${err.message}`);
          });
        }
        
        logger("Set required video attributes for iOS compatibility");
        return true;
      }
    }
    return false;
  }, [isIOSDevice]);

  // Initialize camera based on platform
  const initializeCamera = useCallback(() => {
    const iOS = detectIOS();
    setIsIOSDevice(iOS);
    
    setStatusMessage(iOS ? "iOS device detected, setting up camera..." : "Setting up camera...");
    logger(iOS ? "iOS device detected, using default camera." : "Using default camera.");
  }, [detectIOS, setIsIOSDevice, setStatusMessage]);

  // Handle successful webcam initialization
  const handleUserMedia = useCallback((stream: MediaStream) => {
    setupVideoElement();
    setCameraReady(true);
    setError("");
    setStatusMessage("Camera ready");
    logger("Camera initialized successfully");
  }, [setupVideoElement, setCameraReady, setError, setStatusMessage]);

  // Handle webcam errors
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    setCameraReady(false);
    const errorMessage = error instanceof DOMException ? error.message : error;
    setError(`Camera error: ${errorMessage}`);
    setStatusMessage("Camera access failed");
    logger(`Camera error: ${errorMessage}`);
  }, [setCameraReady, setError, setStatusMessage]);

  // Set up on component mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported in this browser");
      setStatusMessage("Camera not supported");
      logger("Camera API not supported");
      return;
    }

    initializeCamera();
    setupVideoElement();
    setStatusMessage("Requesting camera access...");
    logger("Requesting camera access");

    // For iOS, we need to be more permissive with constraints
    // Using 'ideal' instead of 'exact' to prevent failures
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: isIOSDevice ? "environment" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
      .then(() => {
        setStatusMessage("Camera permission granted, initializing...");
        logger("Camera permission granted");
        
        // For iOS, we need to ensure video element attributes are set
        if (isIOSDevice) {
          setTimeout(() => {
            setupVideoElement();
            logger("Re-applied video attributes for iOS");
          }, 500);
        }
      })
      .catch(err => {
        setError(`Camera access failed: ${err.message}`);
        setStatusMessage("Could not access camera");
        logger(`Camera access failed: ${err.message}`);
      });

    return () => {
      if (videoElementRef.current && videoElementRef.current.srcObject) {
        const stream = videoElementRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        logger("Cleaned up camera stream");
      }
    };
  }, [isIOSDevice, setupVideoElement, setError, setStatusMessage]);

  // Create user on component mount
  useEffect(() => {
    async function initializeUser() {
      try {
        setStatusMessage("Initializing user...");
        logger("Checking for existing user ID...");
        
        // First check if we already have a user ID in the store
        if (storeUserId) {
          logger(`Using existing user ID from store: ${storeUserId}`);
          setUserId(storeUserId);
          setStatusMessage("User ready. Waiting for camera...");
          return;
        }
        
        // Then check localStorage via the API utility
        const existingUserId = getUserId();
        if (existingUserId) {
          logger(`Found user ID in localStorage: ${existingUserId}`);
          setUserId(existingUserId);
          setStoreUserId(existingUserId); // Sync with store
          setStatusMessage("User ready. Waiting for camera...");
          return;
        }
        
        // If no existing user ID, create a new one
        logger("No existing user ID found, creating new user...");
        const newUserId = await createUser();
        setUserId(newUserId);
        setStoreUserId(newUserId); // Sync with store
        setStatusMessage("User ready. Waiting for camera...");
        logger(`User initialized successfully with ID: ${newUserId}`);
      } catch (err) {
        setError("Failed to create or retrieve user. Please refresh.");
        setStatusMessage("Error with user initialization");
        logger("Error initializing user");
      }
    }
    
    initializeUser();
  }, [setError, setStatusMessage, storeUserId, setStoreUserId]);

  // Set video attributes when webcam component mounts
  useEffect(() => {
    if (webcamRef.current) {
      setupVideoElement();
    }
  }, [webcamRef.current, setupVideoElement]);

  // Set up interval for sending images when camera is ready and user exists
  useEffect(() => {
    if (cameraReady && userId && webcamRef.current) {
      setStatusMessage("Camera ready. Starting image uploads...");
      logger("Starting image uploads");

      imageUploadIntervalRef.current = setInterval(async () => {
        if (!webcamRef.current || !userId) return;

        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          try {
            const base64Response = await fetch(imageSrc);
            const imageBlob = await base64Response.blob();
            
            setStatusMessage(`Uploading image... (Size: ${Math.round(imageBlob.size / 1024)} KB)`);
            logger(`Uploading image for user ${userId}`);
            
            try {
              const result = await uploadImage(userId, imageBlob);
              logger("Image uploaded successfully");
              setStatusMessage("Image uploaded successfully. Waiting for next capture...");
            } catch (err: any) {
              setError(`Upload error: ${err.message || 'Unknown error'}`);
              setStatusMessage("Image upload failed. Retrying...");
              logger(`Upload error: ${err.message || 'Unknown error'}`);
            }
          } catch (err: any) {
            setError(`Image preparation error: ${err.message || 'Unknown error'}`);
            setStatusMessage("Failed to prepare image. Retrying...");
            logger(`Image preparation error: ${err.message || 'Unknown error'}`);
          }
        } else {
          setStatusMessage("Failed to capture image from webcam. Retrying...");
          logger("Failed to capture image from webcam");
        }
      }, 25000);

      return () => {
        if (imageUploadIntervalRef.current) {
          clearInterval(imageUploadIntervalRef.current);
          imageUploadIntervalRef.current = null;
          setStatusMessage("Stopped image uploads.");
          logger("Stopped image uploads");
        }
      };
    }
  }, [cameraReady, userId, setError, setStatusMessage]);

  // Set up audio recording with MediaRecorder
  useEffect(() => {
    if (cameraReady && !mediaRecorder) {
      logger("Setting up audio recording");
      
      // Function to request audio permissions
      const setupAudioRecording = () => {
        // iOS requires user interaction before requesting audio permissions
        // We'll use different constraints for iOS devices
        const audioConstraints = isIOSDevice ? 
          { 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            } 
          } : 
          { audio: true };
        
        logger(`Requesting audio permissions with constraints: ${JSON.stringify(audioConstraints)}`);
        
        navigator.mediaDevices.getUserMedia(audioConstraints)
          .then(stream => {
            logger("Got audio stream");
            
            // iOS Safari requires specific MIME types
            const mimeType = isIOSDevice ? 'audio/mp4' : 'audio/webm';
            
            // Create MediaRecorder instance with appropriate options for the platform
            let recorder;
            try {
              // Try with specified MIME type first
              recorder = new MediaRecorder(stream, { mimeType });
              logger(`Created MediaRecorder with mimeType: ${mimeType}`);
            } catch (e) {
              // Fall back to default if specified MIME type is not supported
              logger(`Failed to create MediaRecorder with ${mimeType}, using default`);
              recorder = new MediaRecorder(stream);
            }
            
            // Set up data handling
            recorder.ondataavailable = async (e) => {
              if (e.data.size > 0) {
                logger(`Audio data received: ${e.data.size} bytes`);
                audioChunksRef.current.push(e.data);
                
                // Check if recording has stopped
                if (recorder.state === "inactive") {
                  // Create audio blob from chunks - use appropriate MIME type
                  const blobType = isIOSDevice ? 'audio/mp4' : 'audio/webm';
                  const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
                  logger(`Audio recording complete: ${audioBlob.size} bytes, type: ${blobType}`);
                  
                  // Reset recording state
                  setIsRecording(false);
                  
                  // Clear audio chunks for next recording
                  audioChunksRef.current = [];
                  
                  try {
                    setStatusMessage("Sending audio to server...");
                    logger("Sending audio to server");
                  } catch (error) {
                    setError("Failed to send audio. Please refresh.");
                    setStatusMessage("Audio upload failed");
                    logger("Failed to send audio");
                  }
                  
                  if (userId) {
                    try {
                      const response = await sendAudioPrompt(userId, audioBlob);
                      setStatusMessage(`Audio sent successfully: ${response.message || 'Success'}`);
                      logger("Audio sent successfully");

                      try {
                        setStatusMessage("Generating speech from response...");
                        const speechResult = await generateSpeech(userId, response);
                        
                        // Always convert to Blob for consistent handling
                        let speechBlob: Blob;
                        
                        if (speechResult instanceof Blob) {
                          // Already a Blob, use it directly
                          speechBlob = speechResult;
                          logger("Received speech as Blob");
                        } else {
                          // Convert ReadableStream to Blob - wait for complete download
                          logger("Received speech as ReadableStream, converting to Blob and waiting for full download");
                          setStatusMessage("Downloading audio response...");
                          
                          try {
                            const reader = speechResult.getReader();
                            const chunks: Uint8Array[] = [];
                            
                            // Read the entire stream before proceeding
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) {
                                logger("Stream reading complete, all chunks received");
                                break;
                              }
                              if (value) {
                                chunks.push(value);
                                logger(`Received chunk: ${value.byteLength} bytes`);
                              }
                            }
                            
                            if (chunks.length > 0) {
                              // Concatenate chunks and create a Blob
                              const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                              const allChunks = new Uint8Array(totalLength);
                              let position = 0;
                              for (const chunk of chunks) {
                                allChunks.set(chunk, position);
                                position += chunk.length;
                              }
                              
                              speechBlob = new Blob([allChunks], { type: 'audio/mpeg' });
                              logger(`Created Blob from ${chunks.length} chunks, total size: ${speechBlob.size} bytes`);
                              setStatusMessage("Audio download complete");
                            } else {
                              throw new Error("No audio data received from stream");
                            }
                          } catch (streamError) {
                            logger(`Error converting stream to Blob: ${streamError}`);
                            throw streamError;
                          }
                        }
                        
                        // Create object URL from the Blob
                        const speechUrl = URL.createObjectURL(speechBlob);
                        logger(`Created URL for speech: ${speechUrl}`);
                        
                        // First, clear any previous audio URL to reset the audio player
                        setAudioURL("");
                        
                        // Then set the new audio URL after a small delay to ensure clean reset
                        setTimeout(() => {
                          // Update the audio URL in the store - THIS IS THE AI RESPONSE AUDIO
                          setAudioURL(speechUrl);
                          setStatusMessage("Audio ready to play");
                          logger("Speech generated and fully downloaded");
                          
                          // Let the AudioPlayer handle playback instead of doing it here
                          // This avoids the double-playback issue
                        }, 100);
                      } catch (speechError: any) {
                        setError(`Speech generation failed: ${speechError.message || 'Unknown error'}`);
                        setStatusMessage("Could not generate speech from response");
                        logger(`Speech generation failed: ${speechError.message || 'Unknown error'}`);
                      }
                    } catch (error: any) {
                      setError(`Failed to send audio: ${error.message || 'Unknown error'}`);
                      setStatusMessage("Audio upload failed");
                      logger(`Failed to send audio: ${error.message || 'Unknown error'}`);
                    }
                  } else {
                    throw new Error("User ID not available");
                  }
                }
              }
            };
            
            setMediaRecorder(recorder);
            setStatusMessage("Audio recording ready. Press and hold anywhere to record.");
            logger("Audio recording ready");
          })
          .catch(err => {
            setError(`Could not access microphone: ${err.message}. Please check permissions.`);
            setStatusMessage("Microphone access error");
            logger(`Microphone access error: ${err.message}`);
          });
      };
      
      // For iOS, we need to wait for a user interaction before requesting audio permissions
      if (isIOSDevice) {
        setStatusMessage("Tap anywhere to enable audio recording");
        logger("Waiting for user interaction before requesting audio permissions on iOS");
        
        // We'll set up a one-time event listener for the first user interaction
        const handleFirstInteraction = () => {
          logger("First user interaction detected, requesting audio permissions");
          setupAudioRecording();
          
          // Remove the event listener after first interaction
          document.removeEventListener('touchstart', handleFirstInteraction);
          document.removeEventListener('mousedown', handleFirstInteraction);
        };
        
        // Add event listeners for first interaction
        document.addEventListener('touchstart', handleFirstInteraction);
        document.addEventListener('mousedown', handleFirstInteraction);
        
        // Clean up event listeners on unmount
        return () => {
          document.removeEventListener('touchstart', handleFirstInteraction);
          document.removeEventListener('mousedown', handleFirstInteraction);
        };
      } else {
        // For non-iOS devices, we can request audio permissions immediately
        setupAudioRecording();
      }
    }
  }, [cameraReady, isIOSDevice, mediaRecorder, setAudioURL, setError, setIsRecording, setMediaRecorder, setStatusMessage, userId]);

  // Handle recording start
  const handleRecordingStart = useCallback(() => {
    if (mediaRecorder && !isRecording) {
      // Clear any previous audio URL only when starting a new recording
      // This ensures we don't play back the user's voice but doesn't affect AI responses
      setAudioURL("");
      
      // Start recording
      try {
        mediaRecorder.start();
        setIsRecording(true);
        setStatusMessage("Recording... Press anywhere to stop.");
        logger("Recording started");
      } catch (error) {
        setError(`Failed to start recording: ${error}`);
        logger(`Recording start error: ${error}`);
      }
    }
  }, [isRecording, mediaRecorder, setAudioURL, setError, setIsRecording, setStatusMessage]);

  // Handle recording stop
  const handleRecordingStop = useCallback(() => {
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
        setStatusMessage("Processing recording...");
        logger("Recording stopped");
      } catch (error) {
        setError(`Failed to stop recording: ${error}`);
        logger(`Recording stop error: ${error}`);
      }
    }
  }, [isRecording, mediaRecorder, setError, setStatusMessage]);

  // Handle press start
  const handlePress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPressing) {
      isScrollingRef.current = false;
      
      // Store the initial touch position for touch events
      if ('touches' in e) {
        const touch = e.touches[0];
        touchStartPosRef.current = {
          x: touch.clientX,
          y: touch.clientY
        };
      }
      
      // Delay visual feedback to prevent flickering during scrolling
      if (visualFeedbackTimerRef.current) {
        clearTimeout(visualFeedbackTimerRef.current);
      }
      
      visualFeedbackTimerRef.current = setTimeout(() => {
        if (!isScrollingRef.current) {
          setShowVisualFeedback(true);
        }
      }, 100); // Short delay to check if user starts scrolling
      
      handlePressStart();
      pressTimerRef.current = setTimeout(() => {
        if (isPressing && !isScrollingRef.current) {
          handleRecordingStart();
        }
      }, 500);
    }
  }, [handlePressStart, handleRecordingStart, isPressing]);

  // Handle touch move to detect scrolling
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartPosRef.current && isPressing) {
      const touch = e.touches[0];
      const currentPos = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      // Calculate distance moved
      const deltaX = Math.abs(currentPos.x - touchStartPosRef.current.x);
      const deltaY = Math.abs(currentPos.y - touchStartPosRef.current.y);
      
      // If the user has moved more than a threshold, consider it scrolling
      const scrollThreshold = 10; // pixels
      if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
        isScrollingRef.current = true;
        
        // Only cancel recording if it hasn't started yet
        if (!isRecording) {
          setShowVisualFeedback(false);
          
          // If we detect scrolling before recording starts, cancel the press timer
          if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
          }
          
          if (visualFeedbackTimerRef.current) {
            clearTimeout(visualFeedbackTimerRef.current);
            visualFeedbackTimerRef.current = null;
          }
          
          // Reset the press state
          handlePressEnd();
          logger("Scrolling detected before recording, press canceled");
        } else {
          // If already recording, allow scrolling without stopping the recording
          logger("Scrolling during recording, continuing to record");
        }
      }
    }
  }, [handlePressEnd, isPressing, isRecording]);

  // Handle press end
  const handlePressRelease = useCallback(() => {
    touchStartPosRef.current = null;
    setShowVisualFeedback(false);
    
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (visualFeedbackTimerRef.current) {
      clearTimeout(visualFeedbackTimerRef.current);
      visualFeedbackTimerRef.current = null;
    }
    
    if (isRecording) {
      handleRecordingStop();
    }
    
    handlePressEnd();
  }, [handlePressEnd, handleRecordingStop, isRecording]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        logger("Cleared press timer");
      }
      if (visualFeedbackTimerRef.current) {
        clearTimeout(visualFeedbackTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 h-full w-full overflow-hidden">
      <StatusDisplay 
        error={error} 
        message={statusMessage}
        isRecording={isRecording}
        isPressing={isPressing}
      />
      
      <div className="relative flex-1 flex flex-col items-center overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: isIOSDevice ? "environment" : "environment"
          }}
          className="rounded-lg shadow-md w-full h-full object-cover"
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
        />
        
        <div 
          className={`absolute inset-0 ${showVisualFeedback ? 'bg-red-500 bg-opacity-20' : ''} transition-colors duration-200`}
          onMouseDown={handlePress}
          onMouseUp={handlePressRelease}
          onTouchStart={handlePress}
          onTouchMove={handleTouchMove}
          onTouchEnd={handlePressRelease}
        />
      </div>
      
      {/* Only show the audio player when we have an AI response */}
      {audioURL && (
        <div className="w-full overflow-hidden">
          <AudioPlayer 
            audioURL={audioURL} 
            audioRef={audioRef}
          />
        </div>
      )}
    </div>
  );
}
