import axios from "axios"

// Base URL for the API
const API_BASE_URL = "https://sfhacks-backend.onrender.com/api"

// Mock user ID - in a real app, you would get this from the server
let userId = ""

// Simple logger object
const logger = {
  log: (...args: unknown[]) => {
    console.log("[images.ts]", ...args)
  },
  error: (...args: unknown[]) => {
    console.error("[images.ts]", ...args)
  },
}

// Define a type for API errors
type ApiError = Error & { 
  response?: { 
    data: unknown; 
    status: number 
  }; 
  request?: unknown 
}

// Helper function to handle API errors
const handleApiError = (error: ApiError) => {
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
async function createUser(): Promise<string> {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/create`)
    userId = response.data.user_id
    logger.log("User created with ID:", userId)
    return userId
  } catch (error) {
    handleApiError(error as ApiError)
    throw error
  }
}

// 2. Vision API - Upload an image and get visual context
async function uploadImage(userId: string, imageBlob: Blob): Promise<unknown> {
  try {
    logger.log("Starting image upload to:", `${API_BASE_URL}/vision/upload`)

    // Convert Blob to base64 string
    const arrayBuffer = await imageBlob.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString("base64")

    // Create JSON payload
    const payload = {
      user_id: userId,
      mime_type: "image/png",
      filename: "webcam_capture.png",
      image_base64: base64Data,
    }

    // Construct the URL correctly
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
    handleApiError(error as ApiError)
    throw error
  }
}

// 3. Vision API - Clear visual history
async function clearVisionHistory(): Promise<unknown> {
  try {
    const payload = {
      user_id: userId,
    }

    const apiUrl = `${API_BASE_URL}/vision/clear`
    logger.log("Clearing vision history at:", apiUrl)

    const response = await axios.get(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      params: payload,
    })

    logger.log("Vision history cleared:", response.data.message)
    return response.data
  } catch (error) {
    logger.error("Error clearing vision history:", error)
    handleApiError(error as ApiError)
    throw error
  }
}

// 4. Conversation API - Send text prompt
async function sendTextPrompt(textQuery: string): Promise<unknown> {
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
    handleApiError(error as ApiError)
    throw error
  }
}

// 5. Conversation API - Send audio prompt
async function sendAudioPrompt(audioBuffer: Buffer): Promise<unknown> {
  try {
    // Convert buffer to base64 for JSON transmission
    const base64Audio = audioBuffer.toString("base64")

    const payload = {
      user_id: userId,
      audio_data: base64Audio,
    }

    const apiUrl = `${API_BASE_URL}/conversation/audio`
    logger.log("Sending audio prompt to:", apiUrl)

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    logger.log("Audio prompt response:", response.data)
    return response.data
  } catch (error) {
    logger.error("Error sending audio prompt:", error)
    handleApiError(error as ApiError)
    throw error
  }
}

// 6. Conversation API - Clear conversation history
async function clearConversationHistory(): Promise<unknown> {
  try {
    const payload = {
      user_id: userId,
    }

    const apiUrl = `${API_BASE_URL}/conversation/clear`
    logger.log("Clearing conversation history at:", apiUrl)

    const response = await axios.get(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      params: payload,
    })

    logger.log("Conversation history cleared:", response.data.message)
    return response.data
  } catch (error) {
    logger.error("Error clearing conversation history:", error)
    handleApiError(error as ApiError)
    throw error
  }
}

// 7. TTS API - Generate speech from text
async function generateSpeech(text: string): Promise<Buffer> {
  try {
    const apiUrl = `${API_BASE_URL}/tts/generate`
    logger.log("Generating speech at:", apiUrl)

    // Request the speech audio data as a stream
    const response = await axios.get(apiUrl, {
      params: {
        text,
        user_id: userId,
      },
      responseType: "arraybuffer",
    })

    logger.log("Speech data received")
    return Buffer.from(response.data)
  } catch (error) {
    logger.error("Error generating speech:", error)
    handleApiError(error as ApiError)
    throw error
  }
}

// Export functions for use in other files
export {
  createUser,
  uploadImage,
  clearVisionHistory,
  sendTextPrompt,
  sendAudioPrompt,
  clearConversationHistory,
  generateSpeech,
}
