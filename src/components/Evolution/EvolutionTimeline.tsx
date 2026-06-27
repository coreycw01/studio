"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TimelineEvent, Media, EventType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EvolutionTimelineProps {
  events: TimelineEvent[];
  media: Media[];
}

const EVENT_TYPES: EventType[] = ['created', 'refined', 'challenged', 'revised', 'expanded', 'abandoned'];

export function EvolutionTimeline({ events, media }: EvolutionTimelineProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | EventType>('all');
  const [pageSize, setPageSize] = useState<5 | 10>(5);
  const [page, setPage] = useState(0);

  const filteredEvents = useMemo(() => {
    return [...events]
      .filter((event) => {
        const typeOk = filter === 'all' || event.eventType === filter;
        const queryOk = !search || 
          event.entityTitle.toLowerCase().includes(search.toLowerCase()) || 
          event.reason.toLowerCase().includes(search.toLowerCase());
        return typeOk && queryOk;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, filter, search]);

  useEffect(() => {
    setPage(0);
  }, [filter, pageSize, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedEvents = filteredEvents.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rangeStart = filteredEvents.length ? safePage * pageSize + 1 : 0;
  const rangeEnd = Math.min(filteredEvents.length, safePage * pageSize + pageSize);

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Evolution</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Trace how your concepts, inquiries, positions, works, and practices change over time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value) as 5 | 10)}>
            <SelectTrigger className="h-9 w-40 rounded-full bg-muted/40 font-code text-[10px] uppercase tracking-widest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5" className="font-code text-[10px] uppercase">Recent 5</SelectItem>
              <SelectItem value="10" className="font-code text-[10px] uppercase">Recent 10</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search events..." 
              className="w-64 pl-9 bg-muted/40 font-code text-[11px] h-9" 
            />
          </div>
        </div>
      </header>

      <div className="mb-10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all",
              filter === 'all' 
                ? "bg-accent text-white shadow-sm" 
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            ALL EVENTS
          </button>
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all whitespace-nowrap",
                filter === type 
                  ? "bg-accent text-white shadow-sm" 
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/50 bg-white p-4 shadow-sm">
        <div>
          <div className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent Changes</div>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Showing {rangeStart}-{rangeEnd} of {filteredEvents.length} evolution events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={safePage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="size-9 rounded-full bg-white"
            title="Newer events"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-20 text-center font-code text-[10px] uppercase tracking-widest text-muted-foreground">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            className="size-9 rounded-full bg-white"
            title="Older events"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative pl-8 space-y-12 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
        {pagedEvents.map((event, idx) => {
          const influencedSources = media.filter(m => (event.influencedBy || []).includes(m.id));

          return (
            <div key={event.id || idx} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              {/* Timeline Indicator */}
              <div className="absolute -left-[32px] top-1.5 size-2 rounded-full bg-accent ring-4 ring-background z-10" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-code text-[10px] font-bold uppercase tracking-widest text-accent">
                    {event.eventType}
                  </span>
                </div>

                <h3 className="font-headline font-bold text-2xl text-primary leading-tight">
                  {event.entityTitle}
                </h3>

                <p className="font-body italic text-[16px] text-muted-foreground leading-relaxed max-w-3xl">
                  {event.reason}
                </p>

                {influencedSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {influencedSources.map(s => (
                      <Badge key={s.id} variant="secondary" className="bg-muted/30 text-[9px] font-code uppercase tracking-tighter py-0.5 px-2 border-transparent hover:bg-muted/50 transition-colors flex items-center gap-1.5 rounded-full">
                        <BookIcon className="size-2.5 opacity-40" />
                        {s.title}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <time className="font-code text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <History className="size-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-headline italic mb-2">No events recorded</h2>
            <p className="max-w-xs mx-auto font-body">As you refine positions, complete sources, create works, and test practices, your evolution will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6.5 2H20v20H6.5" />
    <path d="M6.5 18H20" />
  </svg>
);
