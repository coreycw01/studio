
"use client";

import React from 'react';
import { History, ArrowRight, BookOpen, ShieldCheck, PenTool, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TimelineEvent } from '@/lib/types';

interface EvolutionTimelineProps {
  events: TimelineEvent[];
}

const entityIcons: Record<string, any> = {
  vault: ShieldCheck,
  media: BookOpen,
  draft: PenTool,
  concept: Plus
};

export function EvolutionTimeline({ events }: EvolutionTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
      <header className="mb-12 text-center">
        <div className="size-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <History className="size-8" />
        </div>
        <h1 className="text-4xl font-headline font-bold mb-2">Cognitive Evolution</h1>
        <p className="text-muted-foreground italic font-body text-lg">A chronicle of belief shifts, refined concepts, and intellectual growth.</p>
      </header>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {sortedEvents.map((event, idx) => {
          const Icon = entityIcons[event.entityType] || History;
          
          return (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              {/* Dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all group-hover:border-accent group-hover:scale-110">
                <Icon className="size-4 text-muted-foreground group-hover:text-accent" />
              </div>

              {/* Card */}
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 shadow-sm hover:shadow-md transition-all border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <time className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-tighter px-1.5 py-0">
                    {event.eventType}
                  </Badge>
                </div>
                
                <h3 className="font-headline font-bold text-lg mb-1 group-hover:text-accent transition-colors">
                  {event.entityTitle}
                </h3>
                
                <p className="text-sm font-body italic text-muted-foreground/80 leading-relaxed mb-4">
                  "{event.reason}"
                </p>

                <div className="flex items-center gap-2 pt-3 border-t border-border/20">
                   <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60">Reference:</span>
                   <div className="flex items-center gap-1.5 text-[10px] font-medium text-accent hover:underline cursor-pointer">
                      <span>View Refinement</span>
                      <ArrowRight className="size-3" />
                   </div>
                </div>
              </Card>
            </div>
          );
        })}

        {sortedEvents.length === 0 && (
          <div className="py-20 text-center opacity-40">
            <History className="size-20 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-headline italic mb-2">Static Mindset</h2>
            <p className="max-w-xs mx-auto font-body">Changes to your beliefs, media consumption, and concepts will populate this timeline of growth.</p>
          </div>
        )}
      </div>
    </div>
  );
}
