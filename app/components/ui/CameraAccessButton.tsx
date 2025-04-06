"use client"

interface CameraAccessButtonProps {
  onClick: () => void
}

export function CameraAccessButton({ onClick }: CameraAccessButtonProps) {
  return (
    <button onClick={onClick} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
      Grant Camera Access
    </button>
  )
}

