
"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PageNavigation({ currentPage, totalPages, onPageChange }: PageNavigationProps) {
  return (
    <div className="h-12 bg-white/80 backdrop-blur border-t border-border/30 flex items-center justify-center gap-8 z-40">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="size-8 rounded-full"
        >
          <ChevronLeft className="size-4" />
        </Button>
        
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-muted/20 border border-border/20">
          <Hash className="size-3 text-muted-foreground/40" />
          <span className="font-code text-[10px] font-bold text-primary">
            {currentPage} <span className="opacity-20 mx-1">/</span> {totalPages}
          </span>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="size-8 rounded-full"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      
      <div className="absolute right-8 flex items-center gap-3">
        <span className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/30 font-bold">SCHOLARLY MANUSCRIPT</span>
        <div className="size-1.5 rounded-full bg-accent/20" />
      </div>
    </div>
  );
}
