"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GenerativeAiIcon } from '@/components/GenerativeAiIcon';
import { cn } from '@/lib/utils';

export interface PhilosophicalAction {
  label: string;
  description?: string;
  tone?: 'default' | 'support' | 'challenge' | 'ai';
  disabled?: boolean;
  icon?: React.ReactNode;
  hideArrow?: boolean;
  onClick: () => void;
}

interface NextPhilosophicalActionPanelProps {
  title?: string;
  description?: string;
  status?: string;
  actions: PhilosophicalAction[];
  compact?: boolean;
}

export function NextPhilosophicalActionPanel({
  title = 'What does this affect?',
  description = 'Move this object into the next layer of your philosophy only when it matters.',
  status,
  actions,
  compact = false,
}: NextPhilosophicalActionPanelProps) {
  return (
    <Card className={cn('border-accent/20 bg-accent/[0.03] shadow-sm rounded-xl', compact ? 'p-3' : 'p-5')}>
      <div className={cn('flex items-start justify-between gap-4', compact ? 'mb-2.5' : 'mb-4')}>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <GenerativeAiIcon className="size-4" />
            <h3 className="font-code text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{title}</h3>
          </div>
          <p className={cn('italic text-muted-foreground font-body', compact ? 'text-xs leading-4' : 'text-sm leading-5')}>{description}</p>
        </div>
        {status && (
          <Badge variant="outline" className="shrink-0 rounded-full bg-white font-code text-[8px] uppercase tracking-widest">
            {status.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant={action.tone === 'support' || action.tone === 'ai' ? 'default' : 'outline'}
            size="sm"
            disabled={action.disabled}
            onClick={action.onClick}
            title={action.description}
            className={cn(
              'rounded-full font-code text-[9px] font-bold uppercase tracking-widest',
              compact ? 'h-7 px-2.5' : 'h-8',
              action.tone === 'challenge' && 'border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive',
              action.tone === 'ai' && 'bg-accent shadow-sm shadow-accent/20'
            )}
          >
            {action.icon}
            {action.label}
            {!action.hideArrow && <ArrowRight className="ml-1.5 size-3" />}
          </Button>
        ))}
      </div>
    </Card>
  );
}
