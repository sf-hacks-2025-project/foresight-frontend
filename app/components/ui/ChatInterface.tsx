"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { sendTextPrompt, generateSpeech } from "../../utils/api"
import { useAppStore } from "../../store/useAppStore"
import { useChatStore, type ChatMessage } from "../../store/useChatStore"

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { userId, setAudioURL, setStatusMessage, setError } = useAppStore()
  const { messages, addMessage, clearMessages } = useChatStore()

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
  }, [isOpen])

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim() || !userId || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setInputValue("")
    setIsLoading(true)
    setStatusMessage("Processing your message...")

    try {
      // Send the message to the API
      const response = await sendTextPrompt(userId, inputValue.trim())
      console.log("[ChatInterface] Text prompt response:", response)

      // Extract text from response
      const responseText =
        typeof response === "string"
          ? response
          : response && typeof response === "object" && "text" in response
            ? (response as { text: string }).text
            : response && typeof response === "object" && "message" in response
              ? (response as { message: string }).message
              : "I didn't understand that. Could you try again?"

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date(),
      }

      addMessage(aiMessage)
      setStatusMessage("Message processed successfully")

      // Generate speech from the AI response
      try {
        setStatusMessage("Generating speech from response...")
        const speechResult = await generateSpeech(userId, responseText)

        // Convert to Blob for audio playback
        let speechBlob: Blob

        if (speechResult instanceof Blob) {
          speechBlob = speechResult
        } else {
          // Handle ReadableStream
          const reader = speechResult.getReader()
          const chunks: Uint8Array[] = []

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }

          if (chunks.length > 0) {
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            const allChunks = new Uint8Array(totalLength)
            let position = 0

            for (const chunk of chunks) {
              allChunks.set(chunk, position)
              position += chunk.length
            }

            speechBlob = new Blob([allChunks], { type: "audio/mpeg" })
          } else {
            throw new Error("No audio data received")
          }
        }

        // Create URL for audio playback
        const speechUrl = URL.createObjectURL(speechBlob)

        // Update the AI message to include the audio URL
        const updatedAiMessage = {
          ...aiMessage,
          audioUrl: speechUrl,
        }

        // Replace the previous AI message with the updated one that includes the audio URL
        const updatedMessages = messages.map((msg) => (msg.id === aiMessage.id ? updatedAiMessage : msg))

        // Update the messages in the store
        // This is a workaround since we can't directly modify the message after adding it
        clearMessages()
        updatedMessages.forEach((msg) => addMessage(msg))

        // Reset audio URL first to ensure clean playback
        setAudioURL("")

        // Set the new audio URL after a small delay
        setTimeout(() => {
          setAudioURL(speechUrl)
          setStatusMessage("Audio ready to play")
        }, 100)
      } catch (speechError: unknown) {
        console.error("Speech generation error:", speechError)
        const speechErrorMsg = speechError instanceof Error ? speechError.message : "Unknown error"
        setError(`Speech generation failed: ${speechErrorMsg}`)
      }
    } catch (error: unknown) {
      console.error("Error sending message:", error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      setError(`Failed to send message: ${errorMsg}`)

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, there was an error processing your message. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      }

      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
      setStatusMessage("Ready")
    }
  }

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-gradient-to-r from-[#6A81FB] to-[#E15B73] flex items-center justify-center shadow-lg"
        aria-label="Toggle chat"
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
          className="text-white"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <line x1="9" y1="10" x2="15" y2="10"></line>
          <line x1="12" y1="7" x2="12" y2="13"></line>
        </svg>

        {/* Message notification badge */}
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF7270] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {messages.filter((m) => m.sender === "ai").length}
          </span>
        )}
      </button>

      {/* Chat interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleChat}></div>

            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-[#1D1D1D] border border-slate-700/50 rounded-2xl w-full max-w-md h-[70vh] max-h-[600px] z-50 flex flex-col overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat header */}
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-lg font-bold bg-gradient-to-r from-[#FF7270] to-[#E15B73] bg-clip-text text-transparent">
                  Foresight Chat
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearMessages}
                    className="text-slate-400 hover:text-white transition-colors p-2"
                    title="Clear chat history"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                  <button onClick={toggleChat} className="text-slate-400 hover:text-white transition-colors">
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
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-4 text-slate-600"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p className="text-sm">No messages yet. Start a conversation with Foresight.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.sender === "user"
                            ? "bg-gradient-to-r from-[#6A81FB]/20 to-[#6A81FB]/10 text-white border border-[#6A81FB]/20"
                            : "bg-gradient-to-r from-[#E15B73]/20 to-[#FF7270]/10 text-white border border-[#E15B73]/20"
                        }`}
                      >
                        {message.isAudio && message.sender === "user" ? (
                          <div className="flex items-center text-sm">
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
                            [Audio Message]
                          </div>
                        ) : (
                          <p className="text-sm">{message.text}</p>
                        )}

                        {message.audioUrl && message.sender === "ai" && (
                          <div className="flex items-center mt-2 text-xs text-[#E15B73]">
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
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                              <line x1="12" x2="12" y1="19" y2="22"></line>
                            </svg>
                            [Audio Response]
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mt-1 text-right">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
                <div className="flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-l-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#6A81FB]"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className={`bg-gradient-to-r from-[#6A81FB] to-[#E15B73] text-white rounded-r-xl px-4 py-3 ${
                      isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
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
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

