
"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Edit, Plus, Search, Trash2, MessageSquare, X, Sparkles, Loader2, HelpCircle } from 'lucide-react';
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
import type { Annotation, Concept, Media, MediaStatus, MediaType, VaultEntry } from '@/lib/types';
import { MEDIA_LABELS, MEDIA_TYPES, MEDIA_ICONS_COMP, normalizeConceptTags, today, uid, conceptKey } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { distillInsightsFromMedia } from '@/ai/flows/distill-insights-from-media';
import { generateReflectiveQuestions } from '@/ai/flows/generate-reflective-questions-flow';

interface MediaLibraryProps {
  media: Media[];
  concepts: Concept[];
  vault: VaultEntry[];
  onAddMedia: (data: Partial<Media>) => void;
  onUpdateMedia: (media: Media) => void;
  onDeleteMedia: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const statuses: MediaStatus[] = ['Want to Read', 'Consuming', 'Finished', 'Paused', 'Abandoned'];

export function MediaLibrary({ media, concepts, vault, onAddMedia, onUpdateMedia, onDeleteMedia, onAddConcept }: MediaLibraryProps) {
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Media>>({ type: 'book', title: '', creator: '', status: 'Want to Read', tags: [] });
  const [annotationDraft, setAnnotationDraft] = useState({ type: 'thought' as Annotation['type'], text: '' });
  const [isDistilling, setIsDistilling] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
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
      const questions = await generateReflectiveQuestions({
        mediaTitle: selected.title,
        beforePriorBeliefs: selected.capture?.before?.priorBeliefs,
        beforeExpectation: selected.capture?.before?.expectation,
        beforeOpenQuestion: selected.capture?.before?.openQuestion,
        afterCoreArgument: selected.capture?.after?.coreArgument,
        afterLastingIdea: selected.capture?.after?.lasting,
        afterBeliefChange: selected.capture?.after?.beliefChange,
      });
      
      const newAnnotations: Annotation[] = questions.map(q => ({
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

  if (selected) {
    const linkedBeliefs = vault.filter((entry) => (entry.sourceIds || []).includes(selected.id));
    return (
      <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-6xl mx-auto w-full font-body">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setSelectedId(null)} className="h-8 font-code text-[10px] uppercase tracking-widest"><ArrowLeft className="size-4 mr-2" /> Library</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDistill} disabled={isDistilling} className="h-8 font-code text-[10px] uppercase tracking-widest text-accent border-accent/20 hover:bg-accent/10">
              {isDistilling ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Sparkles className="size-3.5 mr-2" />}
              Distill Claim
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateQuestions} disabled={isGeneratingQuestions} className="h-8 font-code text-[10px] uppercase tracking-widest text-accent border-accent/20 hover:bg-accent/10">
              {isGeneratingQuestions ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <HelpCircle className="size-3.5 mr-2" />}
              Reflect
            </Button>
            <Button variant="outline" onClick={() => openEditor(selected)} className="h-8"><Edit className="size-4 mr-2" /> Edit</Button>
            <Button variant="destructive" onClick={() => { onDeleteMedia(selected.id); setSelectedId(null); }} className="h-8"><Trash2 className="size-4 mr-2" /> Delete</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          <Card className="p-0 overflow-hidden h-fit border-border/50 shadow-sm bg-white">
            <div className="aspect-[2/3] bg-muted/30 flex items-center justify-center text-center p-8">
              <div className="space-y-4">
                <div className="readex-kicker text-muted-foreground/60">{MEDIA_LABELS[selected.type]}</div>
                <h2 className="font-headline text-2xl font-bold italic leading-tight text-primary">{selected.title}</h2>
                <div className="readex-kicker">{selected.creator}</div>
              </div>
            </div>
            <div className="p-5 border-t border-border/40">
              <Label className="readex-kicker block mb-2 opacity-50">Consumption Status</Label>
              <Select value={selected.status} onValueChange={(value) => updateSelected({ status: value as MediaStatus })}>
                <SelectTrigger className="font-code text-[10px] uppercase tracking-wider h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status} className="font-code text-[10px] uppercase">{status}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 border-border/40 bg-white">
              <h3 className="readex-kicker mb-4 opacity-50">Concept Tags</h3>
              <ConceptTagPicker concepts={concepts} value={selected.tags || []} onChange={(tags) => updateSelected({ tags })} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
            </Card>

            <Card className="p-6 border-border/40 bg-white">
              <h3 className="readex-kicker mb-6 opacity-50">Investigation Capture</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CaptureField label="Open Question" value={selected.capture?.before?.openQuestion} onChange={(value) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, openQuestion: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Hypothesis / Working Answer" value={selected.capture?.before?.openAnswer} onChange={(value) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, openAnswer: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Core Argument Identified" value={selected.capture?.after?.coreArgument} onChange={(value) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, coreArgument: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Belief or Principle Change" value={selected.capture?.after?.beliefChange} onChange={(value) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, beliefChange: value }, sessions: selected.capture?.sessions || [] } })} />
              </div>
            </Card>

            <Card className="p-6 border-border/40 bg-white">
              <h3 className="readex-kicker mb-4 opacity-50">Annotations & Excerpts</h3>
              <div className="flex gap-2 mb-6">
                <Select value={annotationDraft.type} onValueChange={(value) => setAnnotationDraft((prev) => ({ ...prev, type: value as Annotation['type'] }))}>
                  <SelectTrigger className="w-40 font-code text-[10px] uppercase h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight" className="font-code text-[10px] uppercase">Highlight</SelectItem>
                    <SelectItem value="thought" className="font-code text-[10px] uppercase">Thought</SelectItem>
                    <SelectItem value="question" className="font-code text-[10px] uppercase">Question</SelectItem>
                    <SelectItem value="connection" className="font-code text-[10px] uppercase">Connection</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={annotationDraft.text} onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, text: event.target.value }))} placeholder="Extract highlight, thought, or connection..." className="font-body italic text-sm" />
                <Button onClick={addAnnotation} size="sm" className="h-9 px-6">ADD</Button>
              </div>
              <div className="space-y-3">
                {(selected.annotations || []).map((annotation) => (
                  <div key={annotation.id} className="rounded-md border border-border/30 bg-muted/10 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="font-code text-[9px] uppercase tracking-widest bg-white">{annotation.type}</Badge>
                      <time className="font-code text-[8px] text-muted-foreground">{new Date(annotation.date).toLocaleDateString()}</time>
                    </div>
                    <p className="font-body italic leading-relaxed text-[15px] text-primary/80">"{annotation.text}"</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-border/40 bg-white">
              <h3 className="readex-kicker mb-4 opacity-50">Linked Positions</h3>
              <div className="space-y-2">
                {linkedBeliefs.length ? linkedBeliefs.map((entry) => (
                  <div key={entry.id} className="rounded border border-border/20 bg-muted/5 p-3 text-sm font-headline italic hover:text-accent cursor-pointer transition-colors">
                    {entry.title}
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic">No formal positions linked to this source yet.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
        <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
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
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, author, tags..." className="w-72 pl-9 bg-muted/40 font-code text-[11px] h-9" />
          </div>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90">
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
              : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
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
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {MEDIA_LABELS[type] === 'Book' ? 'BOOKS' : MEDIA_LABELS[type].toUpperCase() + 'S'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
        {filtered.map((item) => (
          <Card key={item.id} className="cursor-pointer border-none shadow-none bg-transparent group" onClick={() => setSelectedId(item.id)}>
            <div className="aspect-[2/3] rounded-md overflow-hidden shadow-sm mb-4 bg-muted/30 flex items-center justify-center p-6 text-center border border-border/30 group-hover:shadow-xl group-hover:-translate-y-1 transition-all">
              <div className="size-10 bg-white/50 rounded-md flex items-center justify-center mb-4">
                <BookIcon className="size-6 text-accent/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="readex-kicker opacity-50">{MEDIA_LABELS[item.type]}</div>
              <h3 className="font-headline text-base font-bold italic leading-tight group-hover:text-accent transition-colors line-clamp-2">
                {item.title}
              </h3>
              <p className="readex-kicker text-muted-foreground truncate">{item.creator}</p>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter px-1.5 py-0 bg-muted/20 border-transparent">
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
          className="aspect-[2/3] rounded-md border-2 border-dashed border-border/50 bg-transparent flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/10 transition-colors group"
          onClick={() => openEditor()}
        >
          <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="size-5 text-muted-foreground" />
          </div>
          <div className="readex-kicker text-muted-foreground">ADD MEDIA</div>
        </Card>
      </div>

      <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
    </div>
  );
}

function CaptureField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <Label className="readex-kicker opacity-60">{label}</Label>
      <Textarea 
        value={value || ''} 
        onChange={(event) => onChange(event.target.value)} 
        className="min-h-[120px] font-body italic text-[15px] leading-relaxed bg-muted/10 border-border/30" 
        placeholder="..."
      />
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
                            : "bg-white text-muted-foreground border-border hover:border-accent hover:text-accent"
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
                  <Input placeholder="Title or author..." className="h-10 flex-1 text-sm font-body border-border/60 bg-white shadow-sm" />
                  <Button className="h-10 px-6 bg-accent font-code text-xs font-bold uppercase tracking-[0.14em]">SEARCH</Button>
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
                    className="h-10 text-sm font-body border-border/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">AUTHOR</Label>
                  <Input 
                    value={draft.creator || ''} 
                    onChange={(e) => setDraft(prev => ({ ...prev, creator: e.target.value }))}
                    className="h-10 text-sm font-body border-border/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="readex-kicker uppercase opacity-50">YEAR</Label>
                    <Input 
                      value={draft.year || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, year: e.target.value }))}
                      className="h-10 text-sm font-body border-border/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="readex-kicker uppercase opacity-50">GENRE / TOPIC</Label>
                    <Input 
                      value={draft.genre || ''} 
                      onChange={(e) => setDraft(prev => ({ ...prev, genre: e.target.value }))}
                      className="h-10 text-sm font-body border-border/60"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="readex-kicker uppercase opacity-50">CONCEPT TAGS</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(draft.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="px-2 py-0.5 font-code text-[9px] uppercase tracking-wider rounded border-border bg-muted/30">
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
                      className="h-10 flex-1 text-sm font-body border-border/60"
                    />
                    <Button variant="outline" onClick={addTag} className="h-10 font-code text-[9px] font-bold uppercase tracking-widest">ADD</Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">NOTES</Label>
                  <Textarea 
                    placeholder="Quick notes about why you added this..."
                    value={draft.description || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px] text-sm font-body border-border/60 resize-none p-3"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="readex-kicker uppercase opacity-50">STATUS</Label>
                  <select 
                    value={draft.status || 'Want to Read'}
                    onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value as MediaStatus }))}
                    className="w-full h-10 rounded-md border border-border/60 bg-white px-3 text-sm font-body appearance-none focus:outline-none focus:ring-2 focus:ring-accent"
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

const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6.5 2H20v20H6.5" />
    <path d="M6.5 18H20" />
  </svg>
);
