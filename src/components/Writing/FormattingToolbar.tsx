
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
    document.execCommand('styleWithCSS', false, 'true');
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
          <select
            defaultValue="P"
            onChange={(event) => applyFormat('formatBlock', event.target.value)}
            className="bg-transparent text-[11px] font-body italic text-primary/80 outline-none"
            title="Paragraph style"
          >
            <option value="P">Paragraph</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
            <option value="BLOCKQUOTE">Quote</option>
          </select>
        </div>

        <div className="flex items-center px-3 border-r border-border/40 gap-2">
          <select
            defaultValue="3"
            onChange={(event) => applyFormat('fontSize', event.target.value)}
            className="bg-transparent text-[11px] font-code font-bold text-primary/80 outline-none"
            title="Text size"
          >
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="4">Large</option>
            <option value="5">Title</option>
          </select>
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={Bold} onClick={() => applyFormat('bold')} />
          <ToolbarButton icon={Italic} onClick={() => applyFormat('italic')} />
          <ToolbarButton icon={Underline} onClick={() => applyFormat('underline')} />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={Palette} onClick={() => applyFormat('foreColor', '#6d28d9')} title="Accent text color" />
          <ToolbarButton icon={Highlighter} onClick={() => applyFormat('backColor', '#fef3c7')} title="Highlight" />
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
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick?.();
      }}
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
