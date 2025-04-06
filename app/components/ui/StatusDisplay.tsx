"use client";

interface StatusDisplayProps {
  message: string;
  error: string | null;
  isRecording?: boolean;
  isPressing?: boolean;
}

export function StatusDisplay({ message, error, isRecording, isPressing }: StatusDisplayProps) {
  return (
    <>
      {/* Status information */}
      <div className={`text-sm p-2 rounded ${isRecording ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
        Status: {message}
        {isRecording && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
      </div>
      
      {/* Error message if any */}
      {error && (
        <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50 mt-2">
          {error}
        </div>
      )}
    </>
  );
}