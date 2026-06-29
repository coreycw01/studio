"use client";

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface GenerativeAiIconProps {
  className?: string;
}

export function GenerativeAiIcon({ className }: GenerativeAiIconProps) {
  return (
    <span className={cn("relative inline-flex aspect-square shrink-0 items-center justify-center align-middle", className)}>
      <Image
        src="/noesis-generative-ai-light.png"
        alt="Generative AI"
        fill
        sizes="64px"
        className="object-contain object-center dark:hidden"
      />
      <Image
        src="/noesis-generative-ai-dark.png"
        alt="Generative AI"
        fill
        sizes="64px"
        className="hidden object-contain object-center dark:block"
      />
    </span>
  );
}
