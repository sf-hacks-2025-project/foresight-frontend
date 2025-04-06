"use client";

import { RefObject, useEffect } from "react";

interface VideoDisplayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  hasPermission: boolean;
  onMetadataLoaded: () => void;
}

export function VideoDisplay({ videoRef, hasPermission, onMetadataLoaded }: VideoDisplayProps) {
  return (
    <div className="relative w-full aspect-video bg-gray-100 rounded-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-lg"
        onLoadedMetadata={(e) => {
          const video = e.target as HTMLVideoElement;
          video.setAttribute('webkit-playsinline', 'true');
          onMetadataLoaded();
        }}
      />
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded">
        {videoRef.current?.srcObject ? "Stream active" : "No stream"}
      </div>
    </div>
  );
} 