
"use client";

import React from 'react';
import { 
  MonitorPlay, 
  FileBox, 
  Layers,
  Settings2,
  Check,
  Palette,
  LayoutGrid
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
import type { PageViewMode, PageSize, PaperColor, PaperPattern } from './Atelier';
import { cn } from '@/lib/utils';

interface PageViewControlsProps {
  viewMode: PageViewMode;
  onViewModeChange: (mode: PageViewMode) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  paperColor: PaperColor;
  onPaperColorChange: (color: PaperColor) => void;
  paperPattern: PaperPattern;
  onPaperPatternChange: (pattern: PaperPattern) => void;
}

export function PageViewControls({ 
  viewMode, 
  onViewModeChange, 
  pageSize, 
  onPageSizeChange,
  paperColor,
  onPaperColorChange,
  paperPattern,
  onPaperPatternChange
}: PageViewControlsProps) {
  const modes: { id: PageViewMode; label: string; icon: any }[] = [
    { id: 'vertical-continuous', label: 'Vertical Continuous', icon: MonitorPlay },
    { id: 'vertical-single', label: 'Vertical Single Page', icon: FileBox },
    { id: 'horizontal-single', label: 'Horizontal Spread', icon: Layers },
  ];

  const colors: { id: PaperColor; label: string; bg: string }[] = [
    { id: 'blank', label: 'Blank', bg: 'bg-white' },
    { id: 'warm', label: 'Warm', bg: 'bg-amber-50/50' },
    { id: 'sepia', label: 'Sepia', bg: 'bg-[#f4ecd8]' },
    { id: 'dark', label: 'Dark', bg: 'bg-slate-900' },
  ];

  const patterns: { id: PaperPattern; label: string; icon: any }[] = [
    { id: 'none', label: 'Plain', icon: Palette },
    { id: 'notebook', label: 'Lined', icon: LayoutGrid },
    { id: 'grid', label: 'Grid', icon: LayoutGrid },
  ];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 rounded-full font-bold border-border/60 bg-card shadow-sm px-4">
            <Settings2 className="size-4 text-accent" />
            View / Paper
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
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">Paper Color</DropdownMenuLabel>
          <div className="grid grid-cols-4 gap-2 p-2">
            {colors.map((color) => (
              <button
                key={color.id}
                onClick={() => onPaperColorChange(color.id)}
                title={color.label}
                className={cn(
                  "size-8 rounded-full border transition-all hover:scale-110 flex items-center justify-center",
                  color.bg,
                  paperColor === color.id ? "border-accent ring-2 ring-accent/20" : "border-border/40"
                )}
              >
                {paperColor === color.id && <Check className={cn("size-3", color.id === 'dark' ? "text-white" : "text-accent")} />}
              </button>
            ))}
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">Pattern Overlay</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 p-2">
            {patterns.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => onPaperPatternChange(pattern.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded border transition-all hover:border-accent/40",
                  paperPattern === pattern.id ? "border-accent bg-accent/5" : "border-border/40"
                )}
              >
                <pattern.icon className="size-3.5 opacity-40" />
                <span className="text-[10px] italic leading-none text-center">{pattern.label}</span>
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
