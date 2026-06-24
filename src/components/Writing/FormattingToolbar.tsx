
"use client";

import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Type,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Palette,
  Highlighter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormattingToolbarProps {
  saveStatus?: string;
}

export function FormattingToolbar({ saveStatus }: FormattingToolbarProps) {
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center border-b border-border/30 bg-background/95 backdrop-blur py-2 px-8">
      <div className="flex items-center gap-1 p-1.5 rounded-full border border-border/60 bg-white shadow-sm overflow-x-auto max-w-full">
        
        <div className="flex items-center px-3 border-r border-border/40 gap-1">
          <ToolbarButton icon={RotateCcw} onClick={() => applyFormat('undo')} title="Undo" />
          <ToolbarButton icon={RotateCw} onClick={() => applyFormat('redo')} title="Redo" />
        </div>

        <div className="flex items-center px-3 border-r border-border/40 gap-2">
          <Type className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-body italic text-primary/80">Spectral</span>
          <ChevronDown className="size-3 text-muted-foreground/50" />
        </div>

        <div className="flex items-center px-3 border-r border-border/40 gap-2">
          <span className="text-[11px] font-code font-bold text-primary/80">14</span>
          <ChevronDown className="size-3 text-muted-foreground/50" />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={Bold} onClick={() => applyFormat('bold')} />
          <ToolbarButton icon={Italic} onClick={() => applyFormat('italic')} />
          <ToolbarButton icon={Underline} onClick={() => applyFormat('underline')} />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={Palette} onClick={() => {}} title="Text Color" />
          <ToolbarButton icon={Highlighter} onClick={() => {}} title="Highlight" />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={AlignLeft} onClick={() => applyFormat('justifyLeft')} active />
          <ToolbarButton icon={AlignCenter} onClick={() => applyFormat('justifyCenter')} />
          <ToolbarButton icon={AlignRight} onClick={() => applyFormat('justifyRight')} />
          <ToolbarButton icon={AlignJustify} onClick={() => applyFormat('justifyFull')} />
        </div>

        <div className="flex items-center gap-0.5 px-2">
          <ToolbarButton icon={List} onClick={() => applyFormat('insertUnorderedList')} />
          <ToolbarButton icon={ListOrdered} onClick={() => applyFormat('insertOrderedList')} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, onClick, active, title }: { icon: any, onClick?: () => void, active?: boolean, title?: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        "size-8 rounded-full flex items-center justify-center transition-all hover:bg-muted",
        active ? "bg-accent/10 text-accent" : "text-muted-foreground"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
