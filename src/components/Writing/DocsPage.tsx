
"use client";

import React, { useRef, useEffect } from 'react';
import type { PageSize } from './Atelier';
import { cn } from '@/lib/utils';

interface DocsPageProps {
  pageNumber: number;
  pageSize: PageSize;
  content: string;
  onContentChange: (content: string) => void;
  isEditable: boolean;
  showBoundary?: boolean;
}

export function DocsPage({ pageNumber, pageSize, content, onContentChange, isEditable, showBoundary }: DocsPageProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content only if not currently focused to avoid cursor jumps
  useEffect(() => {
    if (editorRef.current && editorRef.current !== document.activeElement) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const sizeClasses = {
    letter: "w-[850px] min-h-[1100px]",
    a4: "w-[827px] min-h-[1169px]"
  };

  return (
    <div className={cn(
      "relative bg-white shadow-2xl transition-all duration-300 origin-center flex flex-col group",
      sizeClasses[pageSize],
      showBoundary && "border border-border/20"
    )}>
      {/* Page Header Area */}
      <div className="absolute top-8 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/40 font-bold">
          PAGE {pageNumber}
        </span>
      </div>

      <div 
        ref={editorRef}
        contentEditable={isEditable}
        onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
        className={cn(
          "flex-1 p-24 focus:outline-none font-body text-[18px] italic leading-[2.4] text-primary/90",
          !isEditable && "pointer-events-none opacity-20"
        )}
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
      />

      {/* Page Footer Area */}
      <div className="h-16 flex items-center justify-center">
        <div className="w-12 h-px bg-muted/10" />
      </div>
    </div>
  );
}
