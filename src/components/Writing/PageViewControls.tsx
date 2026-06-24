
"use client";

import React from 'react';
import { 
  Layout, 
  ChevronDown, 
  MonitorPlay, 
  FileBox, 
  Columns, 
  Layers 
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
import type { PageViewMode, PageSize } from './Atelier';
import { cn } from '@/lib/utils';

interface PageViewControlsProps {
  viewMode: PageViewMode;
  onViewModeChange: (mode: PageViewMode) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
}

export function PageViewControls({ viewMode, onViewModeChange, pageSize, onPageSizeChange }: PageViewControlsProps) {
  const modes: { id: PageViewMode; label: string; icon: any }[] = [
    { id: 'vertical-continuous', label: 'Vertical Continuous', icon: MonitorPlay },
    { id: 'vertical-single', label: 'Vertical Single Page', icon: FileBox },
    { id: 'horizontal-continuous', label: 'Horizontal Continuous', icon: Columns },
    { id: 'horizontal-single', label: 'Horizontal Single Page', icon: Layers },
  ];

  const currentMode = modes.find(m => m.id === viewMode);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-full font-bold border-border/60 bg-white shadow-sm flex items-center gap-2">
            {currentMode && <currentMode.icon className="size-3.5 text-accent" />}
            <span className="font-code text-[9px] uppercase tracking-widest">{currentMode?.label}</span>
            <ChevronDown className="size-3 opacity-40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 font-body">
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">View Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {modes.map((mode) => (
            <DropdownMenuItem 
              key={mode.id} 
              onClick={() => onViewModeChange(mode.id)}
              className={cn("flex items-center gap-3 py-2 cursor-pointer", viewMode === mode.id && "bg-accent/5 text-accent")}
            >
              <mode.icon className="size-4" />
              <span className="text-xs italic">{mode.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest opacity-40">Page Size</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onPageSizeChange('letter')} className={cn("text-xs italic cursor-pointer", pageSize === 'letter' && "text-accent")}>
            US Letter (8.5" x 11")
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPageSizeChange('a4')} className={cn("text-xs italic cursor-pointer", pageSize === 'a4' && "text-accent")}>
            A4 Standard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
