"use client";

import Image from "next/image";
import { useState } from "react";
import { propertyImagePath } from "@/lib/property-images";

interface HallImageProps {
  propertyName: string;
  alt: string;
  className?: string;
  sizes?: string;
}

/** Loads the optional local photo for a property; returns nothing when it has not been added yet. */
export function HallImage({ propertyName, alt, className, sizes }: HallImageProps) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;

  return (
    <Image
      src={propertyImagePath(propertyName)}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={className ?? "object-cover"}
      onError={() => setMissing(true)}
    />
  );
}
