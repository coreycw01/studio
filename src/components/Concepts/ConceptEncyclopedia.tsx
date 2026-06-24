
"use client";

import React, { useMemo, useState } from 'react';
import { BookOpen, Edit, Plus, Search, Trash2, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { SourceLinker } from '@/components/SourceLinker';
import type { Concept, Draft, Insight, Media, Practice, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { allAnnotations, conceptKey, conceptRelated, conceptTerms, UNSORTED_CONCEPT } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { suggestConceptDescription } from '@/ai/flows/suggest-concept-description';
import { useToast } from '@/hooks/use-toast';

interface ConceptEncyclopediaProps {
  concepts: Concept[];
  media: Media[];
  insights: Insight[];
  vault: VaultEntry[];
  drafts: Draft[];
  practices: Practice[];
  questions: Question[];
  timeline: TimelineEvent[];
  onAddConcept: (data: Partial<Concept>) => void;
  onUpdateConcept: (concept: Concept) => void;
  onDeleteConcept: (id: string) => void;
  onCreateIdea: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
}

export function ConceptEncyclopedia(props: ConceptEncyclopediaProps) {
  const { concepts, media, insights, vault, drafts, practices = [], questions, timeline, onAddConcept, onUpdateConcept, onDeleteConcept, onCreateIdea } = props;
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'concepts' | 'ideas'>('concepts');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftConcept, setDraftConcept] = useState<Partial<Concept>>({ name: '', description: '', sourceIds: [] });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaDraft, setIdeaDraft] = useState({ title: '', body: '', tags: [UNSORTED_CONCEPT], sourceIds: [] as string[] });

  const allTerms = useMemo(() => conceptTerms(concepts, media, insights, vault, drafts, practices), [concepts, media, insights, vault, drafts, practices]);
  
  const filteredTerms = useMemo(() => {
    return allTerms.filter((name) => {
      const isUnsorted = conceptKey(name) === conceptKey(UNSORTED_CONCEPT);
      
      if (mode === 'concepts') {
        if (isUnsorted) return false;
        const conceptDoc = concepts.find(c => conceptKey(c.name) === conceptKey(name));
        if (!conceptDoc) return false;
      } else {
        if (isUnsorted) return true;
        const related = conceptRelated(name, { media, insights, vault, drafts, practices, questions, timeline });
        if (related.beliefs.length === 0 && related.ideas.length === 0) return false;
      }

      const related = conceptRelated(name, { media, insights, vault, drafts, practices, questions, timeline });
      return !search || `${name} ${JSON.stringify(related)}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [allTerms, mode, search, concepts, media, insights, vault, drafts, practices, questions, timeline]);

  const selectedRelated = selectedName ? conceptRelated(selectedName, { media, insights, vault, drafts, practices, questions, timeline }) : null;

  const openEditor = (concept?: Concept) => {
    if (concept) {
      setEditing(concept);
      setDraftConcept({ 
        name: concept.name, 
        description: concept.description || '', 
        sourceIds: concept.sourceIds || [] 
      });
    } else {
      setEditing(null);
      setDraftConcept({ name: '', description: '', sourceIds: [] });
    }
    setEditorOpen(true);
  };

  const handleSuggestDescription = async () => {
    if (!draftConcept.name) return;
    setIsSuggesting(true);
    try {
      const related = conceptRelated(draftConcept.name, { media, insights, vault, drafts, practices, questions, timeline });
      const { suggestedDescription } = await suggestConceptDescription({
        conceptName: draftConcept.name,
        currentDescription: draftConcept.description,
        linkedSources: related.sources.map(s => ({ title: s.title, creator: s.creator, description: s.description })),
        linkedIdeas: related.ideas.map(i => ({ title: i.title, body: i.body })),
        linkedBeliefs: related.beliefs.map(b => ({ title: b.title, statement: b.statement, description: b.description }))
      });
      setDraftConcept(prev => ({ ...prev, description: suggestedDescription }));
      toast({ title: "Description Suggested", description: "AI has crafted a summary based on your linked research." });
    } catch (error) {
      toast({ variant: "destructive", title: "Suggestion Failed", description: "AI could not generate a description at this time." });
    } finally {
      setIsSuggesting(false);
    }
  };

  const saveConcept = () => {
    const name = conceptKey(draftConcept.name);
    if (!name) return;
    if (editing) {
      onUpdateConcept({ 
        ...editing, 
        name, 
        description: draftConcept.description || '', 
        sourceIds: draftConcept.sourceIds || [],
        dateUpdated: new Date().toISOString() 
      });
    } else {
      onAddConcept({ 
        name, 
        description: draftConcept.description || '', 
        sourceIds: draftConcept.sourceIds || [],
        createdFrom: 'manual' 
      });
    }
    setEditing(null);
    setEditorOpen(false);
    setDraftConcept({ name: '', description: '', sourceIds: [] });
  };

  const toggleConceptSource = (id: string) => {
    setDraftConcept(prev => {
      const current = prev.sourceIds || [];
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  const saveIdea = () => {
    if (!ideaDraft.title.trim()) return;
    onCreateIdea(ideaDraft);
    setIdeaDraft({ title: '', body: '', tags: [UNSORTED_CONCEPT], sourceIds: [] });
    setIdeaOpen(false);
  };

  const toggleIdeaSource = (id: string) => {
    setIdeaDraft(prev => {
      const current = ideaDraft.sourceIds;
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Concepts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Build the encyclopedia of recurring ideas that organize your thinking.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="w-64 pl-9 h-9 rounded-full" />
          </div>
          <Button variant="outline" onClick={() => setIdeaOpen(true)} size="sm" className="bg-white border-border/60 shadow-sm rounded-full h-9">
            <Plus className="size-4 mr-1.5" /> NEW IDEA
          </Button>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 rounded-full h-9">
            <Plus className="size-4 mr-1.5" /> NEW CONCEPT
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat value={allTerms.length} label="Total Terms" sub="Knowledge index size" />
        <Stat value={media.length} label="Sources" sub="Input library" />
        <Stat value={allAnnotations(media).length} label="Annotations" sub="Tagged excerpts" />
        <Stat value={vault.length + drafts.length + (practices?.length || 0)} label="Outputs" sub="Positions, works, practices" />
      </div>

      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <button 
          onClick={() => setMode('concepts')}
          className={cn(
            "font-code text-[11px] uppercase tracking-[0.14em] px-5 py-2 rounded-full transition-all",
            mode === 'concepts' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Concepts
        </button>
        <button 
          onClick={() => setMode('ideas')}
          className={cn(
            "font-code text-[11px] uppercase tracking-[0.14em] px-5 py-2 rounded-full transition-all",
            mode === 'ideas' ? "bg-accent text-accent-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Ideas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTerms.map((name) => {
          const related = conceptRelated(name, { media, insights: [], vault, drafts, practices, questions, timeline });
          const concept = concepts.find((item) => conceptKey(item.name) === conceptKey(name));
          const isUnsorted = conceptKey(name) === conceptKey(UNSORTED_CONCEPT);
          const isIdea = mode === 'ideas' || isUnsorted;
          
          return (
            <Card 
              key={name} 
              className={cn(
                "rounded-xl p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group bg-white/95 shadow-md border border-accent/20",
                isIdea ? "border-accent/30" : "border-accent/20"
              )} 
              onClick={() => setSelectedName(name)}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex gap-2 items-start">
                    <h3 className="font-headline text-xl font-bold flex-1 group-hover:text-accent transition-colors leading-tight">{name}</h3>
                    {concept && !isUnsorted && (
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" onClick={(event) => { event.stopPropagation(); openEditor(concept); }}>
                        <Edit className="size-3" />
                      </Button>
                    )}
                  </div>
                  <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-1 font-bold">
                    {related.sources.length + related.beliefs.length + related.drafts.length} CONNECTIONS
                  </div>
                </div>
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                  isIdea ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                )}>
                  {isIdea ? <Lightbulb className="size-4" /> : <BookOpen className="size-4" />}
                </div>
              </div>
              
              <p className="text-[13px] leading-relaxed text-muted-foreground font-body line-clamp-2 italic mb-5">
                {concept?.description || (isUnsorted ? 'Catch-all for nascent thoughts and untagged observations.' : 'Inspect linked sources, positions, works, inquiries, and practices.')}
              </p>

              <div className="flex flex-wrap gap-1.5 border-t border-border/30 pt-4">
                <Badge variant="outline" className="text-[8px] font-code uppercase tracking-tighter bg-muted/10 border-transparent rounded-full px-2.5 py-0.5 font-bold shadow-sm">{related.sources.length} SOURCES</Badge>
                <Badge variant="outline" className="text-[8px] font-code uppercase tracking-tighter bg-muted/10 border-transparent rounded-full px-2.5 py-0.5 font-bold shadow-sm">{related.beliefs.length} POSITIONS</Badge>
                <Badge variant="outline" className="text-[8px] font-code uppercase tracking-tighter bg-muted/10 border-transparent rounded-full px-2.5 py-0.5 font-bold shadow-sm">{related.drafts.length} WORKS</Badge>
              </div>
            </Card>
          );
        })}

        {filteredTerms.length === 0 && (
          <div className="col-span-full py-24 text-center opacity-40">
            <BookOpen className="size-16 mx-auto mb-6" />
            <h3 className="text-2xl font-headline italic">No {mode} discovered</h3>
            <p className="text-sm font-body mt-2">Refine your search or add new intellectual artifacts to the vault.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedName} onOpenChange={(open) => !open && setSelectedName(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-[#FAFAF7] border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">{selectedName}</DialogTitle>
          </DialogHeader>
          {selectedRelated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RelatedSection title="Inputs: Sources" items={selectedRelated.sources.map((item) => `${item.title} - ${item.creator || item.type}`)} />
              <RelatedSection title="Inputs: Annotations" items={selectedRelated.annotations.map((item) => `${item.type}: ${item.text}`)} />
              <RelatedSection title="Inputs: Inquiries" items={selectedRelated.questions.map((item) => item.text)} />
              <RelatedSection title="Outputs: Positions" items={selectedRelated.beliefs.map((item) => item.title)} />
              <RelatedSection title="Outputs: Works" items={selectedRelated.drafts.map((item) => `${item.title} (${item.type})`)} />
              <RelatedSection title="Outputs: Practices" items={selectedRelated.practices.map((item) => `${item.title} (${item.type})`)} />
              <RelatedSection title="Outputs: Evolution" items={selectedRelated.events.map((item) => `${item.eventType}: ${item.entityTitle}`)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(open) => {
        setEditorOpen(open);
        if (!open) {
          setEditing(null);
          setDraftConcept({ name: '', description: '', sourceIds: [] });
        }
      }}>
        <DialogContent className="max-w-xl bg-white border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="font-headline text-2xl italic">{editing ? 'Edit Concept' : 'New Concept'}</DialogTitle>
              {draftConcept.name && (
                <Button variant="outline" size="sm" onClick={handleSuggestDescription} disabled={isSuggesting} className="h-8 font-code text-[10px] uppercase tracking-widest text-accent border-accent/20 bg-white shadow-sm rounded-full">
                  {isSuggesting ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Sparkles className="size-3.5 mr-2" />}
                  Suggest Description
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="readex-kicker">Concept Name</Label>
              <Input value={draftConcept.name} onChange={(event) => setDraftConcept((prev) => ({ ...prev, name: event.target.value }))} className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Description</Label>
              <Textarea value={draftConcept.description} onChange={(event) => setDraftConcept((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[100px]" />
            </div>
            <SourceLinker 
              media={media} 
              selectedIds={draftConcept.sourceIds || []} 
              onToggle={toggleConceptSource} 
              label="Root Evidence (Sources)"
            />
          </div>
          <DialogFooter className="gap-2 pt-4">
            {editing && (
              <Button variant="destructive" onClick={() => { onDeleteConcept(editing.id); setEditing(null); setEditorOpen(false); }} className="rounded-full px-6">
                <Trash2 className="size-4 mr-2" /> Delete
              </Button>
            )}
            <Button onClick={saveConcept} className="bg-accent shadow-md shadow-accent/20 rounded-full px-8">Anchor Concept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
        <DialogContent className="max-w-xl bg-white border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">New Idea</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="readex-kicker">Idea Statement</Label>
              <Input value={ideaDraft.title} onChange={(event) => setIdeaDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Brief title or central statement..." className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Description / Reasoning</Label>
              <Textarea value={ideaDraft.body} onChange={(event) => setIdeaDraft((prev) => ({ ...prev, body: event.target.value }))} className="min-h-[120px]" placeholder="Elaborate on the insight..." />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Concepts</Label>
              <ConceptTagPicker concepts={concepts} value={ideaDraft.tags} onChange={(tags) => setIdeaDraft((prev) => ({ ...prev, tags }))} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
            </div>
            
            <SourceLinker 
              media={media} 
              selectedIds={ideaDraft.sourceIds} 
              onToggle={toggleIdeaSource} 
              label="Influencing Sources"
            />
          </div>
          <DialogFooter className="pt-4"><Button onClick={saveIdea} className="bg-accent shadow-md shadow-accent/20 rounded-full px-8">Archive Idea</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ value, label, sub }: { value: number | string; label: string; sub: string }) {
  return (
    <Card className="bg-white border border-accent/10 shadow-sm p-4 h-20 flex flex-col justify-center rounded-xl">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-headline font-bold text-accent leading-none">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground/40 truncate font-body">{sub}</div>
    </Card>
  );
}

function RelatedSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-border/50 p-5 bg-white shadow-sm">
      <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-bold">{title}</h4>
      <div className="space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-lg bg-muted/20 p-4 text-sm font-body text-primary/80 shadow-sm border border-border/10 italic leading-relaxed">{item}</div>
        )) : (
          <p className="text-sm text-muted-foreground italic font-body py-2">Nothing linked yet.</p>
        )}
      </div>
    </section>
  );
}
