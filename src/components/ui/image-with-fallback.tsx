"use client";
import Image from "next/image";
import { useState } from "react";

type ImageWithFallbackProps = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  fallbackElement?: React.ReactNode;
  loading?: "lazy" | "eager";
  priority?: boolean;
};

export function ImageWithFallback({
  src,
  alt,
  fill,
  width,
  height,
  className,
  fallbackSrc,
  fallbackElement,
  loading = "lazy",
  priority,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error && fallbackElement) {
    return <>{fallbackElement}</>;
  }

  return (
    <Image
      src={error && fallbackSrc ? fallbackSrc : src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      loading={loading}
      priority={priority}
      onError={() => {
        if (fallbackSrc) {
          setError(true);
        } else {
          setError(true);
        }
      }}
    />
  );
}
