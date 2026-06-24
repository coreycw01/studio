
"use client";

import React, { useRef, useEffect } from 'react';
import type { PageSize, PaperStyle } from './Atelier';
import { cn } from '@/lib/utils';

interface DocsPageProps {
  pageNumber: number;
  pageSize: PageSize;
  paperStyle: PaperStyle;
  content: string;
  onContentChange: (content: string) => void;
  isEditable: boolean;
  showBoundary?: boolean;
}

export function DocsPage({ pageNumber, pageSize, paperStyle, content, onContentChange, isEditable, showBoundary }: DocsPageProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current !== document.activeElement) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const sizeClasses = {
    letter: "w-[850px] min-h-[1100px]",
    a4: "w-[827px] min-h-[1169px]"
  };

  const paperClasses = {
    blank: "bg-white text-primary",
    warm: "bg-amber-50/40 text-primary",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
    dark: "bg-slate-900 text-slate-200 border-slate-800",
    notebook: "bg-white text-primary",
    grid: "bg-white text-primary"
  };

  return (
    <div className={cn(
      "relative shadow-2xl transition-all duration-300 origin-center flex flex-col group",
      sizeClasses[pageSize],
      paperClasses[paperStyle],
      showBoundary && "border border-border/20",
      paperStyle === 'notebook' && "before:absolute before:left-20 before:top-0 before:bottom-0 before:w-px before:bg-red-200/60",
      paperStyle === 'grid' && "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"
    )}
    style={paperStyle === 'notebook' ? {
      backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
      backgroundSize: '100% 2.4em'
    } : {}}
    >
      {/* Page Header Area */}
      <div className="absolute top-8 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={cn(
          "font-code text-[9px] uppercase tracking-widest font-bold",
          paperStyle === 'dark' ? "text-slate-500" : "text-muted-foreground/40"
        )}>
          PAGE {pageNumber}
        </span>
      </div>

      <div 
        ref={editorRef}
        contentEditable={isEditable}
        onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
        className={cn(
          "flex-1 p-24 focus:outline-none font-body text-[18px] italic leading-[2.4]",
          !isEditable && "pointer-events-none opacity-20",
          paperStyle === 'notebook' && "pl-28"
        )}
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
      />

      {/* Page Footer Area */}
      <div className="h-16 flex items-center justify-center">
        <div className={cn(
          "w-12 h-px",
          paperStyle === 'dark' ? "bg-slate-800" : "bg-muted/10"
        )} />
      </div>
    </div>
  );
}
