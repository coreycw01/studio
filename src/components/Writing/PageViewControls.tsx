
"use client";

import React from 'react';
import { 
  MonitorPlay, 
  FileBox, 
  Columns, 
  Layers,
  Settings2,
  Check,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PageViewMode, PageSize, PaperStyle } from './Atelier';
import { cn } from '@/lib/utils';

interface PageViewControlsProps {
  viewMode: PageViewMode;
  onViewModeChange: (mode: PageViewMode) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  paperStyle: PaperStyle;
  onPaperStyleChange: (style: PaperStyle) => void;
}

export function PageViewControls({ 
  viewMode, 
  onViewModeChange, 
  pageSize, 
  onPageSizeChange,
  paperStyle,
  onPaperStyleChange
}: PageViewControlsProps) {
  const modes: { id: PageViewMode; label: string; icon: any }[] = [
    { id: 'vertical-continuous', label: 'Vertical Continuous', icon: MonitorPlay },
    { id: 'vertical-single', label: 'Vertical Single Page', icon: FileBox },
    { id: 'horizontal-continuous', label: 'Horizontal Continuous', icon: Columns },
    { id: 'horizontal-single', label: 'Horizontal Single Page', icon: Layers },
  ];

  const paperStyles: { id: PaperStyle; label: string; color: string }[] = [
    { id: 'blank', label: 'Blank Page', color: 'bg-white' },
    { id: 'notebook', label: 'Notebook Lined', color: 'bg-blue-50/30' },
    { id: 'grid', label: 'Drafting Grid', color: 'bg-slate-50' },
    { id: 'warm', label: 'Parchment (Warm)', color: 'bg-amber-50/50' },
    { id: 'sepia', label: 'Aged (Sepia)', color: 'bg-[#f4ecd8]' },
    { id: 'dark', label: 'Dark Archive', color: 'bg-slate-900' },
  ];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 rounded-full font-bold border-border/60 bg-white shadow-sm flex items-center justify-center">
            <Settings2 className="size-4 text-accent" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 font-body">
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">View Mode</DropdownMenuLabel>
          {modes.map((mode) => (
            <DropdownMenuItem 
              key={mode.id} 
              onClick={() => onViewModeChange(mode.id)}
              className={cn("flex items-center gap-3 py-2 cursor-pointer", viewMode === mode.id && "bg-accent/5 text-accent")}
            >
              <mode.icon className="size-4" />
              <span className="text-xs italic">{mode.label}</span>
              {viewMode === mode.id && <Check className="size-3 ml-auto" />}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">Page Size</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onPageSizeChange('letter')} className={cn("text-xs italic cursor-pointer flex items-center justify-between", pageSize === 'letter' && "text-accent")}>
            US Letter (8.5" x 11")
            {pageSize === 'letter' && <Check className="size-3" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPageSizeChange('a4')} className={cn("text-xs italic cursor-pointer flex items-center justify-between", pageSize === 'a4' && "text-accent")}>
            A4 Standard
            {pageSize === 'a4' && <Check className="size-3" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">Paper Style</DropdownMenuLabel>
          <div className="grid grid-cols-2 gap-1 p-2">
            {paperStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => onPaperStyleChange(style.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded border transition-all hover:border-accent/40",
                  paperStyle === style.id ? "border-accent bg-accent/5" : "border-border/40"
                )}
              >
                <div className={cn("size-6 rounded shadow-inner border border-border/20", style.color)} />
                <span className="text-[10px] italic leading-none text-center">{style.label}</span>
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
