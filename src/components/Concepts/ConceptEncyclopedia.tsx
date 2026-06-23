"use client";

import React, { useMemo, useState } from 'react';
import { BookOpen, Edit, Plus, Search, Trash2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Concept, Draft, Insight, Media, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { allAnnotations, conceptKey, conceptRelated, conceptTerms, UNSORTED_CONCEPT } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface ConceptEncyclopediaProps {
  concepts: Concept[];
  media: Media[];
  insights: Insight[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
  onAddConcept: (data: Partial<Concept>) => void;
  onUpdateConcept: (concept: Concept) => void;
  onDeleteConcept: (id: string) => void;
  onCreateIdea: (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => void;
}

export function ConceptEncyclopedia(props: ConceptEncyclopediaProps) {
  const { concepts, media, insights, vault, drafts, questions, timeline, onAddConcept, onUpdateConcept, onDeleteConcept, onCreateIdea } = props;
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'concepts' | 'ideas'>('concepts');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftConcept, setDraftConcept] = useState({ name: '', description: '' });
  
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaDraft, setIdeaDraft] = useState({ title: '', body: '', tags: [UNSORTED_CONCEPT], sourceIds: [] as string[] });

  const allTerms = useMemo(() => conceptTerms(concepts, media, insights, vault, drafts), [concepts, media, insights, vault, drafts]);
  
  const filteredTerms = useMemo(() => {
    return allTerms.filter((name) => {
      const isUnsorted = conceptKey(name) === conceptKey(UNSORTED_CONCEPT);
      // Unsorted Ideas always goes to "ideas" mode
      if (mode === 'concepts' && isUnsorted) return false;
      if (mode === 'ideas' && !isUnsorted) {
        // Only show items that have associated vault entries (claims) or insights (ideas)
        const related = conceptRelated(name, { media, insights, vault, drafts, questions, timeline });
        if (related.beliefs.length === 0 && related.ideas.length === 0) return false;
      }
      if (mode === 'concepts' && !isUnsorted) {
        // Show formal concepts
        const conceptDoc = concepts.find(c => conceptKey(c.name) === conceptKey(name));
        if (!conceptDoc && !isUnsorted) return false;
      }

      const related = conceptRelated(name, { media, insights, vault, drafts, questions, timeline });
      return !search || `${name} ${JSON.stringify(related)}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [allTerms, mode, search, concepts, media, insights, vault, drafts, questions, timeline]);

  const selectedRelated = selectedName ? conceptRelated(selectedName, { media, insights, vault, drafts, questions, timeline }) : null;
  const selectedConcept = selectedName ? concepts.find((concept) => conceptKey(concept.name) === conceptKey(selectedName)) : null;

  const openEditor = (concept?: Concept) => {
    if (concept) {
      setEditing(concept);
      setDraftConcept({ name: concept.name, description: concept.description || '' });
    } else {
      setEditing(null);
      setDraftConcept({ name: '', description: '' });
    }
    setEditorOpen(true);
  };

  const saveConcept = () => {
    const name = conceptKey(draftConcept.name);
    if (!name) return;
    if (editing) onUpdateConcept({ ...editing, name, description: draftConcept.description, dateUpdated: new Date().toISOString() });
    else onAddConcept({ name, description: draftConcept.description, createdFrom: 'manual' });
    setEditing(null);
    setEditorOpen(false);
    setDraftConcept({ name: '', description: '' });
  };

  const saveIdea = () => {
    if (!ideaDraft.title.trim()) return;
    onCreateIdea(ideaDraft);
    setIdeaDraft({ title: '', body: '', tags: [UNSORTED_CONCEPT], sourceIds: [] });
    setIdeaOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-7 max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-4 mb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-headline font-semibold mb-2 italic">Encyclopedia</h1>
          <p className="text-muted-foreground font-body text-[15px]">The index of recurring mental nodes, claims, and inquiries gathered in one place.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="w-72 pl-9 bg-muted font-code text-[11px]" />
          </div>
          <Button variant="outline" onClick={() => setIdeaOpen(true)}><Plus className="size-4 mr-2" /> New Idea</Button>
          <Button onClick={() => openEditor()}><Plus className="size-4 mr-2" /> New Concept</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat value={allTerms.length} label="Total Terms" sub="Knowledge index size" />
        <Stat value={media.length} label="Sources" sub="Input library" />
        <Stat value={allAnnotations(media).length} label="Annotations" sub="Tagged excerpts" />
        <Stat value={vault.length + drafts.length} label="Outputs" sub="Claims & Writing" />
      </div>

      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <button 
          onClick={() => setMode('concepts')}
          className={cn(
            "font-code text-[11px] uppercase tracking-[0.14em] px-4 py-2 rounded transition-all",
            mode === 'concepts' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Concepts
        </button>
        <button 
          onClick={() => setMode('ideas')}
          className={cn(
            "font-code text-[11px] uppercase tracking-[0.14em] px-4 py-2 rounded transition-all",
            mode === 'ideas' ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Ideas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTerms.map((name) => {
          const related = conceptRelated(name, { media, insights, vault, drafts, questions, timeline });
          const concept = concepts.find((item) => conceptKey(item.name) === conceptKey(name));
          return (
            <Card key={name} className="rounded-lg p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/50 group" onClick={() => setSelectedName(name)}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-9 rounded-md flex items-center justify-center transition-colors",
                  mode === 'ideas' || conceptKey(name) === conceptKey(UNSORTED_CONCEPT) ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                  {mode === 'ideas' || conceptKey(name) === conceptKey(UNSORTED_CONCEPT) ? <Lightbulb className="size-4" /> : <BookOpen className="size-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2 items-start">
                    <h3 className="font-headline text-xl font-bold flex-1 group-hover:text-accent transition-colors">{name}</h3>
                    {concept && concept.name !== UNSORTED_CONCEPT && (
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(event) => { event.stopPropagation(); openEditor(concept); }}>
                        <Edit className="size-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[13px] leading-6 text-muted-foreground font-body mt-1 line-clamp-2 italic">
                    {concept?.description || 'Inspect linked sources, claims, writing, and inquiries.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="text-[10px] bg-muted/20">{related.sources.length} sources</Badge>
                <Badge variant="outline" className="text-[10px] bg-muted/20">{related.beliefs.length} claims</Badge>
                <Badge variant="outline" className="text-[10px] bg-muted/20">{related.drafts.length} drafts</Badge>
              </div>
            </Card>
          );
        })}

        {filteredTerms.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40">
            <BookOpen className="size-16 mx-auto mb-4" />
            <h3 className="text-xl font-headline italic">No {mode} found</h3>
            <p className="text-sm font-body">Refine your search or add new intellectual artifacts.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedName} onOpenChange={(open) => !open && setSelectedName(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">{selectedName}</DialogTitle>
          </DialogHeader>
          {selectedRelated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RelatedSection title="Inputs: Sources" items={selectedRelated.sources.map((item) => `${item.title} - ${item.creator || item.type}`)} />
              <RelatedSection title="Inputs: Annotations" items={selectedRelated.annotations.map((item) => `${item.type}: ${item.text}`)} />
              <RelatedSection title="Inputs: Inquiries" items={selectedRelated.questions.map((item) => item.text)} />
              <RelatedSection title="Outputs: Claims" items={selectedRelated.beliefs.map((item) => item.title)} />
              <RelatedSection title="Outputs: Writing" items={selectedRelated.drafts.map((item) => `${item.title} (${item.type})`)} />
              <RelatedSection title="Outputs: Evolution" items={selectedRelated.events.map((item) => `${item.eventType}: ${item.entityTitle}`)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(open) => {
        setEditorOpen(open);
        if (!open) {
          setEditing(null);
          setDraftConcept({ name: '', description: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">{editing ? 'Edit Concept' : 'New Concept'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Concept Name</Label>
              <Input value={draftConcept.name} onChange={(event) => setDraftConcept((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={draftConcept.description} onChange={(event) => setDraftConcept((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button variant="destructive" onClick={() => { onDeleteConcept(editing.id); setEditing(null); setEditorOpen(false); setDraftConcept({ name: '', description: '' }); }}>
                <Trash2 className="size-4 mr-2" /> Delete
              </Button>
            )}
            <Button onClick={saveConcept}>Save Concept</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">New Idea</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={ideaDraft.title} onChange={(event) => setIdeaDraft((prev) => ({ ...prev, title: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea value={ideaDraft.body} onChange={(event) => setIdeaDraft((prev) => ({ ...prev, body: event.target.value }))} /></div>
            <ConceptTagPicker concepts={concepts} value={ideaDraft.tags} onChange={(tags) => setIdeaDraft((prev) => ({ ...prev, tags }))} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
          </div>
          <DialogFooter><Button onClick={saveIdea}>Save Claim</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <Card className="readex-header-card">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-headline font-bold text-accent">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function RelatedSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-border/50 p-4 bg-muted/20">
      <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</h4>
      <div className="space-y-2">
        {items.length ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded bg-white p-3 text-sm font-body text-primary/80 shadow-sm">{item}</div>
        )) : (
          <p className="text-sm text-muted-foreground italic">Nothing linked yet.</p>
        )}
      </div>
    </section>
  );
}
