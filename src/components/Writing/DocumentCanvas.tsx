
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { DocsPage } from './DocsPage';
import { PageNavigation } from './PageNavigation';
import type { PageViewMode, PageSize, PaperColor, PaperPattern } from './Atelier';
import { cn } from '@/lib/utils';

interface DocumentCanvasProps {
  content: string;
  onContentChange: (content: string) => void;
  viewMode: PageViewMode;
  pageSize: PageSize;
  paperColor: PaperColor;
  paperPattern: PaperPattern;
  title: string;
}

export function DocumentCanvas({ content, onContentChange, viewMode, pageSize, paperColor, paperPattern, title }: DocumentCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    const charCount = content.length;
    const estimatedPages = Math.max(1, Math.ceil(charCount / 3000));
    setTotalPages(estimatedPages);
  }, [content]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode === 'vertical-continuous' || viewMode === 'vertical-single') {
      const scrollPos = e.currentTarget.scrollTop;
      const pageHeight = pageSize === 'letter' ? 1056 : 1123;
      const page = Math.floor(scrollPos / (pageHeight + 40)) + 1;
      setCurrentPage(Math.min(page, totalPages));
    }
  };

  const containerClasses = cn(
    "w-full h-full relative transition-all duration-500 bg-muted/10",
    viewMode === 'horizontal-single' ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden"
  );

  const canvasClasses = cn(
    "flex p-12 transition-all duration-500",
    viewMode === 'vertical-continuous' && "flex-col items-center gap-10",
    viewMode === 'vertical-single' && "flex-col items-center justify-center min-h-full",
    viewMode === 'horizontal-single' && "flex-row items-center justify-center min-w-full h-full"
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className={containerClasses} onScroll={handleScroll} ref={canvasRef}>
        <div className={canvasClasses}>
          {viewMode === 'vertical-continuous' ? (
            Array.from({ length: totalPages }).map((_, i) => (
              <DocsPage 
                key={i}
                pageNumber={i + 1}
                pageSize={pageSize}
                paperColor={paperColor}
                paperPattern={paperPattern}
                isEditable={i === 0}
                content={i === 0 ? content : ""}
                onContentChange={onContentChange}
                showBoundary
              />
            ))
          ) : (
            <DocsPage 
              pageNumber={currentPage}
              pageSize={pageSize}
              paperColor={paperColor}
              paperPattern={paperPattern}
              isEditable={true}
              content={content}
              onContentChange={onContentChange}
              showBoundary
            />
          )}
        </div>
      </div>
      
      <PageNavigation 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={(p) => {
          setCurrentPage(p);
        }}
      />
    </div>
  );
}
