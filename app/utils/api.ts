// Client-side API utilities
import axios from "axios"

// Base URL for the API
const API_BASE_URL = "https://sfhacks-backend.onrender.com/api"

// Storage key for user ID
const USER_ID_STORAGE_KEY = "sfhacks_user_id"

// Simple logger object
const logger = {
  log: (...args: any[]) => {
    console.log("[api.ts]", ...args)
  },
  error: (...args: any[]) => {
    console.error("[api.ts]", ...args)
  },
}

// Helper function to save user ID to localStorage
export function saveUserId(userId: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_ID_STORAGE_KEY, userId)
      logger.log("User ID saved to localStorage:", userId)
    }
  } catch (error) {
    logger.error("Error saving user ID to localStorage:", error)
  }
}

// Helper function to get user ID from localStorage
export function getUserId(): string | null {
  try {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem(USER_ID_STORAGE_KEY)
      return userId
    }
  } catch (error) {
    logger.error("Error getting user ID from localStorage:", error)
  }
  return null
}

// Helper function to handle API errors
const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code outside the range of 2xx
    logger.error("API Error Response:", error.response.data)
    logger.error("Status:", error.response.status)
  } else if (error.request) {
    // The request was made but no response was received
    logger.error("No response received:", error.request)
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error("Error:", error.message)
  }
}

// 1. User API - Create a new user
export async function createUser() {
  try {
    // First check if we already have a user ID in localStorage
    const existingUserId = getUserId()
    if (existingUserId) {
      logger.log("Using existing user ID from localStorage:", existingUserId)
      return existingUserId
    }

    // If no existing user ID, create a new one
    const response = await axios.get(`${API_BASE_URL}/user/create`)
    const userId = response.data.user_id
    logger.log("User created with ID:", userId)

    // Save the new user ID to localStorage
    saveUserId(userId)

    return userId
  } catch (error) {
    handleApiError(error)
    throw error
  }
}

// 2. Vision API - Upload an image
export async function uploadImage(userId: string, imageBlob: Blob) {
  try {
    logger.log("Starting image upload")

    // Convert Blob to base64 string
    const base64Image = await blobToBase64(imageBlob)
    // Remove the data:image/jpeg;base64, or data:image/png;base64, part if it exists
    const base64Data = base64Image.includes("base64,") ? base64Image.split("base64,")[1] : base64Image

    // Create JSON payload
    const payload = {
      user_id: userId,
      mime_type: "image/png",
      filename: "webcam_capture.png",
      image_base64: base64Data,
    }

    // Construct the URL
    const apiUrl = `${API_BASE_URL}/vision/upload`
    logger.log("Uploading image to:", apiUrl)

    // Send the request with JSON payload
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    logger.log("Image upload successful:", response.data)
    return response.data
  } catch (error) {
    handleApiError(error)
    throw error
  }
}

// Helper function to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 3. Vision API - Clear visual history
export async function clearVisionHistory(userId: string) {
  try {
    const apiUrl = `${API_BASE_URL}/vision/clear`
    logger.log("Clearing vision history at:", apiUrl)

    const response = await axios.get(apiUrl, {
      params: { user_id: userId },
    })

    logger.log("Vision history cleared:", response.data.message)
    return response.data
  } catch (error) {
    logger.error("Error clearing vision history:", error)
    handleApiError(error)
    throw error
  }
}

// Helper function to convert audio buffer to blob
export function bufferToBlob(buffer: ArrayBuffer, mimeType = "audio/wav"): Blob {
  return new Blob([buffer], { type: mimeType })
}

// 4. Conversation API - Send text prompt
export async function sendTextPrompt(userId: string, textQuery: string) {
  try {
    const apiUrl = `${API_BASE_URL}/conversation/text`
    logger.log("Sending text prompt to:", apiUrl)

    const response = await axios.post(apiUrl, {
      user_id: userId,
      text_query: textQuery,
    })

    logger.log("Text prompt response:", response.data)
    return response.data
  } catch (error) {
    logger.error("Error sending text prompt:", error)
    handleApiError(error)
    throw error
  }
}

// 5. Conversation API - Send audio prompt
export async function sendAudioPrompt(userId: string, audioBlob: Blob) {
  try {
    // Create a FormData object
    const formData = new FormData()

    // Append the user ID and audio blob
    formData.append("user_id", userId)
    formData.append("audio_file", audioBlob, "audio_recording.wav")

    const apiUrl = `${API_BASE_URL}/conversation/audio`
    logger.log("Sending audio prompt to:", apiUrl)

    const response = await axios.post(apiUrl, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    logger.log("Audio prompt response:", response.data)
    return response.data
  } catch (error) {
    logger.error("Error sending audio prompt:", error)
    handleApiError(error)
    throw error
  }
}

// 6. Conversation API - Clear conversation history
export async function clearConversationHistory(userId: string) {
  try {
    const apiUrl = `${API_BASE_URL}/conversation/clear`
    logger.log("Clearing conversation history at:", apiUrl)

    const response = await axios.get(apiUrl, {
      params: { user_id: userId },
    })

    logger.log("Conversation history cleared:", response.data.message)
    return response.data
  } catch (error) {
    logger.error("Error clearing conversation history:", error)
    handleApiError(error)
    throw error
  }
}

// 7. TTS API - Generate speech from text
export async function generateSpeech(userId: string, text: string): Promise<ReadableStream<Uint8Array> | Blob> {
  try {
    const apiUrl = `${API_BASE_URL}/tts/generate`
    logger.log("Generating speech at:", apiUrl)

    // Check if ReadableStream and required features are supported
    if (typeof ReadableStream !== "undefined" && "body" in Response.prototype && window.MediaSource) {
      logger.log("Using streaming approach for speech generation")
      // Use streaming approach with proper error handling
      try {
        const response = await fetch(
          `${apiUrl}?text=${encodeURIComponent(text)}&user_id=${encodeURIComponent(userId)}`,
          {
            method: "GET",
          },
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Check if we have a body to stream
        if (!response.body) {
          throw new Error("Response body is null, cannot stream")
        }

        logger.log("Speech stream started")
        return response.body
      } catch (fetchError) {
        logger.error("Fetch streaming error:", fetchError)
        // Fall back to non-streaming approach
        logger.log("Falling back to non-streaming approach")
        throw fetchError
      }
    } else {
      // Fallback to non-streaming approach for older browsers
      logger.log("Using non-streaming approach for speech generation (browser compatibility)")
      const response = await axios.get(apiUrl, {
        params: {
          text,
          user_id: userId,
        },
        responseType: "arraybuffer",
      })

      logger.log("Speech data received (non-streaming)")
      // Convert the arraybuffer to a blob that can be used with audio elements
      return new Blob([response.data], { type: "audio/mpeg" })
    }
  } catch (error) {
    logger.error("Error generating speech:", error)
    handleApiError(error)

    // If streaming fails, fall back to non-streaming approach
    try {
      logger.log("Attempting fallback to non-streaming approach after error")
      const response = await axios.get(`${API_BASE_URL}/tts/generate`, {
        params: {
          text,
          user_id: userId,
        },
        responseType: "arraybuffer",
      })

      logger.log("Fallback successful, speech data received")
      return new Blob([response.data], { type: "audio/mpeg" })
    } catch (fallbackError) {
      logger.error("Fallback also failed:", fallbackError)
      throw error // Throw the original error
    }
  }
}

