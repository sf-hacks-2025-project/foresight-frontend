"use client";

interface ImagePreviewProps {
  imageURL: string;
}

export function ImagePreview({ imageURL }: ImagePreviewProps) {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Captured Image:</h3>
      <img 
        src={imageURL} 
        alt="Captured" 
        className="w-full max-h-80 object-contain rounded-lg border border-gray-300" 
      />
    </div>
  );
} 