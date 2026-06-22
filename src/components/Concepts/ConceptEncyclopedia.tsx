"use client";

import React, { useMemo, useState } from 'react';
import { BookOpen, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Concept, Draft, Insight, Media, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { allAnnotations, conceptKey, conceptRelated, conceptTerms, UNSORTED_CONCEPT } from '@/lib/readex';

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
}

export function ConceptEncyclopedia(props: ConceptEncyclopediaProps) {
  const { concepts, media, insights, vault, drafts, questions, timeline, onAddConcept, onUpdateConcept, onDeleteConcept } = props;
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftConcept, setDraftConcept] = useState({ name: '', description: '' });

  const terms = useMemo(() => conceptTerms(concepts, media, insights, vault, drafts), [concepts, media, insights, vault, drafts]);
  const filtered = terms.filter((name) => {
    const related = conceptRelated(name, { media, insights, vault, drafts, questions, timeline });
    return !search || `${name} ${JSON.stringify(related)}`.toLowerCase().includes(search.toLowerCase());
  });

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

  return (
    <div className="flex-1 overflow-y-auto p-7 max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-4 mb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-headline font-semibold mb-2 italic">Concepts</h1>
          <p className="text-muted-foreground font-body text-[15px]">The encyclopedia of recurring ideas, with inputs and outputs gathered in one place.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search concepts..." className="w-72 pl-9 bg-muted font-code text-[11px]" />
          </div>
          <Button onClick={() => openEditor()}><Plus className="size-4 mr-2" /> New Concept</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat value={terms.length} label="Concepts" sub="Encyclopedia entries" />
        <Stat value={media.length} label="Sources" sub="Inputs feeding concepts" />
        <Stat value={allAnnotations(media).length} label="Annotations" sub="Tagged notes and questions" />
        <Stat value={insights.length + vault.length + drafts.length} label="Outputs" sub="Ideas, beliefs, writing" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Badge>Concepts are the encyclopedia</Badge>
        <Badge variant="outline">Cards open detail popups</Badge>
        <Badge variant="outline">Chips show linked items</Badge>
        <Badge variant="outline">Atlas remains the map</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((name) => {
          const related = conceptRelated(name, { media, insights, vault, drafts, questions, timeline });
          const concept = concepts.find((item) => conceptKey(item.name) === conceptKey(name));
          return (
            <Card key={name} className="rounded-lg p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" onClick={() => setSelectedName(name)}>
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-md bg-accent/10 text-accent flex items-center justify-center">
                  <BookOpen className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="flex gap-2 items-start">
                    <h3 className="font-headline text-xl font-bold flex-1">{name}</h3>
                    {concept && concept.name !== UNSORTED_CONCEPT && (
                      <Button variant="ghost" size="icon" className="size-7" onClick={(event) => { event.stopPropagation(); openEditor(concept); }}>
                        <Edit className="size-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[13px] leading-6 text-muted-foreground font-body mt-1 line-clamp-2">{concept?.description || 'No description yet. Open this concept to inspect linked sources, beliefs, writing, questions, and evolution.'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">{related.sources.length} sources</Badge>
                <Badge variant="outline">{related.annotations.length} notes</Badge>
                <Badge variant="outline">{related.beliefs.length} beliefs</Badge>
                <Badge variant="outline">{related.drafts.length} drafts</Badge>
              </div>
            </Card>
          );
        })}
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
              <RelatedSection title="Inputs: Questions" items={selectedRelated.questions.map((item) => item.text)} />
              <RelatedSection title="Outputs: Beliefs" items={selectedRelated.beliefs.map((item) => item.title)} />
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
