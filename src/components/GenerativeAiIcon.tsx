"use client";

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface GenerativeAiIconProps {
  className?: string;
}

export function GenerativeAiIcon({ className }: GenerativeAiIconProps) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-black", className)}>
      <Image
        src="/noesis-generative-ai.png"
        alt="Generative AI"
        fill
        sizes="32px"
        className="object-cover"
      />
    </span>
  );
}
