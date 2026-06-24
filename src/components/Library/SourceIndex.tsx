
"use client";

import React, { useMemo, useState } from 'react';
import { Download, Copy, Search, ArrowUpDown, ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Draft, Media, MediaStatus, MediaType, Practice, VaultEntry } from '@/lib/types';
import { MEDIA_LABELS, MEDIA_TYPES, conceptKey } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SourceIndexProps {
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  practices: Practice[];
  onOpenSource: (sourceId: string) => void;
}

type SortKey = 'creator' | 'dateAdded' | 'title' | 'year';
type AnnotationFilter = 'all' | 'with' | 'without';

const statuses: MediaStatus[] = ['Want to Read', 'Consuming', 'Finished', 'Paused', 'Abandoned'];

export function SourceIndex({ media, vault, drafts, practices, onOpenSource }: SourceIndexProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MediaStatus | 'all'>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [filterAnnotations, setFilterAnnotations] = useState<AnnotationFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const allConcepts = useMemo(() => {
    const tags = new Set<string>();
    media.forEach(m => (m.tags || []).forEach(tag => tags.add(conceptKey(tag))));
    return Array.from(tags).sort();
  }, [media]);

  const filtered = useMemo(() => {
    return media
      .filter((m) => {
        const typeOk = filterType === 'all' || m.type === filterType;
        const statusOk = filterStatus === 'all' || m.status === filterStatus;
        const conceptOk = filterConcept === 'all' || (m.tags || []).map(conceptKey).includes(filterConcept);
        const annotationOk = filterAnnotations === 'all' || (filterAnnotations === 'with' ? (m.annotations || []).length > 0 : (m.annotations || []).length === 0);
        const query = `${m.title} ${m.creator} ${m.description || ''} ${m.publisher} ${m.isbn} ${m.doi} ${(m.tags || []).join(' ')}`.toLowerCase();
        return typeOk && statusOk && conceptOk && annotationOk && (!search || query.includes(search.toLowerCase()));
      })
      .sort((a, b) => {
        const valA = (a[sortKey as keyof Media] as string) || '';
        const valB = (b[sortKey as keyof Media] as string) || '';
        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
  }, [media, search, filterType, filterStatus, filterConcept, filterAnnotations, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSourceHealth = (m: Media) => {
    let score = 0;
    if (m.description) score += 20;
    if ((m.tags || []).length > 0) score += 20;
    if ((m.annotations || []).length > 0) score += 30;
    if (m.publisher || m.isbn || m.doi) score += 30;
    return score;
  };

  const copyCitation = (m: Media) => {
    const citation = `${m.creator || 'Unknown'} (${m.year || 'n.d.'}). ${m.title}.${m.publisher ? ` ${m.publisher}.` : ''}`;
    navigator.clipboard.writeText(citation);
    toast({ title: "Citation Copied", description: "APA format ready for manuscript." });
  };

  const copyAllCitations = () => {
    const citations = filtered.map(m => `${m.creator || 'Unknown'} (${m.year || 'n.d.'}). ${m.title}.${m.publisher ? ` ${m.publisher}.` : ''}`).join('\n');
    navigator.clipboard.writeText(citations);
    toast({ title: "Bibliography Copied", description: `${filtered.length} citations exported to clipboard.` });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Source Index</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Browse, filter, and manage every source feeding your thinking.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={copyAllCitations} size="sm" className="h-9 px-6 bg-white border-border/60 shadow-sm rounded-full font-bold uppercase text-[10px] tracking-widest">
            <Copy className="size-4 mr-2" /> COPY BIBLIOGRAPHY
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-6 bg-white border-border/60 shadow-sm rounded-full font-bold uppercase text-[10px] tracking-widest">
            <Download className="size-4 mr-2" /> EXPORT BIBTEX
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl border border-border/40 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search registry by title, creator, identifiers, tags..." 
            className="pl-9 h-10 text-sm rounded-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as MediaType | 'all')}>
            <SelectTrigger className="w-40 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Types</SelectItem>
              {MEDIA_TYPES.map(t => <SelectItem key={t} value={t} className="font-code text-[10px] uppercase">{MEDIA_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MediaStatus | 'all')}>
            <SelectTrigger className="w-44 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Statuses</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s} className="font-code text-[10px] uppercase">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterConcept} onValueChange={setFilterConcept}>
            <SelectTrigger className="w-48 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="All Concepts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Concepts</SelectItem>
              {allConcepts.map(c => <SelectItem key={c} value={c} className="font-code text-[10px] uppercase">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAnnotations} onValueChange={(v) => setFilterAnnotations(v as AnnotationFilter)}>
            <SelectTrigger className="w-48 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="Annotations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Annotation States</SelectItem>
              <SelectItem value="with" className="font-code text-[10px] uppercase">Has Annotations</SelectItem>
              <SelectItem value="without" className="font-code text-[10px] uppercase">No Annotations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/40 shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/5 font-code text-[9px] uppercase tracking-[0.2em] font-bold">
            <TableRow>
              <TableHead className="w-[300px] cursor-pointer" onClick={() => toggleSort('title')}>
                Title <ArrowUpDown className="inline size-3 ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('creator')}>
                Author/Creator <ArrowUpDown className="inline size-3 ml-1" />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('year')}>
                Year <ArrowUpDown className="inline size-3 ml-1" />
              </TableHead>
              <TableHead>Identifier/Pub</TableHead>
              <TableHead>Links</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-body text-[14px]">
            {filtered.map((m) => {
              const health = getSourceHealth(m);
              const linkedPositions = vault.filter((entry) => (entry.sourceIds || []).includes(m.id)).length;
              const linkedWorks = drafts.filter((draft) => (draft.sourceIds || []).includes(m.id)).length;
              const linkedPractices = practices.filter((practice) => (practice.sourceIds || []).includes(m.id)).length;
              return (
                <TableRow key={m.id} className="hover:bg-muted/5 group transition-colors cursor-pointer" onClick={() => onOpenSource(m.id)}>
                  <TableCell>
                    <div className="font-semibold italic text-primary/90">{m.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(m.tags || []).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-tighter rounded-full bg-muted/20 text-muted-foreground">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.creator}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter rounded-full bg-white shadow-sm">{m.type}</Badge>
                  </TableCell>
                  <TableCell className="font-code text-[10px] text-muted-foreground/60">{m.year || '—'}</TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate text-[11px] text-muted-foreground/80" title={m.isbn || m.publisher}>
                      {m.isbn || m.doi || m.publisher || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[8px] bg-white rounded-full"><MessageSquare className="size-3 mr-1" />{(m.annotations || []).length}</Badge>
                      <Badge variant="outline" className="text-[8px] bg-white rounded-full">{linkedPositions} positions</Badge>
                      <Badge variant="outline" className="text-[8px] bg-white rounded-full">{linkedWorks} works</Badge>
                      <Badge variant="outline" className="text-[8px] bg-white rounded-full">{linkedPractices} practices</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", health > 70 ? "bg-emerald-500" : health > 40 ? "bg-amber-500" : "bg-red-400")} 
                          style={{ width: `${health}%` }} 
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={(event) => { event.stopPropagation(); copyCitation(m); }} title="Copy Citation">
                        <Copy className="size-3.5" />
                      </Button>
                      {m.url && (
                        <Button variant="ghost" size="icon" className="size-8 rounded-full" asChild title="Open URL" onClick={(event) => event.stopPropagation()}>
                          <a href={m.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" /></a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                  No registry records matching your query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
