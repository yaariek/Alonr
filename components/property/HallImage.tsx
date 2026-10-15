"use client";

import Image from "next/image";
import { useState } from "react";
import { propertyImagePath } from "@/lib/property-images";

interface HallImageProps {
  propertyName: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** Load straight away: for the first, above-the-fold photos. */
  eager?: boolean;
}

/** Loads the optional local photo for a property; returns nothing when it has not been added yet. */
export function HallImage({ propertyName, alt, className, sizes, eager }: HallImageProps) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;

  return (
    <Image
      src={propertyImagePath(propertyName)}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      loading={eager ? "eager" : undefined}
      className={className ?? "object-cover"}
      onError={() => setMissing(true)}
    />
  );
}
