"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { clearVisionHistory, clearConversationHistory } from "../../utils/api"
import { useAppStore } from "../../store/useAppStore"
import { useChatStore } from "../../store/useChatStore"

interface ControlPanelProps {
  isOpen: boolean
  onClose: () => void
  onStopVideo: () => void
}

export function ControlPanel({ isOpen, onClose, onStopVideo }: ControlPanelProps) {
  const { userId } = useAppStore()
  const { clearMessages } = useChatStore()
  const [isClearing, setIsClearing] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const handleClearVisionHistory = async () => {
    if (!userId) return

    try {
      setIsClearing("vision")
      await clearVisionHistory(userId)
      setFeedbackMessage("Visual memory reset successfully")
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch {
      setFeedbackMessage("Failed to reset visual memory")
      setTimeout(() => setFeedbackMessage(null), 3000)
    } finally {
      setIsClearing(null)
    }
  }

  const handleClearConversation = async () => {
    if (!userId) return

    try {
      setIsClearing("conversation")
      await clearConversationHistory(userId)
      // Also clear local chat messages
      clearMessages()
      setFeedbackMessage("Conversation memory reset successfully")
      setTimeout(() => setFeedbackMessage(null), 3000)
    } catch {
      setFeedbackMessage("Failed to reset conversation memory")
      setTimeout(() => setFeedbackMessage(null), 3000)
    } finally {
      setIsClearing(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-[#1D1D1D] border border-slate-700/50 rounded-2xl p-5 w-[90%] max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Controls</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
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

            <div className="space-y-4">
              <button
                onClick={onStopVideo}
                className="w-full bg-gradient-to-r from-[#6A81FB] to-[#6A81FB]/80 hover:from-[#6A81FB]/90 hover:to-[#6A81FB]/70 text-white py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center">
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
                    className="mr-3"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M8 8v8"></path>
                    <path d="M16 8v8"></path>
                  </svg>
                  <span>Blur Camera (Keep Audio)</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              <button
                onClick={handleClearVisionHistory}
                disabled={isClearing !== null}
                className="w-full bg-gradient-to-r from-[#FF7270] to-[#E15B73] hover:from-[#FF7270]/90 hover:to-[#E15B73]/90 text-white py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center">
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
                    className="mr-3"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span>Reset Visual Memory</span>
                </div>
                {isClearing === "vision" ? (
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
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                )}
              </button>

              <button
                onClick={handleClearConversation}
                disabled={isClearing !== null}
                className="w-full bg-gradient-to-r from-[#6A81FB] to-[#E15B73] hover:from-[#6A81FB]/90 hover:to-[#E15B73]/90 text-white py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center">
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
                    className="mr-3"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <line x1="9" y1="10" x2="15" y2="10"></line>
                    <line x1="12" y1="7" x2="12" y2="13"></line>
                  </svg>
                  <span>Reset Conversation Memory</span>
                </div>
                {isClearing === "conversation" ? (
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
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                )}
              </button>
            </div>

            {feedbackMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white"
              >
                {feedbackMessage}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
