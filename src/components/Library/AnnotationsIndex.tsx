
"use client";

import React, { useMemo, useState } from 'react';
import { BookOpen, Edit, ExternalLink, HelpCircle, Highlighter, Lightbulb, Quote, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Annotation, AnnotationType, Concept, Media } from '@/lib/types';
import { allAnnotations, conceptKey, MEDIA_LABELS, normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface AnnotationsIndexProps {
  media: Media[];
  concepts: Concept[];
  onUpdateAnnotation: (sourceId: string, annotation: Annotation) => void;
  onDeleteAnnotation: (sourceId: string, annotationId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onCreatePosition: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
  onCreateInquiry: (data: { text: string; conceptIds: string[]; sourceIds: string[]; evidenceIds: string[]; type: 'annotation' }) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

type FlatAnnotation = Annotation & { source: Media };
type AnnotationFilter = AnnotationType | 'all' | 'unanswered';

export function AnnotationsIndex({
  media,
  concepts,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenSource,
  onCreatePosition,
  onCreateInquiry,
  onAddConcept,
}: AnnotationsIndexProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AnnotationFilter>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editing, setEditing] = useState<FlatAnnotation | null>(null);

  const annotations = useMemo(() => allAnnotations(media) as FlatAnnotation[], [media]);
  const filtered = useMemo(() => {
    return annotations
      .filter((annotation) => {
        const typeOk = filterType === 'all' || (filterType === 'unanswered' ? annotation.type === 'question' && !annotation.answer : annotation.type === filterType);
        const conceptOk = filterConcept === 'all' || (annotation.conceptTags || annotation.source.tags || []).map(conceptKey).includes(filterConcept);
        const sourceOk = filterSource === 'all' || annotation.source.id === filterSource;
        const query = `${annotation.text} ${annotation.answer || ''} ${annotation.source.title} ${annotation.source.creator} ${(annotation.conceptTags || annotation.source.tags || []).join(' ')}`.toLowerCase();
        return typeOk && conceptOk && sourceOk && (!search || query.includes(search.toLowerCase()));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [annotations, search, filterType, filterConcept, filterSource]);

  const allConcepts = useMemo(() => {
    const tags = new Set<string>();
    annotations.forEach((annotation) => (annotation.conceptTags || annotation.source.tags || []).forEach((tag) => tags.add(conceptKey(tag))));
    return Array.from(tags).sort();
  }, [annotations]);

  const typeCounts = useMemo(() => ({
    total: annotations.length,
    highlight: annotations.filter((annotation) => annotation.type === 'highlight').length,
    thought: annotations.filter((annotation) => annotation.type === 'thought').length,
    question: annotations.filter((annotation) => annotation.type === 'question').length,
    unanswered: annotations.filter((annotation) => annotation.type === 'question' && !annotation.answer).length,
    connection: annotations.filter((annotation) => annotation.type === 'connection').length,
  }), [annotations]);

  const saveEditing = () => {
    if (!editing || !editing.text.trim()) return;
    const { source, ...annotation } = editing;
    onUpdateAnnotation(source.id, {
      ...annotation,
      text: annotation.text.trim(),
      conceptTags: normalizeConceptTags(annotation.conceptTags || source.tags),
      date: annotation.date || today(),
    });
    setEditing(null);
  };

  const createPosition = (annotation: FlatAnnotation) => {
    onCreatePosition({
      title: annotation.text.slice(0, 90),
      body: annotation.answer ? `${annotation.text}\n\nAnswer: ${annotation.answer}` : annotation.text,
      tags: normalizeConceptTags(annotation.conceptTags || annotation.source.tags),
      sourceIds: [annotation.source.id],
    });
  };

  const createInquiry = (annotation: FlatAnnotation) => {
    onCreateInquiry({
      text: annotation.text,
      conceptIds: normalizeConceptTags(annotation.conceptTags || annotation.source.tags),
      sourceIds: [annotation.source.id],
      evidenceIds: [annotation.source.id],
      type: 'annotation',
    });
  };

  const filterButtons: { id: AnnotationFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: typeCounts.total },
    { id: 'highlight', label: 'Highlights', count: typeCounts.highlight },
    { id: 'thought', label: 'Thoughts', count: typeCounts.thought },
    { id: 'question', label: 'Questions', count: typeCounts.question },
    { id: 'connection', label: 'Connections', count: typeCounts.connection },
    { id: 'unanswered', label: 'Unanswered', count: typeCounts.unanswered },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Annotations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Review and refine captured highlights, thoughts, questions, and connections across all sources.</p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Total" value={typeCounts.total} />
          <Stat label="Questions" value={typeCounts.question} />
          <Stat label="Unanswered" value={typeCounts.unanswered} />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setFilterType(button.id)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
                filterType === button.id ? "bg-accent text-white" : "bg-white text-muted-foreground border border-border/60 hover:text-foreground"
              )}
            >
              {button.label} {button.count}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-56 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="Filter by Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Sources</SelectItem>
              {media.map((source) => <SelectItem key={source.id} value={source.id} className="font-code text-[10px] uppercase">{source.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterConcept} onValueChange={setFilterConcept}>
            <SelectTrigger className="w-56 h-10 font-code text-[10px] uppercase rounded-full bg-white shadow-sm border-border/60"><SelectValue placeholder="Filter by Concept" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-code text-[10px] uppercase">All Concepts</SelectItem>
              {allConcepts.map(c => <SelectItem key={c} value={c} className="font-code text-[10px] uppercase">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search annotation text..." className="pl-9 h-10 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((annotation) => (
          <Card key={`${annotation.source.id}:${annotation.id}`} className="p-8 bg-white border border-accent/10 shadow-md rounded-2xl group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start gap-4 mb-6">
              <Badge variant="outline" className={cn("font-code text-[9px] uppercase tracking-widest bg-muted/5 border-border/40 rounded-full font-bold px-3 py-1", annotation.type === 'question' && 'border-accent/30 text-accent')}>
                {annotation.type}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => setEditing(annotation)} title="Edit annotation">
                  <Edit className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => onOpenSource(annotation.source.id)} title="Open source thread">
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 rounded-full text-destructive hover:text-destructive" onClick={() => onDeleteAnnotation(annotation.source.id, annotation.id)} title="Delete annotation">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="relative mb-6">
              <Quote className="absolute -left-6 -top-2 size-10 text-accent/5" />
              <p className="font-body italic leading-relaxed text-[18px] text-primary/90 relative z-10">"{annotation.text}"</p>
            </div>

            {annotation.type === 'question' && (
              <div className="mb-6 rounded-lg border-l-2 border-accent/30 bg-muted/10 p-4 text-sm text-muted-foreground">
                {annotation.answer || 'No answer yet.'}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
              {normalizeConceptTags(annotation.conceptTags || annotation.source.tags).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-wider rounded-full bg-muted/20 text-muted-foreground">{tag}</Badge>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/20">
              <button onClick={() => onOpenSource(annotation.source.id)} className="flex min-w-0 items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-accent/5 flex items-center justify-center shrink-0 border border-accent/10">
                  <BookOpen className="size-4 text-accent/40" />
                </div>
                <div className="min-w-0">
                  <p className="font-headline font-bold italic text-sm text-primary leading-tight truncate">{annotation.source.title}</p>
                  <p className="readex-kicker text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold truncate mt-1">{annotation.source.creator || MEDIA_LABELS[annotation.source.type]}</p>
                </div>
              </button>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => createPosition(annotation)} className="h-8 rounded-full font-code text-[9px] uppercase tracking-widest">
                  <Lightbulb className="mr-1.5 size-3.5" /> Position
                </Button>
                {annotation.type === 'question' && (
                  <Button variant="outline" size="sm" onClick={() => createInquiry(annotation)} className="h-8 rounded-full font-code text-[9px] uppercase tracking-widest">
                    <HelpCircle className="mr-1.5 size-3.5" /> Inquiry
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center opacity-30">
            <Highlighter className="size-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="font-headline text-3xl italic">No annotations found</h3>
            <p className="font-body text-base mt-3 max-w-sm mx-auto">As you extract text and anchor thoughts in your library, they will aggregate here for synthesis.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Edit Annotation</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editing.type} onValueChange={(value) => setEditing((prev) => prev ? { ...prev, type: value as AnnotationType } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highlight">Highlight</SelectItem>
                      <SelectItem value="thought">Thought</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="connection">Connection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={editing.source.title} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea value={editing.text} onChange={(event) => setEditing((prev) => prev ? { ...prev, text: event.target.value } : prev)} className="min-h-[140px]" />
              </div>
              {editing.type === 'question' && (
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea value={editing.answer || ''} onChange={(event) => setEditing((prev) => prev ? { ...prev, answer: event.target.value } : prev)} className="min-h-[100px]" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Concept Tags</Label>
                <ConceptTagPicker
                  concepts={concepts}
                  value={editing.conceptTags || editing.source.tags || []}
                  onChange={(tags) => setEditing((prev) => prev ? { ...prev, conceptTags: normalizeConceptTags(tags) } : prev)}
                  onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEditing}>Save Annotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
