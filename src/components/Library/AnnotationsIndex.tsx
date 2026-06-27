
"use client";

import React, { useMemo, useState } from 'react';
import { BookOpen, BrainCircuit, Edit, ExternalLink, Highlighter, Loader2, Quote, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { NextPhilosophicalActionPanel } from '@/components/Philosophy/NextPhilosophicalActionPanel';
import type { AiSuggestion, Annotation, AnnotationType, Concept, Media, PhilosophicalLink, Question, VaultEntry } from '@/lib/types';
import { allAnnotations, conceptKey, MEDIA_LABELS, normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { suggestAnnotationConsequences } from '@/ai/flows/philosophy-suggestions';

interface AnnotationsIndexProps {
  media: Media[];
  concepts: Concept[];
  positions?: VaultEntry[];
  inquiries?: Question[];
  onUpdateAnnotation: (sourceId: string, annotation: Annotation) => void;
  onDeleteAnnotation: (sourceId: string, annotationId: string) => void;
  onOpenSource: (sourceId: string) => void;
  onCreatePosition: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
  onCreateInquiry: (data: { text: string; conceptIds: string[]; sourceIds: string[]; evidenceIds: string[]; type: 'annotation' }) => void;
  onAddConcept: (data: Partial<Concept>) => void;
  onCreateSuggestion: (data: Partial<AiSuggestion>) => void;
  onCreateLink: (data: Partial<PhilosophicalLink>) => void;
  onNavigate?: (view: string) => void;
}

type FlatAnnotation = Annotation & { source: Media };
type AnnotationFilter = AnnotationType | 'all' | 'unanswered';
type PreflightMode = 'position' | 'inquiry';

interface PreflightDraft {
  mode: PreflightMode;
  annotation: FlatAnnotation;
  title: string;
  body: string;
  question: string;
  tags: string[];
}

export function AnnotationsIndex({
  media,
  concepts,
  positions = [],
  inquiries = [],
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenSource,
  onCreatePosition,
  onCreateInquiry,
  onAddConcept,
  onCreateSuggestion,
  onCreateLink,
  onNavigate,
}: AnnotationsIndexProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AnnotationFilter>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editing, setEditing] = useState<FlatAnnotation | null>(null);
  const [preflight, setPreflight] = useState<PreflightDraft | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ annotation: FlatAnnotation; linkType: 'supports' | 'challenges' } | null>(null);
  const { toast } = useToast();

  const annotations = useMemo(() => allAnnotations(media) as FlatAnnotation[], [media]);
  const filtered = useMemo(() => {
    return annotations
      .filter((annotation) => {
        const typeOk =
          filterType === 'all' ||
          (filterType === 'unanswered'
            ? annotation.type === 'question' && !annotation.answer?.trim()
            : annotation.type === filterType);
        const conceptOk = filterConcept === 'all' || (annotation.conceptTags || annotation.source.tags || []).map(conceptKey).includes(filterConcept);
        const sourceOk = filterSource === 'all' || annotation.source.id === filterSource;
        const query = `${annotation.text} ${annotation.source.title} ${annotation.source.creator} ${(annotation.conceptTags || annotation.source.tags || []).join(' ')}`.toLowerCase();
        return typeOk && conceptOk && sourceOk && (!search || query.includes(search.toLowerCase()));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [annotations, search, filterType, filterConcept, filterSource]);

  const allConcepts = useMemo(() => {
    const tags = new Set<string>();
    annotations.forEach((annotation) => {
      (annotation.conceptTags || annotation.source.tags || []).forEach((tag) => tags.add(conceptKey(tag)));
    });
    return Array.from(tags).sort();
  }, [annotations]);

  const typeCounts = useMemo(() => ({
    total: annotations.length,
    highlight: annotations.filter((annotation) => annotation.type === 'highlight').length,
    thought: annotations.filter((annotation) => annotation.type === 'thought').length,
    question: annotations.filter((annotation) => annotation.type === 'question').length,
    unanswered: annotations.filter((annotation) => annotation.type === 'question' && !annotation.answer?.trim()).length,
    connection: annotations.filter((annotation) => annotation.type === 'connection').length,
  }), [annotations]);

  const saveEditing = () => {
    if (!editing || !editing.text.trim()) return;
    const { source, ...annotation } = editing;
    onUpdateAnnotation(source.id, {
      ...annotation,
      text: annotation.text.trim(),
      conceptTags: normalizeConceptTags(annotation.conceptTags || source.tags),
      philosophyStatus: annotation.philosophyStatus || (annotation.type === 'question' ? 'questioned' : 'connected'),
      date: annotation.date || today(),
    });
    setEditing(null);
  };

  const openPreflight = (annotation: FlatAnnotation, mode: PreflightMode) => {
    const tags = normalizeConceptTags(annotation.conceptTags || annotation.source.tags);
    setPreflight({
      mode,
      annotation,
      title: annotation.text.slice(0, 90),
      body: annotation.answer ? `${annotation.text}\n\nAnswer: ${annotation.answer}` : annotation.text,
      question: annotation.type === 'question' ? annotation.text : `What does this imply: ${annotation.text}`,
      tags,
    });
  };

  const submitPreflight = () => {
    if (!preflight) return;
    if (preflight.mode === 'position') {
      createPosition(preflight.annotation, preflight.title, preflight.body, preflight.tags);
      onNavigate?.('vault');
    } else {
      createInquiry(preflight.annotation, preflight.question, preflight.tags);
      onNavigate?.('questions');
    }
    setPreflight(null);
  };

  const createPosition = (annotation: FlatAnnotation, title = annotation.text.slice(0, 90), body = annotation.answer ? `${annotation.text}\n\nAnswer: ${annotation.answer}` : annotation.text, tags = normalizeConceptTags(annotation.conceptTags || annotation.source.tags)) => {
    onCreatePosition({
      title,
      body,
      tags,
      sourceIds: [annotation.source.id],
    });
    const { source, ...annotationData } = annotation;
    onUpdateAnnotation(source.id, { ...annotationData, philosophyStatus: 'used_in_position' });
  };

  const createInquiry = (annotation: FlatAnnotation, text = annotation.type === 'question' ? annotation.text : `What does this imply: ${annotation.text}`, tags = normalizeConceptTags(annotation.conceptTags || annotation.source.tags)) => {
    onCreateInquiry({
      text,
      conceptIds: concepts.filter((concept) => tags.map(conceptKey).includes(conceptKey(concept.name))).map((concept) => concept.id),
      sourceIds: [annotation.source.id],
      evidenceIds: [annotation.id],
      type: 'annotation',
    });
    const { source, ...annotationData } = annotation;
    onUpdateAnnotation(source.id, { ...annotationData, philosophyStatus: 'questioned' });
  };

  const suggestConsequences = async (annotation: FlatAnnotation) => {
    setSuggestingId(annotation.id);
    try {
      const suggestion = await suggestAnnotationConsequences({
        annotationText: annotation.text,
        annotationType: annotation.type,
        sourceTitle: annotation.source.title,
        existingConcepts: concepts.map((concept) => concept.name),
        existingInquiries: inquiries.map((inquiry) => inquiry.text),
        existingPositions: positions.map((position) => position.statement || position.title),
      });
      onCreateSuggestion({
        targetType: 'annotation',
        targetId: `${annotation.source.id}:${annotation.id}`,
        targetLabel: annotation.text.slice(0, 90),
        suggestionType: 'annotation_consequence',
        title: 'Possible consequence',
        body: suggestion.rationale,
        payload: {
          ...suggestion,
          sourceId: annotation.source.id,
          annotationId: annotation.id,
        },
      });
      toast({ title: 'Suggestion Saved', description: 'Noesis saved a possible next step for you to accept or ignore later.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Suggestion Failed', description: 'The assistant could not read this annotation right now.' });
    } finally {
      setSuggestingId(null);
    }
  };

  const filterButtons: { id: AnnotationFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: typeCounts.total },
    { id: 'highlight', label: 'Highlights', count: typeCounts.highlight },
    { id: 'thought', label: 'Thoughts', count: typeCounts.thought },
    { id: 'question', label: 'Questions', count: typeCounts.question },
    { id: 'unanswered', label: 'Unanswered', count: typeCounts.unanswered },
    { id: 'connection', label: 'Connections', count: typeCounts.connection },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Annotations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Review and refine captured highlights, thoughts, questions, and connections across all sources.</p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Total Excerpts" value={typeCounts.total} />
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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search excerpt text..." className="pl-9 h-10 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((annotation) => (
          <Card key={`${annotation.source.id}:${annotation.id}`} className="p-6 bg-white border border-accent/10 shadow-md rounded-2xl group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start gap-4 mb-4">
              <Badge variant="outline" className="font-code text-[9px] uppercase tracking-widest bg-muted/5 border-border/40 rounded-full font-bold px-3 py-1">
                {annotation.type}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="size-8 rounded-full text-accent hover:text-accent" onClick={() => suggestConsequences(annotation)} disabled={suggestingId === annotation.id} title="Ask Noesis AI">
                  {suggestingId === annotation.id ? <Loader2 className="size-3.5 animate-spin" /> : <BrainCircuit className="size-3.5" />}
                </Button>
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

            <div className="relative mb-4">
              <Quote className="absolute -left-6 -top-2 size-10 text-accent/5" />
              <p className="font-body italic leading-relaxed text-[18px] text-primary/90 relative z-10">"{annotation.text}"</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {normalizeConceptTags(annotation.conceptTags || annotation.source.tags).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-wider rounded-full bg-muted/20 text-muted-foreground font-bold">{tag}</Badge>
              ))}
            </div>

            <NextPhilosophicalActionPanel
              compact
              status={annotation.philosophyStatus || (annotation.type === 'question' ? 'questioned' : 'raw')}
              description="Move this note into the next layer: classify it, link it, or transform it."
              actions={[
                {
                  label: 'Support Position',
                  tone: 'support',
                  description: positions.length ? 'Mark this annotation as evidence for an existing position.' : 'Create a position first.',
                  disabled: positions.length === 0,
                  onClick: () => setLinkDialog({ annotation, linkType: 'supports' }),
                },
                {
                  label: 'Challenge Position',
                  tone: 'challenge',
                  description: positions.length ? 'Mark this annotation as a challenge to an existing position.' : 'Create a position first.',
                  disabled: positions.length === 0,
                  onClick: () => setLinkDialog({ annotation, linkType: 'challenges' }),
                },
                {
                  label: 'Form Position',
                  onClick: () => openPreflight(annotation, 'position'),
                },
                {
                  label: 'Open in Query',
                  onClick: () => openPreflight(annotation, 'inquiry'),
                },
              ]}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/20 mt-4">
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
                <Button variant="outline" size="icon" onClick={() => suggestConsequences(annotation)} disabled={suggestingId === annotation.id} className="size-8 rounded-full bg-card border-border/60" title="Ask Noesis AI">
                  {suggestingId === annotation.id ? <Loader2 className="size-3.5 animate-spin" /> : <BrainCircuit className="size-3.5" />}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center opacity-30">
            <Highlighter className="size-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="font-headline text-3xl italic">No excerpts found</h3>
            <p className="font-body text-base mt-3 max-w-sm mx-auto">As you extract text and anchor thoughts in your library, they will aggregate here for synthesis.</p>
          </div>
        )}
      </div>

      <Dialog open={!!linkDialog} onOpenChange={(open) => !open && setLinkDialog(null)}>
        <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">
              {linkDialog?.linkType === 'supports' ? 'Support a Position' : 'Challenge a Position'}
            </DialogTitle>
          </DialogHeader>
          {linkDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-sm italic text-muted-foreground font-body leading-relaxed">
                "{linkDialog.annotation.text.slice(0, 120)}{linkDialog.annotation.text.length > 120 ? '…' : ''}"
              </p>
              <p className="text-xs font-code uppercase tracking-widest text-muted-foreground/60">Select a position this annotation {linkDialog.linkType === 'supports' ? 'supports' : 'challenges'}:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {positions.map((position) => (
                  <button
                    key={position.id}
                    className="w-full text-left rounded-xl border border-border/40 bg-muted/10 p-4 hover:border-accent/40 hover:bg-accent/5 transition-all"
                    onClick={() => {
                      onCreateLink({
                        fromType: 'annotation',
                        fromId: linkDialog.annotation.id,
                        fromLabel: linkDialog.annotation.text.slice(0, 80),
                        toType: 'position',
                        toId: position.id,
                        toLabel: position.title,
                        type: linkDialog.linkType,
                        note: `Annotation ${linkDialog.linkType} this position.`,
                        createdFrom: 'manual',
                      });
                      const { source, ...annotationData } = linkDialog.annotation;
                      onUpdateAnnotation(source.id, {
                        ...annotationData,
                        philosophyStatus: linkDialog.linkType === 'supports' ? 'used_in_position' : 'questioned',
                      });
                      toast({ title: 'Link Created', description: `Annotation marked as ${linkDialog.linkType === 'supports' ? 'supporting' : 'challenging'} "${position.title}".` });
                      setLinkDialog(null);
                    }}
                  >
                    <p className="font-headline font-bold italic text-sm text-primary leading-tight">{position.title}</p>
                    <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-1">{position.statement}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setLinkDialog(null)} className="rounded-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Edit Annotation</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editing.type} onValueChange={(value) => setEditing((prev) => prev ? { ...prev, type: value as AnnotationType } : prev)}>
                    <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
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
                  <Input value={editing.source.title} disabled className="rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea value={editing.text} onChange={(event) => setEditing((prev) => prev ? { ...prev, text: event.target.value } : prev)} className="min-h-[140px]" />
              </div>
              {editing.type === 'question' && (
                <div className="space-y-2">
                  <Label>Working Answer</Label>
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
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)} className="rounded-full">Cancel</Button>
            <Button onClick={saveEditing} className="rounded-full px-8">Save Annotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preflight} onOpenChange={(open) => !open && setPreflight(null)}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Route Annotation</DialogTitle>
            <p className="text-sm text-muted-foreground">Shape the object before Noesis sends it to the right workspace.</p>
          </DialogHeader>
          {preflight && (
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={preflight.mode} onValueChange={(value) => setPreflight((prev) => prev ? { ...prev, mode: value as PreflightMode } : prev)}>
                  <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">Positions</SelectItem>
                    <SelectItem value="inquiry">Inquiries</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preflight.mode === 'position' ? (
                <>
                  <div className="space-y-2">
                    <Label>Position Title</Label>
                    <Input value={preflight.title} onChange={(event) => setPreflight((prev) => prev ? { ...prev, title: event.target.value } : prev)} className="rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Statement</Label>
                    <Textarea value={preflight.body} onChange={(event) => setPreflight((prev) => prev ? { ...prev, body: event.target.value } : prev)} className="min-h-[140px]" />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Question To Work</Label>
                  <Textarea value={preflight.question} onChange={(event) => setPreflight((prev) => prev ? { ...prev, question: event.target.value } : prev)} className="min-h-[140px]" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Concept Tags</Label>
                <ConceptTagPicker
                  concepts={concepts}
                  value={preflight.tags}
                  onChange={(tags) => setPreflight((prev) => prev ? { ...prev, tags: normalizeConceptTags(tags) } : prev)}
                  onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setPreflight(null)} className="rounded-full">Cancel</Button>
            <Button onClick={submitPreflight} className="rounded-full px-8">
              {preflight?.mode === 'position' ? 'Open in Positions' : 'Open in Inquiries'}
            </Button>
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
