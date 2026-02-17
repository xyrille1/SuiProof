"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { ImageOff } from "lucide-react";

interface IPFSImageProps extends Omit<ImageProps, "onError"> {
  fallback?: React.ReactNode;
}

/**
 * IPFS Image Component with Error Handling
 * Displays images from Pinata/IPFS with graceful fallback
 */
export function IPFSImage({ fallback, alt, ...props }: IPFSImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      fallback || (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs">Failed to load image</p>
        </div>
      )
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <Image
        {...props}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        unoptimized={
          typeof props.src === "string" && props.src.includes("pinata.cloud")
        }
      />
    </>
  );
}
