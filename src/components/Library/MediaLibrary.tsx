"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Edit, Plus, Search, Trash2, MessageSquare, X, Sparkles, Loader2, HelpCircle, Triangle, BookOpen, FileText } from 'lucide-react';
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
import type { Annotation, Concept, Media, MediaStatus, MediaType, VaultEntry, Draft, Question, TimelineEvent } from '@/lib/types';
import { MEDIA_LABELS, MEDIA_TYPES, MEDIA_ICONS_COMP, normalizeConceptTags, today, uid, conceptKey, conceptRelated } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { distillInsightsFromMedia } from '@/ai/flows/distill-insights-from-media';
import { generateReflectiveQuestions } from '@/ai/flows/generate-reflective-questions-flow';

interface MediaLibraryProps {
  media: Media[];
  concepts: Concept[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
  onAddMedia: (data: Partial<Media>) => void;
  onUpdateMedia: (media: Media) => void;
  onDeleteMedia: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
  onCreateIdea: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
  onDeleteVaultEntry: (id: string) => void;
}

const statuses: MediaStatus[] = ['Want to Read', 'Consuming', 'Finished', 'Paused', 'Abandoned'];

export function MediaLibrary({ 
  media, 
  concepts, 
  vault, 
  drafts,
  questions,
  timeline,
  onAddMedia, 
  onUpdateMedia, 
  onDeleteMedia, 
  onAddConcept,
  onCreateIdea,
  onDeleteVaultEntry
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
  const filtered = useMemo(() => media.filter((item) => {
    const typeOk = filter === 'all' || item.type === filter;
    const query = `${item.title} ${item.creator} ${(item.tags || []).join(' ')}`.toLowerCase();
    return typeOk && (!searchQuery || query.includes(searchQuery.toLowerCase()));
  }), [filter, media, searchQuery]);

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

  const addAnnotation = () => {
    if (!selected || !annotationDraft.text.trim()) return;
    const annotation: Annotation = { id: uid(), type: annotationDraft.type, text: annotationDraft.text.trim(), date: today(), conceptTags: selected.tags };
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
      updateSelected({ capture: { ...selected.capture, after: { ...selected.capture.after, coreArgument: coreClaim }, sessions: selected.capture.sessions || [] } });
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
        conceptTags: selected.tags
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
    
    return (
      <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedId(null)} className="font-code text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center">
              &lt; LIBRARY
            </button>
            <span className="font-code text-[11px] uppercase tracking-widest text-primary/30">/</span>
            <span className="font-code text-[11px] uppercase tracking-widest text-primary/80">
              {MEDIA_LABELS[selected.type]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selected.status} onValueChange={(value) => updateSelected({ status: value as MediaStatus })}>
              <SelectTrigger className="w-40 font-code text-[10px] uppercase h-9 bg-white shadow-sm border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status} className="font-code text-[10px] uppercase">{status}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => openEditor(selected)} className="h-9 px-6 font-code text-[10px] tracking-widest uppercase border-border/60 shadow-sm bg-white">EDIT</Button>
            <Button variant="outline" size="sm" onClick={() => { onDeleteMedia(selected.id); setSelectedId(null); }} className="h-9 px-6 font-code text-[10px] tracking-widest uppercase text-destructive border-destructive/20 hover:bg-destructive/10 shadow-sm bg-white">DELETE</Button>
          </div>
        </header>

        <div className="bg-white border border-border/50 rounded-lg p-8 mb-10 flex gap-8 shadow-sm">
          <div className="size-48 bg-accent/5 rounded shrink-0 flex items-center justify-center border border-border/30 overflow-hidden">
            {selected.thumbnailUrl ? (
              <img src={selected.thumbnailUrl} alt={selected.title} className="w-full h-full object-cover" />
            ) : (
              <div className="size-16 rounded bg-accent/10 flex items-center justify-center">
                {React.createElement(MEDIA_ICONS_COMP[selected.type], { className: "size-8 text-accent/40" })}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-headline text-4xl font-bold mb-2">{selected.title}</h1>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-body text-lg italic text-muted-foreground">{selected.creator}</span>
              {selected.year && <span className="font-code text-xs text-muted-foreground/40">{selected.year}</span>}
            </div>
            <p className="font-body text-base italic text-primary/80 mb-6 max-w-2xl leading-relaxed">
              {selected.description || "A placeholder for the central thesis or importance of this scholarly source."}
            </p>
            <div className="flex flex-wrap gap-2">
              {(selected.tags || []).map(tag => (
                <button
                  key={tag}
                  onClick={() => setConceptPopupName(tag)}
                  className="inline-flex items-center rounded-full border px-3 py-1 font-code text-[9px] uppercase tracking-[0.15em] bg-white text-muted-foreground border-border/60 shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/20 transition-all"
                >
                  {tag}
                </button>
              ))}
              <Badge variant="outline" className="font-code text-[9px] uppercase tracking-[0.15em] px-3 py-1 bg-white border-border/60 shadow-sm">
                {selected.annotations?.length || 0} NOTES
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="capture" className="w-full">
          <TabsList className="bg-transparent border-b border-border/50 rounded-none h-12 w-full justify-start gap-8 p-0 mb-8">
            <TabsTrigger value="capture" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full">CAPTURE</TabsTrigger>
            <TabsTrigger value="annotations" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full">ANNOTATIONS</TabsTrigger>
            <TabsTrigger value="insights" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full">INSIGHTS</TabsTrigger>
            <TabsTrigger value="connections" className="readex-kicker data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none bg-transparent px-0 h-full">CONNECTIONS</TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-12">
            <p className="font-body text-xs text-muted-foreground italic mb-8">
              All capture is saved automatically. This stays attached to this {selected.type} permanently.
            </p>

            <section>
              <h3 className="readex-kicker flex items-center gap-2 mb-4 opacity-40">
                <Plus className="size-2" /> BEFORE YOU START
              </h3>
              <div className="bg-muted/5 border border-border/30 rounded-lg overflow-hidden shadow-sm">
                <CaptureRow label="PRIOR BELIEFS" value={selected.capture?.before?.priorBeliefs} placeholder="What do I already believe about this topic?" onChange={(val) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, priorBeliefs: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="EXPECTATION" value={selected.capture?.before?.expectation} placeholder="What am I hoping this challenges or confirms?" onChange={(val) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, expectation: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="OPEN QUESTION" value={selected.capture?.before?.openQuestion} placeholder="What does success cost when I define it too narrowly?" onChange={(val) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, openQuestion: val }, sessions: selected.capture?.sessions || [] } })} />
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="readex-kicker flex items-center gap-2 opacity-40">
                  <Plus className="size-2" /> SESSIONS
                </h3>
                <Button variant="outline" size="sm" className="h-7 px-3 font-code text-[9px] tracking-widest uppercase border-border/60 shadow-sm bg-white">+ ADD SESSION</Button>
              </div>
              <div className="bg-white border border-border/30 rounded-lg p-6 shadow-sm">
                <p className="font-body text-sm text-muted-foreground italic">Log each reading or listening session.</p>
              </div>
            </section>

            <section>
              <h3 className="readex-kicker flex items-center gap-2 mb-4 opacity-40">
                <Plus className="size-2" /> AFTER COMPLETING
              </h3>
              <div className="bg-muted/5 border border-border/30 rounded-lg overflow-hidden shadow-sm">
                <CaptureRow label="CORE ARGUMENT" value={selected.capture?.after?.coreArgument} placeholder="The central thesis as understood post-consumption..." onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, coreArgument: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="WHAT HELD UP" value={selected.capture?.after?.heldUp} placeholder="Ideas that survived your skepticism" onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, heldUp: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="WHAT DIDN'T" value={selected.capture?.after?.didntHold} placeholder="Where it was wrong or incomplete" onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, didntHold: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="LASTING IDEA" value={selected.capture?.after?.lasting} placeholder="Design life around games that expand agency and relationship." onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, lasting: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="BELIEF CHANGE" value={selected.capture?.after?.beliefChange} placeholder="I trust renewable commitments more than final victories." onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, beliefChange: val }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureRow label="CROSS-REFERENCES" value={selected.capture?.after?.crossRefs} placeholder="Other sources this connects to" onChange={(val) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, crossRefs: val }, sessions: selected.capture?.sessions || [] } })} />
              </div>
            </section>

            <div className="flex gap-4 pt-8 border-t border-border/30">
              <Button className="bg-accent px-8 h-10 font-code text-[10px] tracking-widest uppercase shadow-md shadow-accent/20">SAVE CAPTURE</Button>
              <Button variant="outline" onClick={handleDistill} disabled={isDistilling} className="h-10 px-8 font-code text-[10px] tracking-widest uppercase text-accent border-accent/20 shadow-sm bg-white">
                {isDistilling ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
                DISTILL → INSIGHT
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="annotations">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Select value={annotationDraft.type} onValueChange={(value) => setAnnotationDraft((prev) => ({ ...prev, type: value as Annotation['type'] }))}>
                    <SelectTrigger className="w-40 font-code text-[10px] uppercase h-10 border-border/60 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highlight" className="font-code text-[10px] uppercase">Highlight</SelectItem>
                      <SelectItem value="thought" className="font-code text-[10px] uppercase">Thought</SelectItem>
                      <SelectItem value="question" className="font-code text-[10px] uppercase">Question</SelectItem>
                      <SelectItem value="connection" className="font-code text-[10px] uppercase">Connection</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={annotationDraft.text} onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, text: event.target.value }))} placeholder="Extract highlight, thought, or connection..." className="font-body italic text-sm" />
                  <Button onClick={addAnnotation} size="sm" className="h-10 px-6">ADD</Button>
                </div>
                <div className="space-y-4">
                  {(selected.annotations || []).map((annotation) => (
                    <div key={annotation.id} className="rounded-lg border border-border/30 bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="font-code text-[9px] uppercase tracking-widest bg-muted/5 border-border/40">
                          {annotation.type}
                        </Badge>
                        <time className="font-code text-[8px] text-muted-foreground">{new Date(annotation.date).toLocaleDateString()}</time>
                      </div>
                      <p className="font-body italic leading-relaxed text-[16px] text-primary/80">"{annotation.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="space-y-6">
                <Button variant="outline" onClick={handleGenerateQuestions} disabled={isGeneratingQuestions} className="w-full h-10 font-code text-[10px] uppercase tracking-widest text-accent border-accent/20 bg-white shadow-sm">
                  {isGeneratingQuestions ? <Loader2 className="size-4 mr-2 animate-spin" /> : <HelpCircle className="size-4 mr-2" />}
                  GENERATE REFLECTIONS
                </Button>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="readex-kicker opacity-50 uppercase">{linkedInsights.length} INSIGHTS FROM THIS SOURCE</h3>
              <Button onClick={() => setInsightOpen(true)} size="sm" className="bg-accent h-8 px-4 font-code text-[10px] tracking-widest uppercase shadow-md shadow-accent/20">+ NEW INSIGHT</Button>
            </div>

            <div className="space-y-4">
              {linkedInsights.map((insight) => (
                <Card key={insight.id} className="p-6 border-border/40 bg-white group relative shadow-sm">
                  <h4 className="font-headline text-xl font-bold italic mb-2 leading-tight">{insight.title}</h4>
                  <p className="font-body text-base italic text-primary/70 mb-6 leading-relaxed">
                    {insight.description || insight.statement}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-tighter px-2 py-0.5 bg-muted/20 border-transparent text-muted-foreground">
                        <BookOpen className="size-2.5 mr-1 opacity-40" />
                        {selected.title}
                      </Badge>
                      {(insight.tags || []).slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-tighter px-2 py-0.5 bg-muted/10 border-transparent text-muted-foreground/60">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <time className="font-code text-[10px] text-muted-foreground/40">{new Date(insight.dateCreated).toLocaleDateString()}</time>
                      <button 
                        onClick={() => onDeleteVaultEntry(insight.id)}
                        className="font-code text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              {linkedInsights.length === 0 && (
                <div className="py-20 text-center opacity-30 bg-white rounded-lg border border-dashed border-border/50 shadow-sm">
                  <p className="font-headline text-xl italic mb-2">No breakthroughs archived yet.</p>
                  <p className="font-body text-sm">Turn your annotations into explicit claims using the "New Insight" action.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="space-y-8">
            <h3 className="readex-kicker opacity-50 uppercase">VAULT ENTRIES LINKED TO THIS SOURCE</h3>
            <div className="space-y-4">
              {linkedInsights.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all border-border/50 bg-white p-4 flex gap-4 shadow-sm"
                >
                  <div className="size-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
                    <Triangle className="size-4 fill-current rotate-180" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="readex-kicker opacity-50 mb-1">{entry.type?.toUpperCase() || 'BELIEF'}</div>
                    <h3 className="font-headline text-lg font-bold italic leading-tight group-hover:text-accent transition-colors truncate">
                      {entry.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div 
                            key={n} 
                            className={cn(
                              'size-1.5 rounded-full', 
                              n <= (entry.confidence || 3) ? 'bg-accent' : 'bg-muted'
                            )} 
                          />
                        ))}
                      </div>
                      <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-tighter px-2 py-0 bg-emerald-100/40 text-emerald-700 border-emerald-200/50">
                        {entry.status || 'active'}
                      </Badge>
                      <div className="font-code text-[9px] text-muted-foreground/60">
                        {(entry.sourceIds || []).length} source{(entry.sourceIds || []).length !== 1 && 's'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {linkedInsights.length === 0 && (
                <div className="py-20 text-center opacity-30 bg-white rounded-lg border border-dashed border-border/50 shadow-sm">
                  <p className="font-headline text-xl italic mb-2">No vault connections established.</p>
                  <p className="font-body text-sm">Create an insight or anchor a belief to this source to see it here.</p>
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
          questions={questions}
          timeline={timeline}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Capture books, films, articles, lectures, conversations, and other sources before they become understanding.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, author, tags..." className="w-72 pl-9 h-9" />
          </div>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90 h-9 shadow-md shadow-accent/20">
            <Plus className="size-4 mr-1.5" /> ADD MEDIA
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all",
            filter === 'all' 
              ? "bg-accent text-white shadow-sm" 
              : "bg-white text-muted-foreground border border-border/60 shadow-sm hover:text-foreground hover:bg-muted/5"
          )}
        >
          ALL
        </button>
        {MEDIA_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              "px-3 py-1.5 rounded text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all whitespace-nowrap",
              filter === type 
                ? "bg-accent text-white shadow-sm" 
                : "bg-white text-muted-foreground border border-border/60 shadow-sm hover:text-foreground hover:bg-muted/5"
            )}
          >
            {MEDIA_LABELS[type] === 'Book' ? 'BOOKS' : MEDIA_LABELS[type].toUpperCase() + 'S'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
        {filtered.map((item) => (
          <Card key={item.id} className="cursor-pointer border-none shadow-none bg-transparent group" onClick={() => setSelectedId(item.id)}>
            <div className="aspect-[2/3] rounded-md overflow-hidden shadow-sm mb-4 bg-white flex items-center justify-center p-6 text-center border border-border/30 group-hover:shadow-xl group-hover:-translate-y-1 transition-all">
              <div className="size-10 bg-muted/20 rounded-md flex items-center justify-center mb-4">
                {React.createElement(MEDIA_ICONS_COMP[item.type], { className: "size-6 text-accent/40" })}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="readex-kicker opacity-50">{MEDIA_LABELS[item.type]}</div>
              <h3 className="font-headline text-base font-bold italic leading-tight group-hover:text-accent transition-colors line-clamp-2">
                {item.title}
              </h3>
              <p className="readex-kicker text-muted-foreground truncate">{item.creator}</p>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter px-1.5 py-0 bg-white border-border/60 shadow-sm">
                  {item.status}
                </Badge>
                {item.annotations?.length > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground/60">
                    <MessageSquare className="size-3" />
                    <span className="font-code text-[9px]">{item.annotations.length}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Card 
          className="aspect-[2/3] rounded-md border-2 border-dashed border-border/50 bg-white/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-colors group shadow-sm"
          onClick={() => openEditor()}
        >
          <div className="size-10 rounded-full bg-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border border-border/30">
            <Plus className="size-5 text-muted-foreground" />
          </div>
          <div className="readex-kicker text-muted-foreground">ADD MEDIA</div>
        </Card>
      </div>

      <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
      
      <ConceptDetailDialog 
        name={conceptPopupName} 
        onClose={() => setConceptPopupName(null)}
        concepts={concepts}
        media={media}
        vault={vault}
        drafts={drafts}
        questions={questions}
        timeline={timeline}
      />
    </div>
  );
}

function CaptureRow({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder: string; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center border-b border-border/30 last:border-b-0 min-h-[60px] bg-white">
      <div className="w-56 px-6 shrink-0">
        <span className="font-code text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{label}</span>
      </div>
      <div className="flex-1 p-0 h-full flex items-center">
        <Textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent border-none shadow-none focus-visible:ring-0 font-body text-base italic text-primary/80 placeholder:text-muted-foreground/30 py-4 h-auto min-h-0 resize-none"
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
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    if (!tagInput.trim()) return;
    const next = normalizeConceptTags([...(draft.tags || []), tagInput]);
    setDraft(prev => ({ ...prev, tags: next }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const next = normalizeConceptTags((draft.tags || []).filter(t => conceptKey(t) !== conceptKey(tag)));
    setDraft(prev => ({ ...prev, tags: next }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white font-body">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-headline italic mb-1">Add to Library</DialogTitle>
              <p className="text-muted-foreground text-xs font-body">Books and videos: search or paste URL. Other types: enter manually.</p>
            </DialogHeader>

            <div className="space-y-6">
              <section>
                <Label className="readex-kicker block mb-3">TYPE</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MEDIA_TYPES.map((type) => {
                    const Icon = MEDIA_ICONS_COMP[type];
                    const isActive = draft.type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setDraft(prev => ({ ...prev, type }))}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all font-code text-[9px] font-bold uppercase tracking-widest",
                          isActive 
                            ? "bg-accent text-white border-accent shadow-sm" 
                            : "bg-white text-muted-foreground border-border/60 hover:border-accent hover:text-accent shadow-sm"
                        )}
                      >
                        <Icon className="size-3" />
                        {MEDIA_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <Label className="readex-kicker block mb-3 uppercase">SEARCH {MEDIA_LABELS[draft.type || 'book']?.toUpperCase()}S</Label>
                <div className="flex gap-2">
                  <Input placeholder="Title or author..." className="h-10 flex-1" />
                  <Button className="h-10 px-6 bg-accent font-code text-xs font-bold uppercase tracking-[0.14em] shadow-md shadow-accent/20">SEARCH</Button>
                </div>
              </section>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border/40"></div>
                <span className="flex-shrink mx-4 font-code text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">DETAILS</span>
                <div className="flex-grow border-t border-border/40"></div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">TITLE</Label>
                  <Input 
                    value={draft.title || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">AUTHOR</Label>
                  <Input 
                    value={draft.creator || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, creator: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="readex-kicker uppercase opacity-50">YEAR</Label>
                    <Input 
                      value={draft.year || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, year: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="readex-kicker uppercase opacity-50">GENRE / TOPIC</Label>
                    <Input 
                      value={draft.genre || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, genre: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="readex-kicker uppercase opacity-50">CONCEPT TAGS</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(draft.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="px-2 py-0.5 font-code text-[9px] uppercase tracking-wider rounded border-border/60 bg-white shadow-sm">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1.5 hover:text-destructive"><X className="size-2.5" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="New concept tag..." 
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button variant="outline" onClick={addTag} className="h-10 font-code text-[9px] font-bold uppercase tracking-widest bg-white shadow-sm border-border/60">ADD</Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">NOTES</Label>
                  <Textarea 
                    placeholder="Quick notes about why you added this..."
                    value={draft.description || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px] resize-none p-3"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">STATUS</Label>
                  <select 
                    value={draft.status || 'Want to Read'}
                    onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value as MediaStatus }))}
                    className="w-full h-10 rounded-md border border-border/60 bg-white px-3 text-sm font-body appearance-none focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                  >
                    {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 pt-3 bg-muted/10 border-t flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-6 font-code text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent">CANCEL</Button>
          <Button onClick={onSave} className="h-10 px-8 bg-accent font-code text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20">ADD TO LIBRARY</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConceptDetailDialog({ name, onClose, concepts, media, vault, drafts, questions, timeline }: {
  name: string | null;
  onClose: () => void;
  concepts: Concept[];
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
}) {
  const [activeTab, setActiveTab] = useState('sources');
  const related = useMemo(() => name ? conceptRelated(name, { media, insights: [], vault, drafts, questions, timeline }) : null, [name, media, vault, drafts, questions, timeline]);

  if (!name || !related) return null;

  const tabs = [
    { id: 'all', label: 'ALL', count: null },
    { id: 'sources', label: 'SOURCES', count: related.sources.length },
    { id: 'notes', label: 'NOTES', count: related.annotations.length },
    { id: 'ideas', label: 'IDEAS', count: (related.ideas || []).length },
    { id: 'questions', label: 'QUESTIONS', count: related.questions.length },
    { id: 'beliefs', label: 'BELIEFS', count: related.beliefs.length },
    { id: 'writing', label: 'WRITING', count: related.drafts.length },
    { id: 'evolution', label: 'EVOLUTION', count: related.events.length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'sources':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">INPUTS: SOURCES</h4>
            {related.sources.map(s => (
              <Card key={s.id} className="p-4 bg-white border-border/40 flex gap-4 shadow-sm">
                <div className="size-10 rounded bg-muted/20 flex items-center justify-center shrink-0">
                  {React.createElement(MEDIA_ICONS_COMP[s.type] || BookOpen, { className: "size-5 text-accent/40" })}
                </div>
                <div>
                  <h5 className="font-headline font-bold text-lg leading-tight">{s.title}</h5>
                  <p className="text-xs font-body italic text-muted-foreground">{s.creator} · {s.type}</p>
                </div>
              </Card>
            ))}
            {related.sources.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked sources discovered.</p>}
          </div>
        );
      case 'notes':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">INPUTS: ANNOTATIONS</h4>
            {related.annotations.map((a, i) => (
              <Card key={i} className="p-4 bg-white border-border/40 shadow-sm">
                <Badge variant="outline" className="mb-2 font-code text-[8px] uppercase border-border/60 shadow-sm bg-white">{a.type}</Badge>
                <p className="font-body italic text-sm text-primary/80 leading-relaxed">"{a.text}"</p>
              </Card>
            ))}
            {related.annotations.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked annotations discovered.</p>}
          </div>
        );
      case 'ideas':
      case 'beliefs':
        const items = activeTab === 'ideas' ? (related.ideas || []) : related.beliefs;
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">{activeTab.toUpperCase()}</h4>
            {items.map((item, i) => (
              <Card key={i} className="p-4 bg-white border-border/40 shadow-sm">
                <h5 className="font-headline font-bold text-lg italic mb-2">{item.title}</h5>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.description || (item as any).body}</p>
              </Card>
            ))}
            {items.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked items discovered.</p>}
          </div>
        );
      case 'questions':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">INQUIRIES</h4>
            {related.questions.map((q, i) => (
              <Card key={i} className="p-4 bg-white border-border/40 shadow-sm">
                <p className="font-headline font-bold italic text-base leading-relaxed">"{q.text}"</p>
                {q.answer && <p className="font-body text-sm text-muted-foreground mt-2 border-t pt-2 italic">{q.answer}</p>}
              </Card>
            ))}
            {related.questions.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked inquiries discovered.</p>}
          </div>
        );
      case 'writing':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">WORKS</h4>
            {related.drafts.map((d, i) => (
              <Card key={i} className="p-4 bg-white border-border/40 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <h5 className="font-headline font-bold text-lg italic">{d.title}</h5>
                  <Badge variant="outline" className="text-[8px] border-border/60 bg-white shadow-sm">{d.status}</Badge>
                </div>
                <p className="text-xs font-code opacity-50 uppercase">{d.type}</p>
              </Card>
            ))}
            {related.drafts.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked works discovered.</p>}
          </div>
        );
      case 'evolution':
        return (
          <div className="space-y-4">
            <h4 className="readex-kicker opacity-50">EVOLUTION</h4>
            {related.events.map((e, i) => (
              <div key={i} className="flex gap-4 items-start border-l-2 border-accent/20 pl-4 py-1">
                <div className="pt-1">
                   <div className="size-2 rounded-full bg-accent" />
                </div>
                <div>
                  <h5 className="font-headline font-bold text-base italic">{e.entityTitle}</h5>
                  <p className="text-xs text-muted-foreground">{e.eventType}: {e.reason}</p>
                  <time className="text-[9px] font-code opacity-40">{new Date(e.date).toLocaleDateString()}</time>
                </div>
              </div>
            ))}
            {related.events.length === 0 && <p className="text-sm italic text-muted-foreground text-center py-8">No linked evolution events discovered.</p>}
          </div>
        );
      default:
        return <p className="text-sm italic text-muted-foreground text-center py-8">No linked content discovered for this filter.</p>;
    }
  };

  return (
    <Dialog open={!!name} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-[#FAFAF7] font-body">
        <div className="p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-4xl font-headline italic mb-1 text-primary/90">{name}</DialogTitle>
            <p className="text-muted-foreground text-xs font-body italic">Linked inputs and outputs for this concept</p>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full border transition-all font-code text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                  activeTab === tab.id 
                    ? "bg-accent text-white border-accent shadow-md" 
                    : "bg-white text-muted-foreground border-border/60 hover:border-accent/40 shadow-sm"
                )}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[8px]",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-muted/50 text-muted-foreground/60"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Separator className="bg-border/30 mb-8" />

          <ScrollArea className="h-[340px] pr-4">
            {renderContent()}
          </ScrollArea>
        </div>

        <div className="p-8 pt-4 bg-muted/5 border-t border-border/20 flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-10 px-8 font-code text-[10px] font-bold uppercase tracking-widest bg-white border-border/60 shadow-sm">CLOSE</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
