
"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, Plus, Search, Trash2, MessageSquare, X, Sparkles, Loader2, HelpCircle, Triangle, BookOpen, FileText, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Annotation, Concept, Media, MediaStatus, MediaType, VaultEntry, Draft, Question, TimelineEvent, Practice } from '@/lib/types';
import { MEDIA_LABELS, MEDIA_TYPES, MEDIA_ICONS_COMP, normalizeConceptTags, today, uid, conceptKey, conceptRelated } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sourceResultToMediaPatch } from '@/lib/source-intake';
import type { NormalizedSourceResult } from '@/lib/source-intake';
import { distillInsightsFromMedia } from '@/ai/flows/distill-insights-from-media';
import { generateReflectiveQuestions } from '@/ai/flows/generate-reflective-questions-flow';
import { locateMediaMetadata } from '@/ai/flows/locate-media-metadata-flow';

interface MediaLibraryProps {
  media: Media[];
  concepts: Concept[];
  vault: VaultEntry[];
  drafts: Draft[];
  practices: Practice[];
  questions: Question[];
  timeline: TimelineEvent[];
  onAddMedia: (data: Partial<Media>) => void;
  onUpdateMedia: (media: Media) => void;
  onDeleteMedia: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
  onCreateIdea: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
  onDeleteVaultEntry: (id: string) => void;
  focusedSourceId?: string | null;
  onFocusedSourceHandled?: () => void;
}

const statuses: MediaStatus[] = ['Want to Read', 'Consuming', 'Finished', 'Paused', 'Abandoned'];

export function MediaLibrary({ 
  media, 
  concepts, 
  vault, 
  drafts,
  practices,
  questions,
  timeline,
  onAddMedia, 
  onUpdateMedia, 
  onDeleteMedia, 
  onAddConcept,
  onCreateIdea,
  onDeleteVaultEntry,
  focusedSourceId,
  onFocusedSourceHandled
}: MediaLibraryProps) {
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Media>>({ type: 'book', title: '', creator: '', status: 'Want to Read', tags: [] });
  const [annotationDraft, setAnnotationDraft] = useState({ type: 'thought' as Annotation['type'], text: '' });
  const [isDistilling, setIsDistilling] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightDraft, setInsightDraft] = useState({ title: '', body: '', tags: [] as string[] });
  const [conceptPopupName, setConceptPopupName] = useState<string | null>(null);
  const { toast } = useToast();

  const selected = media.find((item) => item.id === selectedId) || null;
  const [captureDraft, setCaptureDraft] = useState<Media['capture'] | null>(null);
  
  const filtered = useMemo(() => media.filter((item) => {
    const typeOk = filter === 'all' || item.type === filter;
    const query = `${item.title} ${item.creator} ${(item.tags || []).join(' ')}`.toLowerCase();
    return typeOk && (!searchQuery || query.includes(searchQuery.toLowerCase()));
  }), [filter, media, searchQuery]);

  useEffect(() => {
    if (!focusedSourceId) return;
    if (media.some((item) => item.id === focusedSourceId)) {
      setSelectedId(focusedSourceId);
      onFocusedSourceHandled?.();
    }
  }, [focusedSourceId, media, onFocusedSourceHandled]);

  const openEditor = (item?: Media) => {
    setDraft(item ? { ...item } : { type: 'book', title: '', creator: '', status: 'Want to Read', tags: [] });
    setEditorOpen(true);
  };

  const saveMedia = () => {
    if (!draft.title?.trim()) return;
    if (draft.id) {
      onUpdateMedia({ ...(draft as Media), tags: normalizeConceptTags(draft.tags), dateUpdated: today() });
    } else {
      onAddMedia({ ...draft, tags: normalizeConceptTags(draft.tags), annotations: [], capture: { sessions: [] } });
    }
    setEditorOpen(false);
  };

  const updateSelected = (patch: Partial<Media>) => {
    if (!selected) return;
    onUpdateMedia({ ...selected, ...patch, dateUpdated: today() });
  };

  useEffect(() => {
    setCaptureDraft(selected?.capture || { sessions: [] });
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || !captureDraft) return;
    if (JSON.stringify(captureDraft) === JSON.stringify(selected.capture || { sessions: [] })) return;
    const timeout = window.setTimeout(() => {
      updateSelected({ capture: captureDraft });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [captureDraft, selected?.id]);

  const updateCaptureDraft = (capture: Media['capture']) => {
    setCaptureDraft({ ...capture, sessions: capture?.sessions || [] });
  };

  const addAnnotation = () => {
    if (!selected || !annotationDraft.text.trim()) return;
    const annotation: Annotation = {
      id: uid(),
      type: annotationDraft.type,
      text: annotationDraft.text.trim(),
      date: today(),
      conceptTags: selected.tags,
      philosophyStatus: annotationDraft.type === 'question' ? 'questioned' : 'raw',
    };
    updateSelected({ annotations: [annotation, ...(selected.annotations || [])] });
    setAnnotationDraft({ type: 'thought', text: '' });
  };

  const handleDistill = async () => {
    if (!selected) return;
    setIsDistilling(true);
    try {
      const { coreClaim } = await distillInsightsFromMedia({
        mediaTitle: selected.title,
        mediaCreator: selected.creator,
        capturedNotes: selected.capture,
        annotations: selected.annotations,
      });
      const capture = selected.capture || { sessions: [] };
      const nextCapture = { ...capture, after: { ...capture.after, coreArgument: coreClaim }, sessions: capture.sessions || [] };
      setCaptureDraft(nextCapture);
      updateSelected({ capture: nextCapture });
      toast({ title: "Insight Distilled", description: "AI has suggested a core claim based on your notes." });
    } catch (error) {
      toast({ variant: "destructive", title: "Distillation Failed", description: "The AI was unable to synthesize a claim at this time." });
    } finally {
      setIsDistilling(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selected) return;
    setIsGeneratingQuestions(true);
    try {
      const questionsRes = await generateReflectiveQuestions({
        mediaTitle: selected.title,
        beforePriorBeliefs: selected.capture?.before?.priorBeliefs,
        beforeExpectation: selected.capture?.before?.expectation,
        beforeOpenQuestion: selected.capture?.before?.openQuestion,
        afterCoreArgument: selected.capture?.after?.coreArgument,
        afterLastingIdea: selected.capture?.after?.lasting,
        afterBeliefChange: selected.capture?.after?.beliefChange,
      });
      
      const newAnnotations: Annotation[] = questionsRes.map(q => ({
        id: uid(),
        type: 'question',
        text: q,
        date: today(),
        conceptTags: selected.tags,
        philosophyStatus: 'questioned',
      }));

      updateSelected({ annotations: [...newAnnotations, ...(selected.annotations || [])] });
      toast({ title: "Questions Generated", description: "New reflective inquiries added to annotations." });
    } catch (error) {
      toast({ variant: "destructive", title: "Generation Failed", description: "AI reflective questions could not be created." });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const saveInsight = () => {
    if (!selected || !insightDraft.title.trim()) return;
    onCreateIdea({
      ...insightDraft,
      sourceIds: [selected.id]
    });
    setInsightDraft({ title: '', body: '', tags: [] });
    setInsightOpen(false);
    toast({ title: "Insight Saved", description: "New breakthrough anchored to this source." });
  };

  if (selected) {
    const linkedInsights = vault.filter((entry) => (entry.sourceIds || []).includes(selected.id));
    const capture = captureDraft || selected.capture || { sessions: [] };
    
    return (
      <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedId(null)} className="font-code text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center transition-colors">
              &lt; LIBRARY
            </button>
            <span className="font-code text-[11px] uppercase tracking-widest text-primary/30">/</span>
            <span className="font-code text-[11px] uppercase tracking-widest text-primary/80 font-bold">
              {MEDIA_LABELS[selected.type]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selected.status} onValueChange={(value) => updateSelected({ status: value as MediaStatus })}>
              <SelectTrigger className="w-44 font-code text-[10px] uppercase h-9 bg-white shadow-sm border-border/60 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status} className="font-code text-[10px] uppercase">{status}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => openEditor(selected)} className="h-9 px-6 font-code text-[10px] tracking-widest uppercase border-border/60 shadow-sm bg-white rounded-full">EDIT</Button>
            <Button variant="outline" size="sm" onClick={() => { onDeleteMedia(selected.id); setSelectedId(null); }} className="h-9 px-6 font-code text-[10px] tracking-widest uppercase text-destructive border-destructive/20 hover:bg-destructive/10 shadow-sm bg-white rounded-full">DELETE</Button>
          </div>
        </header>

        <div className="bg-white border border-border/50 rounded-xl p-8 mb-10 flex gap-10 shadow-sm">
          <div className="size-56 bg-accent/5 rounded-lg shrink-0 flex items-center justify-center border border-border/30 overflow-hidden shadow-inner">
            {selected.thumbnailUrl ? (
              <img src={selected.thumbnailUrl} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <div className="size-20 rounded bg-accent/10 flex items-center justify-center">
                {React.createElement(MEDIA_ICONS_COMP[selected.type], { className: "size-10 text-accent/40" })}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-headline text-4xl font-bold mb-3 leading-tight">{selected.title}</h1>
            <div className="flex items-center gap-4 mb-5">
              <span className="font-body text-xl italic text-muted-foreground">{selected.creator}</span>
              {selected.year && <span className="font-code text-xs text-muted-foreground/40 font-bold tracking-widest">{selected.year}</span>}
            </div>
            <p className="font-body text-lg italic text-primary/80 mb-8 max-w-3xl leading-relaxed">
              {selected.description || "A placeholder for the central thesis or importance of this scholarly source."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {(selected.tags || []).map(tag => (
                <button
                  key={tag}
                  onClick={() => setConceptPopupName(tag)}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 font-code text-[9px] uppercase tracking-[0.18em] font-bold bg-white text-muted-foreground border-border/60 shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all"
                >
                  {tag}
                </button>
              ))}
              <Badge variant="outline" className="font-code text-[9px] uppercase tracking-[0.18em] px-4 py-1.5 bg-white border-border/60 shadow-sm rounded-full font-bold">
                {selected.annotations?.length || 0} NOTES
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="capture" className="w-full">
          <TabsList className="bg-transparent border-b border-border/50 rounded-none h-14 w-full justify-start gap-10 p-0 mb-10">
            <TabsTrigger value="capture" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full text-[11px] font-bold">CAPTURE</TabsTrigger>
            <TabsTrigger value="annotations" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full text-[11px] font-bold">ANNOTATIONS</TabsTrigger>
            <TabsTrigger value="insights" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full text-[11px] font-bold">POSITIONS</TabsTrigger>
            <TabsTrigger value="connections" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full text-[11px] font-bold">LINKS</TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-16">
            <p className="font-body text-sm text-muted-foreground italic mb-10">
              All capture is saved automatically. This stays attached to this {selected.type} permanently.
            </p>

            <section>
              <h3 className="readex-kicker flex items-center gap-3 mb-6 opacity-40 font-bold">
                <Plus className="size-2.5" /> BEFORE YOU START
              </h3>
              <div className="bg-muted/5 border border-border/30 rounded-xl overflow-hidden shadow-sm">
                <CaptureRow label="PRIOR BELIEFS" value={capture.before?.priorBeliefs} placeholder="What do I already believe about this topic?" onChange={(val) => updateCaptureDraft({ ...capture, before: { ...capture.before, priorBeliefs: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="EXPECTATION" value={capture.before?.expectation} placeholder="What am I hoping this challenges or confirms?" onChange={(val) => updateCaptureDraft({ ...capture, before: { ...capture.before, expectation: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="OPEN QUESTION" value={capture.before?.openQuestion} placeholder="What core problem am I exploring here?" onChange={(val) => updateCaptureDraft({ ...capture, before: { ...capture.before, openQuestion: val }, sessions: capture.sessions || [] })} />
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="readex-kicker flex items-center gap-3 opacity-40 font-bold">
                  <Plus className="size-2.5" /> SESSIONS
                </h3>
                <Button variant="outline" size="sm" className="h-8 px-5 font-code text-[10px] tracking-widest uppercase border-border/60 shadow-sm bg-white rounded-full font-bold">+ ADD SESSION</Button>
              </div>
              <div className="bg-white border border-border/30 rounded-xl p-8 shadow-sm text-center">
                <p className="font-body text-base text-muted-foreground italic">Log each session to trace your progress through the material.</p>
              </div>
            </section>

            <section>
              <h3 className="readex-kicker flex items-center gap-3 mb-6 opacity-40 font-bold">
                <Plus className="size-2.5" /> AFTER COMPLETING
              </h3>
              <div className="bg-muted/5 border border-border/30 rounded-xl overflow-hidden shadow-sm">
                <CaptureRow label="CORE ARGUMENT" value={capture.after?.coreArgument} placeholder="The central thesis as understood post-consumption..." onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, coreArgument: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="WHAT HELD UP" value={capture.after?.heldUp} placeholder="Ideas that survived your skepticism" onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, heldUp: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="WHAT DIDN'T" value={capture.after?.didntHold} placeholder="Where it was wrong or incomplete" onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, didntHold: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="LASTING IDEA" value={capture.after?.lasting} placeholder="What is the one thing you'll take with you?" onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, lasting: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="BELIEF CHANGE" value={capture.after?.beliefChange} placeholder="How has your perspective shifted?" onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, beliefChange: val }, sessions: capture.sessions || [] })} />
                <CaptureRow label="CROSS-REFERENCES" value={capture.after?.crossRefs} placeholder="Other sources this connects to" onChange={(val) => updateCaptureDraft({ ...capture, after: { ...capture.after, crossRefs: val }, sessions: capture.sessions || [] })} />
              </div>
            </section>

            <div className="flex gap-4 pt-10 border-t border-border/30">
              <Button onClick={() => updateSelected({ capture })} className="bg-accent px-10 h-11 font-code text-[11px] tracking-widest uppercase shadow-lg shadow-accent/20 rounded-full font-bold">SAVE CAPTURE</Button>
              <Button variant="outline" onClick={handleDistill} disabled={isDistilling} className="h-11 px-10 font-code text-[11px] tracking-widest uppercase text-accent border-accent/20 shadow-sm bg-white rounded-full font-bold">
                {isDistilling ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                DISTILL POSITION
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="annotations">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
              <div className="space-y-8">
                <div className="flex gap-3">
                  <Select value={annotationDraft.type} onValueChange={(value) => setAnnotationDraft((prev) => ({ ...prev, type: value as Annotation['type'] }))}>
                    <SelectTrigger className="w-48 font-code text-[10px] uppercase h-11 border-border/60 bg-white shadow-sm rounded-full font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highlight" className="font-code text-[10px] uppercase">Highlight</SelectItem>
                      <SelectItem value="thought" className="font-code text-[10px] uppercase">Thought</SelectItem>
                      <SelectItem value="question" className="font-code text-[10px] uppercase">Question</SelectItem>
                      <SelectItem value="connection" className="font-code text-[10px] uppercase">Connection</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={annotationDraft.text} onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, text: event.target.value }))} placeholder="Extract highlight, thought, or connection..." className="font-body italic text-base h-11" />
                  <Button onClick={addAnnotation} size="sm" className="h-11 px-8 rounded-full font-bold">ADD</Button>
                </div>
                <div className="space-y-5">
                  {(selected.annotations || []).map((annotation) => (
                    <div key={annotation.id} className="rounded-xl border border-border/30 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="font-code text-[9px] uppercase tracking-widest bg-muted/5 border-border/40 rounded-full font-bold">
                          {annotation.type}
                        </Badge>
                        <time className="font-code text-[9px] text-muted-foreground/50 font-bold uppercase">{new Date(annotation.date).toLocaleDateString()}</time>
                      </div>
                      <p className="font-body italic leading-relaxed text-[17px] text-primary/90">"{annotation.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="space-y-6">
                <Button variant="outline" onClick={handleGenerateQuestions} disabled={isGeneratingQuestions} className="w-full h-12 font-code text-[11px] uppercase tracking-widest text-accent border-accent/20 bg-white shadow-sm rounded-full font-bold">
                  {isGeneratingQuestions ? <Loader2 className="size-4 mr-2 animate-spin" /> : <HelpCircle className="size-4 mr-2" />}
                  GENERATE REFLECTIONS
                </Button>
                <Card className="p-6 bg-muted/5 border-dashed border-border/60 rounded-xl">
                  <h4 className="readex-kicker mb-3 opacity-50 font-bold">Extraction Tips</h4>
                  <p className="text-sm font-body italic text-muted-foreground leading-relaxed">Focus on claims that challenge your current understanding. Label them clearly to aid later synthesis.</p>
                </Card>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-10">
            <div className="flex justify-between items-center">
              <h3 className="readex-kicker opacity-50 uppercase font-bold text-[11px]">{linkedInsights.length} POSITIONS ANCHORED HERE</h3>
              <Button onClick={() => setInsightOpen(true)} size="sm" className="bg-accent h-10 px-6 font-code text-[11px] tracking-widest uppercase shadow-lg shadow-accent/20 rounded-full font-bold">+ NEW POSITION</Button>
            </div>

            <div className="space-y-5">
              {linkedInsights.map((insight) => (
                <Card key={insight.id} className="p-8 border-border/40 bg-white group relative shadow-sm hover:shadow-md transition-shadow rounded-xl">
                  <h4 className="font-headline text-2xl font-bold italic mb-3 leading-tight text-primary">{insight.title}</h4>
                  <p className="font-body text-[17px] italic text-primary/80 mb-8 leading-relaxed">
                    {insight.description || insight.statement}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="secondary" className="font-code text-[9px] uppercase tracking-widest px-3 py-1 bg-muted/20 border-transparent text-muted-foreground rounded-full font-bold">
                        <BookOpen className="size-3 mr-2 opacity-40" />
                        {selected.title}
                      </Badge>
                      {(insight.tags || []).slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="font-code text-[9px] uppercase tracking-widest px-3 py-1 bg-muted/10 border-transparent text-muted-foreground/60 rounded-full font-bold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-6">
                      <time className="font-code text-[10px] text-muted-foreground/40 font-bold">{new Date(insight.dateCreated).toLocaleDateString()}</time>
                      <button 
                        onClick={() => onDeleteVaultEntry(insight.id)}
                        className="font-code text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 font-bold"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              {linkedInsights.length === 0 && (
                <div className="py-24 text-center opacity-30 bg-white rounded-xl border border-dashed border-border/50 shadow-sm">
                  <p className="font-headline text-2xl italic mb-3">No positions archived yet.</p>
                  <p className="font-body text-base">Turn your annotations into explicit positions using the "New Position" action.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-10">
            <h3 className="readex-kicker opacity-50 uppercase font-bold text-[11px]">POSITIONS LINKED TO THIS SOURCE</h3>
            <div className="space-y-5">
              {linkedInsights.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="group cursor-pointer hover:shadow-xl transition-all border-border/50 bg-white p-6 flex gap-6 shadow-sm rounded-xl"
                >
                  <div className="size-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                    <Triangle className="size-5 fill-current rotate-180" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="readex-kicker opacity-50 mb-1.5 font-bold">{entry.type?.toUpperCase() || 'BELIEF'}</div>
                    <h3 className="font-headline text-2xl font-bold italic leading-tight group-hover:text-accent transition-colors truncate text-primary">
                      {entry.title}
                    </h3>
                    
                    <div className="flex items-center gap-5 mt-6">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div 
                            key={n} 
                            className={cn(
                              'size-2 rounded-full shadow-sm', 
                              n <= (entry.confidence || 3) ? 'bg-accent' : 'bg-muted'
                            )} 
                          />
                        ))}
                      </div>
                      <Badge variant="secondary" className="font-code text-[9px] uppercase tracking-widest px-3 py-1 bg-emerald-100/40 text-emerald-700 border-emerald-200/50 rounded-full font-bold">
                        {entry.status || 'active'}
                      </Badge>
                      <div className="font-code text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                        {(entry.sourceIds || []).length} source{(entry.sourceIds || []).length !== 1 && 's'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {linkedInsights.length === 0 && (
                <div className="py-24 text-center opacity-30 bg-white rounded-xl border border-dashed border-border/50 shadow-sm">
                  <p className="font-headline text-2xl italic mb-3">No source links established.</p>
                  <p className="font-body text-base">Create a position or link one to this source to see it here.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <ConceptDetailDialog 
          name={conceptPopupName} 
          onClose={() => setConceptPopupName(null)}
          concepts={concepts}
          media={media}
          vault={vault}
          drafts={drafts}
          practices={practices}
          questions={questions}
          timeline={timeline}
        />

        <Dialog open={insightOpen} onOpenChange={setInsightOpen}>
          <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl">
            <DialogHeader><DialogTitle className="font-headline text-3xl italic">New Position</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="readex-kicker">Insight Title</Label>
                <Input value={insightDraft.title} onChange={(e) => setInsightDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief synthesis of the breakthrough..." />
              </div>
              <div className="space-y-2">
                <Label className="readex-kicker">Reasoning / Statement</Label>
                <Textarea value={insightDraft.body} onChange={(e) => setInsightDraft(prev => ({ ...prev, body: e.target.value }))} className="min-h-[140px]" placeholder="Elaborate on the discovery..." />
              </div>
              <div className="space-y-2">
                <Label className="readex-kicker">Concepts</Label>
                <ConceptTagPicker concepts={concepts} value={insightDraft.tags} onChange={(tags) => setInsightDraft(prev => ({ ...prev, tags }))} />
              </div>
            </div>
            <DialogFooter className="pt-6"><Button onClick={saveInsight} className="rounded-full px-10 h-11 font-bold">Archive Insight</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Capture books, films, articles, lectures, conversations, and other sources before they become understanding.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, author, tags..." className="w-72 pl-9 h-9" />
          </div>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90 h-9 px-6 shadow-md shadow-accent/20 rounded-full font-bold">
            <Plus className="size-4 mr-1.5" /> ADD MEDIA
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2.5 mb-12 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
            filter === 'all' 
              ? "bg-accent text-white border-accent" 
              : "bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5"
          )}
        >
          ALL
        </button>
        {MEDIA_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all whitespace-nowrap shadow-sm",
              filter === type 
                ? "bg-accent text-white border-accent" 
                : "bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5"
            )}
          >
            {MEDIA_LABELS[type] === 'Book' ? 'BOOKS' : MEDIA_LABELS[type].toUpperCase() + 'S'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
        {filtered.map((item) => (
          <Card key={item.id} className="cursor-pointer border-none shadow-none bg-transparent group" onClick={() => setSelectedId(item.id)}>
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-sm mb-5 bg-white flex items-center justify-center p-8 text-center border border-border/30 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all">
              <div className="size-12 bg-muted/20 rounded-lg flex items-center justify-center mb-4 shadow-inner">
                {React.createElement(MEDIA_ICONS_COMP[item.type], { className: "size-7 text-accent/40" })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="readex-kicker opacity-50 font-bold text-[9px]">{MEDIA_LABELS[item.type].toUpperCase()}</div>
              <h3 className="font-headline text-lg font-bold italic leading-snug group-hover:text-accent transition-colors line-clamp-2 text-primary">
                {item.title}
              </h3>
              <p className="readex-kicker text-muted-foreground truncate text-[9px] font-bold tracking-widest">{item.creator.toUpperCase()}</p>
              <div className="flex items-center justify-between pt-3">
                <Badge variant="outline" className="font-code text-[8px] uppercase tracking-widest px-2 py-0.5 bg-white border-border/60 shadow-sm rounded-full font-bold">
                  {item.status}
                </Badge>
                {item.annotations?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <MessageSquare className="size-3.5" />
                    <span className="font-code text-[10px] font-bold">{item.annotations.length}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Card 
          className="aspect-[2/3] rounded-xl border-2 border-dashed border-border/50 bg-white/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-all group shadow-sm hover:shadow-xl hover:-translate-y-2"
          onClick={() => openEditor()}
        >
          <div className="size-12 rounded-full bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md border border-border/30">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <div className="readex-kicker text-muted-foreground font-bold text-[10px]">ADD MEDIA</div>
        </Card>
      </div>

      <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
    </div>
  );
}

function CaptureRow({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder: string; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center border-b border-border/30 last:border-b-0 min-h-[70px] bg-white">
      <div className="w-60 px-8 shrink-0">
        <span className="font-code text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold">{label}</span>
      </div>
      <div className="flex-1 p-0 h-full flex items-center">
        <Textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent border-none shadow-none focus-visible:ring-0 font-body text-[17px] italic text-primary/90 placeholder:text-muted-foreground/30 py-5 h-auto min-h-0 resize-none rounded-none"
        />
      </div>
    </div>
  );
}

function MediaEditor({ open, onOpenChange, draft, setDraft, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Partial<Media>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Media>>>;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState('');
  const [locatorQuery, setLocatorQuery] = useState('');
  const [locatorResults, setLocatorResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const addTag = () => {
    if (!tagInput.trim()) return;
    const next = normalizeConceptTags([...(draft.tags || []), tagInput]);
    setDraft(prev => ({ ...prev, tags: next }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const next = (draft.tags || []).filter(t => conceptKey(t) !== conceptKey(tag));
    setDraft(prev => ({ ...prev, tags: normalizeConceptTags(next) }));
  };

  const applySourceResult = (result: NormalizedSourceResult) => {
    const patch = sourceResultToMediaPatch(result);
    setDraft((prev) => ({
      ...prev,
      ...patch,
      status: prev.status || 'Want to Read',
      tags: normalizeConceptTags([...(prev.tags || []), ...(patch.tags || [])]),
    }));
  };

  const handleLocateSource = useCallback(async () => {
    if (locatorQuery.trim().length < 2) return;
    setIsLocating(true);
    try {
      const results = await locateMediaMetadata({
        query: locatorQuery,
        mediaType: draft.type || 'book',
      });
      setLocatorResults((results as any).results || [results] || []);
      setShowDropdown(true);
    } catch (error) {
      console.error("Locator failed", error);
      const isQuotaError = (error as any).message?.includes('RESOURCE_EXHAUSTED') || (error as any).message?.includes('429');
      toast({
        variant: "destructive",
        title: "AI Locator Interrupted",
        description: isQuotaError
          ? "AI search limit reached. Please fill in details manually or check your AI Studio billing."
          : "Unable to search online databases at this time. Manual archival is still available.",
      });
      setShowDropdown(false);
    } finally {
      setIsLocating(false);
    }
  }, [locatorQuery, draft.type, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (locatorQuery.trim().length >= 3) {
        handleLocateSource();
      } else {
        setLocatorResults([]);
        setShowDropdown(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [locatorQuery, handleLocateSource]);

  const selectLocatedSource = (item: any) => {
    if (item.title) {
      setDraft(prev => ({
        ...prev,
        title: item.title || prev.title,
        creator: item.creator || item.author || prev.creator,
        year: item.year || prev.year,
        genre: item.genre || prev.genre,
        publisher: item.publisher || prev.publisher,
        description: item.description || prev.description,
        thumbnailUrl: item.thumbnailUrl || prev.thumbnailUrl,
        isbn: item.isbn || prev.isbn,
      }));
    } else if (item.volumeInfo) {
      const info = item.volumeInfo;
      const year = info.publishedDate ? info.publishedDate.substring(0, 4) : '';
      const isbn = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || info.industryIdentifiers?.[0]?.identifier || '';
      setDraft(prev => ({
        ...prev,
        title: info.title || prev.title,
        creator: info.authors?.join(', ') || prev.creator,
        year: year || prev.year,
        genre: info.categories?.join(', ') || prev.genre,
        publisher: info.publisher || prev.publisher,
        description: info.description || prev.description,
        thumbnailUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || prev.thumbnailUrl,
        isbn: isbn || prev.isbn,
      }));
    }
    setLocatorResults([]);
    setShowDropdown(false);
    setLocatorQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white font-body">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-4xl font-headline italic mb-2">Add to Library</DialogTitle>
              <p className="text-muted-foreground text-sm font-body italic">Search by title, paste a public URL, or enter source details manually.</p>
            </DialogHeader>

            <div className="space-y-8">
              <section className="bg-muted/5 p-5 rounded-xl border border-dashed border-border/60">
                <Label className="readex-kicker block mb-4 font-bold text-[10px] text-accent flex items-center gap-2">
                  <Globe className="size-3" /> INTELLECTUAL LOCATOR
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                    <Input 
                      placeholder={`Search ${MEDIA_LABELS[draft.type || 'book']} databases...`} 
                      value={locatorQuery}
                      onChange={(e) => setLocatorQuery(e.target.value)}
                      className="pl-9 h-11 text-sm italic rounded-full bg-white pr-10"
                      onFocus={() => locatorResults.length > 0 && setShowDropdown(true)}
                    />
                    {isLocating && <Loader2 className="absolute right-4 size-4 animate-spin text-accent" />}
                  </div>
                  <Button variant="outline" onClick={handleLocateSource} disabled={isLocating} className="h-10 px-6 rounded-full font-bold">
                    {isLocating ? <Loader2 className="size-4 animate-spin" /> : 'LOCATE'}
                  </Button>
                </div>
                {locatorResults.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border/20 pt-4 animate-fade-in-up">
                    {locatorResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectLocatedSource(item)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-md transition-all text-left group border border-transparent hover:border-border/40"
                      >
                        <div className="size-12 bg-muted/20 rounded shrink-0 overflow-hidden border border-border/20 flex items-center justify-center">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Globe className="size-5 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-headline font-bold italic truncate group-hover:text-accent">{item.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate uppercase font-code tracking-tighter">{item.creator} {item.year && `(${item.year})`}</div>
                        </div>
                        <Check className="size-3.5 opacity-0 group-hover:opacity-100 text-accent" />
                      </button>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setLocatorResults([])} className="w-full text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40">Clear Results</Button>
                  </div>
                )}
              </section>

              <section>
                <Label className="readex-kicker block mb-4 font-bold text-[10px]">MEDIA TYPE</Label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_TYPES.map((type) => {
                    const Icon = MEDIA_ICONS_COMP[type];
                    const isActive = draft.type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setDraft(prev => ({ ...prev, type }))}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-code text-[9px] font-bold uppercase tracking-widest shadow-sm",
                          isActive 
                            ? "bg-accent text-white border-accent" 
                            : "bg-white text-muted-foreground border-border/60 hover:border-accent hover:text-accent"
                        )}
                      >
                        <Icon className="size-3.5" />
                        {MEDIA_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">SOURCE TITLE</Label>
                  <Input 
                    value={draft.title || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    className="h-11 text-base italic"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">CREATOR / AUTHOR</Label>
                  <Input 
                    value={draft.creator || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, creator: e.target.value }))}
                    className="h-11 text-base italic"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">YEAR</Label>
                    <Input 
                      value={draft.year || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, year: e.target.value }))}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">GENRE / TOPIC</Label>
                    <Input 
                      value={draft.genre || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, genre: e.target.value }))}
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">PUBLISHER / PLATFORM</Label>
                  <Input 
                    value={draft.publisher || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, publisher: e.target.value }))}
                    className="h-11 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">ISBN / ISSN</Label>
                    <Input 
                      value={draft.isbn || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, isbn: e.target.value }))}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">DOI</Label>
                    <Input 
                      value={draft.doi || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, doi: e.target.value, externalIds: { ...prev.externalIds, doi: e.target.value } }))}
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">SOURCE URL</Label>
                  <Input
                    value={draft.url || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, url: e.target.value, externalIds: { ...prev.externalIds, url: e.target.value } }))}
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">CONCEPT TAGS</Label>
                  <div className="flex flex-wrap gap-2">
                    {(draft.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="px-4 py-1.5 font-code text-[9px] uppercase tracking-widest rounded-full border-border/60 bg-white shadow-sm font-bold">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-2 hover:text-destructive transition-colors"><X className="size-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="New concept tag..." 
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      className="h-11 text-sm rounded-full"
                    />
                    <Button variant="outline" onClick={addTag} className="h-11 font-code text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm border-border/60 rounded-full px-6">ADD</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">INTERNAL NOTES</Label>
                  <Textarea 
                    placeholder="Brief rationale for adding this source..."
                    value={draft.description || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[120px] resize-none p-4 italic text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">CONSUMPTION STATUS</Label>
                  <select 
                    value={draft.status || 'Want to Read'}
                    onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value as MediaStatus }))}
                    className="w-full h-11 rounded-full border border-border/60 bg-white px-5 text-sm font-body appearance-none focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                  >
                    {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-8 pt-4 bg-muted/10 border-t flex justify-end gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 px-8 font-code text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent rounded-full">CANCEL</Button>
          <Button onClick={onSave} className="h-11 px-10 bg-accent font-code text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-accent/20 rounded-full">ADD TO LIBRARY</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConceptDetailDialog({ name, onClose, concepts, media, vault, drafts, questions, timeline, practices }: {
  name: string | null;
  onClose: () => void;
  concepts: Concept[];
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
  practices: Practice[];
}) {
  const [activeTab, setActiveTab] = useState('sources');
  const related = useMemo(() => name ? conceptRelated(name, { media, insights: [], vault, drafts, questions, timeline, practices }) : null, [name, media, vault, drafts, questions, timeline, practices]);

  if (!name || !related) return null;

  const tabs = [
    { id: 'all', label: 'ALL', count: null },
    { id: 'sources', label: 'SOURCES', count: related.sources.length },
    { id: 'notes', label: 'NOTES', count: related.annotations.length },
    { id: 'ideas', label: 'IDEAS', count: (related.ideas || []).length },
    { id: 'questions', label: 'QUESTIONS', count: related.questions.length },
    { id: 'beliefs', label: 'BELIEFS', count: related.beliefs.length },
    { id: 'writing', label: 'WRITING', count: related.drafts.length },
    { id: 'practices', label: 'PRACTICES', count: related.practices.length },
    { id: 'evolution', label: 'EVOLUTION', count: related.events.length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'sources':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">INPUTS: SOURCES</h4>
            {related.sources.map(s => (
              <Card key={s.id} className="p-5 bg-white border-border/40 flex gap-5 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <div className="size-12 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 shadow-inner">
                  {React.createElement(MEDIA_ICONS_COMP[s.type] || BookOpen, { className: "size-6 text-accent/40" })}
                </div>
                <div>
                  <h5 className="font-headline font-bold text-xl leading-tight text-primary">{s.title}</h5>
                  <p className="text-xs font-body italic text-muted-foreground mt-1">{s.creator} · {s.type}</p>
                </div>
              </Card>
            ))}
            {related.sources.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked sources discovered.</p>}
          </div>
        );
      case 'notes':
        return (
          <div className="space-y-5">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">INPUTS: ANNOTATIONS</h4>
            {related.annotations.map((a, i) => (
              <Card key={i} className="p-6 bg-white border-border/40 shadow-sm rounded-xl">
                <Badge variant="outline" className="mb-3 font-code text-[9px] uppercase tracking-widest border-border/60 shadow-sm bg-white rounded-full font-bold">{a.type}</Badge>
                <p className="font-body italic text-base text-primary/90 leading-relaxed">"{a.text}"</p>
              </Card>
            ))}
            {related.annotations.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked annotations discovered.</p>}
          </div>
        );
      case 'ideas':
      case 'beliefs':
        const items = activeTab === 'ideas' ? (related.ideas || []) : related.beliefs;
        return (
          <div className="space-y-5">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">{activeTab.toUpperCase()}</h4>
            {items.map((item, i) => (
              <Card key={i} className="p-6 bg-white border-border/40 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <h5 className="font-headline font-bold text-xl italic mb-3 text-primary leading-tight">{item.title}</h5>
                <p className="font-body text-base text-muted-foreground leading-relaxed italic">{('description' in item ? item.description : item.body) || ''}</p>
              </Card>
            ))}
            {items.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked items discovered.</p>}
          </div>
        );
      case 'questions':
        return (
          <div className="space-y-5">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">INQUIRIES</h4>
            {related.questions.map((q, i) => (
              <Card key={i} className="p-6 bg-white border-border/40 shadow-sm rounded-xl">
                <p className="font-headline font-bold italic text-lg leading-relaxed text-primary">"{q.text}"</p>
                {q.answer && <p className="font-body text-base text-muted-foreground mt-4 border-t border-border/20 pt-4 italic leading-relaxed">{q.answer}</p>}
              </Card>
            ))}
            {related.questions.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked inquiries discovered.</p>}
          </div>
        );
      case 'writing':
        return (
          <div className="space-y-5">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">WORKS</h4>
            {related.drafts.map((d, i) => (
              <Card key={i} className="p-6 bg-white border-border/40 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-headline font-bold text-xl italic text-primary leading-tight">{d.title}</h5>
                  <Badge variant="outline" className="text-[9px] border-border/60 bg-white shadow-sm rounded-full font-bold uppercase tracking-widest">{d.status}</Badge>
                </div>
                <p className="text-[10px] font-code opacity-50 uppercase font-bold tracking-widest">{d.type}</p>
              </Card>
            ))}
            {related.drafts.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked works discovered.</p>}
          </div>
        );
      case 'practices':
        return (
          <div className="space-y-5">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">PRACTICES</h4>
            {related.practices.map((practice, i) => (
              <Card key={i} className="p-6 bg-white border-border/40 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-headline font-bold text-xl italic text-primary leading-tight">{practice.title}</h5>
                  <Badge variant="outline" className="text-[9px] border-border/60 bg-white shadow-sm rounded-full font-bold uppercase tracking-widest">{practice.status}</Badge>
                </div>
                <p className="font-body text-sm text-muted-foreground italic leading-relaxed">{practice.description || practice.type}</p>
              </Card>
            ))}
            {related.practices.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked practices discovered.</p>}
          </div>
        );
      case 'evolution':
        return (
          <div className="space-y-6">
            <h4 className="readex-kicker opacity-50 font-bold text-[10px]">EVOLUTION</h4>
            {related.events.map((e, i) => (
              <div key={i} className="flex gap-5 items-start border-l-2 border-accent/20 pl-6 py-2 transition-colors hover:border-accent">
                <div className="pt-2">
                   <div className="size-2.5 rounded-full bg-accent shadow-sm" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-headline font-bold text-lg italic text-primary">{e.entityTitle}</h5>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{e.eventType}: {e.reason}</p>
                  <time className="text-[10px] font-code opacity-40 font-bold uppercase tracking-widest">{new Date(e.date).toLocaleDateString()}</time>
                </div>
              </div>
            ))}
            {related.events.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked evolution events discovered.</p>}
          </div>
        );
      default:
        return <p className="text-sm italic text-muted-foreground text-center py-12 font-body">No linked content discovered for this filter.</p>;
    }
  };

  return (
    <Dialog open={!!name} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-[#FAFAF7] font-body">
        <div className="p-10">
          <DialogHeader className="mb-10">
            <DialogTitle className="text-5xl font-headline italic mb-2 text-primary/90 leading-tight">{name}</DialogTitle>
            <p className="text-muted-foreground text-sm font-body italic opacity-60">Complete audit of linked inputs and outputs for this conceptual node.</p>
          </DialogHeader>

          <div className="flex flex-wrap gap-2.5 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-2 rounded-full border transition-all font-code text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm",
                  activeTab === tab.id 
                    ? "bg-accent text-white border-accent shadow-md" 
                    : "bg-white text-muted-foreground border-border/60 hover:border-accent/40"
                )}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-muted/50 text-muted-foreground/60"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Separator className="bg-border/30 mb-10" />

          <ScrollArea className="h-[380px] pr-5">
            {renderContent()}
          </ScrollArea>
        </div>

        <div className="p-8 pt-4 bg-muted/5 border-t border-border/20 flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-11 px-10 font-code text-[11px] font-bold uppercase tracking-widest bg-white border-border/60 shadow-sm rounded-full">CLOSE AUDIT</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
