
"use client";

import React, { useMemo, useState } from 'react';
import { Highlighter, MessageSquare, Search, Filter, BookOpen, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Media, AnnotationType } from '@/lib/types';
import { allAnnotations, conceptKey } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface AnnotationsIndexProps {
  media: Media[];
}

export function AnnotationsIndex({ media }: AnnotationsIndexProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AnnotationType | 'all'>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');

  const filtered = useMemo(() => {
    return allAnnotations(media)
      .filter((a) => a.type !== 'question') // Exclude questions
      .filter((a) => {
        const typeOk = filterType === 'all' || a.type === filterType;
        const conceptOk = filterConcept === 'all' || (a.conceptTags || a.source.tags || []).map(conceptKey).includes(filterConcept);
        const query = `${a.text} ${a.source.title} ${a.source.creator} ${(a.conceptTags || []).join(' ')}`.toLowerCase();
        return typeOk && conceptOk && (!search || query.includes(search.toLowerCase()));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [media, search, filterType, filterConcept]);

  const allConcepts = useMemo(() => {
    const tags = new Set<string>();
    allAnnotations(media)
      .filter(a => a.type !== 'question')
      .forEach(a => (a.conceptTags || a.source.tags || []).forEach(tag => tags.add(conceptKey(tag))));
    return Array.from(tags).sort();
  }, [media]);

  const typeCounts = useMemo(() => {
    const annotations = allAnnotations(media).filter(a => a.type !== 'question');
    return {
      total: annotations.length,
      highlight: annotations.filter(a => a.type === 'highlight').length,
      thought: annotations.filter(a => a.type === 'thought').length,
      connection: annotations.filter(a => a.type === 'connection').length,
    };
  }, [media]);

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Annotations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Aggregated excerpts, cognitive highlights, and synthesized connections from across your library.</p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Total Excerpts" value={typeCounts.total} />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
              filterType === 'all' ? "bg-accent text-white" : "bg-white text-muted-foreground border border-border/60 hover:text-foreground"
            )}
          >
            ALL {typeCounts.total}
          </button>
          <button
            onClick={() => setFilterType('highlight')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
              filterType === 'highlight' ? "bg-accent text-white" : "bg-white text-muted-foreground border border-border/60 hover:text-foreground"
            )}
          >
            HIGHLIGHTS {typeCounts.highlight}
          </button>
          <button
            onClick={() => setFilterType('thought')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
              filterType === 'thought' ? "bg-accent text-white" : "bg-white text-muted-foreground border border-border/60 hover:text-foreground"
            )}
          >
            THOUGHTS {typeCounts.thought}
          </button>
          <button
            onClick={() => setFilterType('connection')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
              filterType === 'connection' ? "bg-accent text-white" : "bg-white text-muted-foreground border border-border/60 hover:text-foreground"
            )}
          >
            CONNECTIONS {typeCounts.connection}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterConcept} onValueChange={setFilterConcept}>
            <SelectTrigger className="w-56 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="Filter by Concept" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Concepts</SelectItem>
              {allConcepts.map(c => <SelectItem key={c} value={c} className="font-code text-[10px] uppercase">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search excerpt text..." 
              className="pl-9 h-10 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((a) => (
          <Card key={a.id} className="p-8 bg-white border border-accent/10 shadow-md rounded-2xl group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <Badge variant="outline" className="font-code text-[9px] uppercase tracking-widest bg-muted/5 border-border/40 rounded-full font-bold px-3 py-1">
                {a.type}
              </Badge>
              <div className="flex items-center gap-2 font-code text-[9px] text-muted-foreground/40 font-bold uppercase">
                <time>{new Date(a.date).toLocaleDateString()}</time>
              </div>
            </div>
            
            <div className="relative mb-8">
              <Quote className="absolute -left-6 -top-2 size-10 text-accent/5" />
              <p className="font-body italic leading-relaxed text-[18px] text-primary/90 relative z-10">
                "{a.text}"
              </p>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-border/20">
              <div className="size-8 rounded-lg bg-accent/5 flex items-center justify-center shrink-0 border border-accent/10">
                <BookOpen className="size-4 text-accent/40" />
              </div>
              <div className="min-w-0">
                <p className="font-headline font-bold italic text-sm text-primary leading-tight truncate">{a.source.title}</p>
                <p className="readex-kicker text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold truncate mt-1">{a.source.creator.toUpperCase()}</p>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center opacity-30">
            <Highlighter className="size-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="font-headline text-3xl italic">No excerpts captured</h3>
            <p className="font-body text-base mt-3 max-w-sm mx-auto">As you extract text and anchor thoughts in your library, they will aggregate here for synthesis.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-right">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-1">{label}</div>
      <div className="font-headline text-3xl font-bold italic text-primary leading-none">{value}</div>
    </div>
  );
}
