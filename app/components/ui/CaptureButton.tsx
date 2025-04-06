"use client";

interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CaptureButton({ onClick, disabled = false }: CaptureButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span className="mr-2">Capture Image</span>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
      </svg>
    </button>
  );
} 