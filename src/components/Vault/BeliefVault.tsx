"use client";

import React, { useState } from 'react';
import { ArrowLeft, Edit, Plus, ShieldCheck, Trash2, Search, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { SourceLinker } from '@/components/SourceLinker';
import type { Concept, Draft, Media, VaultEntry, VaultType } from '@/lib/types';
import { normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface BeliefVaultProps {
  entries: VaultEntry[];
  media: Media[];
  drafts: Draft[];
  concepts: Concept[];
  onAddEntry: (data: Partial<VaultEntry>) => void;
  onUpdateEntry: (entry: VaultEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const vaultTypes: VaultType[] = ['belief', 'principle', 'mental_model', 'life_rule', 'worldview'];

const TYPE_LABELS: Record<VaultType, string> = {
  belief: 'Belief',
  principle: 'Principle',
  mental_model: 'Mental Model',
  life_rule: 'Life Rule',
  worldview: 'Worldview',
};

export function BeliefVault({ entries, media, drafts, concepts, onAddEntry, onUpdateEntry, onDeleteEntry, onAddConcept }: BeliefVaultProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | VaultType>('all');
  const [draftEntry, setDraftEntry] = useState<Partial<VaultEntry>>({ type: 'belief', title: '', statement: '', description: '', confidence: 3, status: 'active', tags: [] });

  const selected = entries.find((entry) => entry.id === selectedId) || null;
  const filteredEntries = entries.filter(e => {
    const typeOk = filter === 'all' || e.type === filter;
    const queryOk = !search || 
      e.title.toLowerCase().includes(search.toLowerCase()) || 
      e.statement.toLowerCase().includes(search.toLowerCase());
    return typeOk && queryOk;
  });

  const openEditor = (entry?: VaultEntry) => {
    setDraftEntry(entry ? { ...entry } : { type: 'belief', title: '', statement: '', description: '', confidence: 3, status: 'active', tags: [] });
    setEditorOpen(true);
  };

  const saveEntry = () => {
    if (!draftEntry.title?.trim()) return;
    if (draftEntry.id) onUpdateEntry({ ...(draftEntry as VaultEntry), tags: normalizeConceptTags(draftEntry.tags), dateUpdated: today() });
    else onAddEntry({ ...draftEntry, tags: normalizeConceptTags(draftEntry.tags) });
    setEditorOpen(false);
  };

  if (selected) {
    const linkedSources = media.filter((item) => (selected.sourceIds || []).includes(item.id));
    const linkedDrafts = drafts.filter((draft) => (draft.beliefIds || []).includes(selected.id));
    return (
      <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-5xl mx-auto w-full font-body">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setSelectedId(null)} className="h-8 font-code text-[10px] uppercase tracking-widest"><ArrowLeft className="size-4 mr-2" /> Positions</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openEditor(selected)} className="h-8 bg-white border-border/60 shadow-sm"><Edit className="size-4 mr-2" /> Edit</Button>
            <Button variant="destructive" onClick={() => { onDeleteEntry(selected.id); setSelectedId(null); }} className="h-8 shadow-sm"><Trash2 className="size-4 mr-2" /> Delete</Button>
          </div>
        </div>

        <Card className="p-6 mb-6 bg-white border-border/50 shadow-sm">
          <Badge variant="outline" className="mb-3 font-code uppercase bg-white border-border/60 shadow-sm rounded-full">{selected.type.replace('_', ' ')}</Badge>
          <h1 className="font-headline text-4xl font-bold mb-3">{selected.title}</h1>
          <p className="font-body text-lg italic text-primary/80 mb-4">{selected.statement || selected.description}</p>
          <div className="flex flex-wrap gap-2">{(selected.tags || []).map((tag) => <Badge key={tag} className="font-code text-[9px] uppercase tracking-widest bg-white border-border/60 shadow-sm rounded-full">{tag}</Badge>)}</div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EvidencePanel title="Evidence For" items={selected.evidenceFor || []} onAdd={(text) => onUpdateEntry({ ...selected, evidenceFor: [...(selected.evidenceFor || []), text], dateUpdated: today() })} />
          <EvidencePanel title="Evidence Against" items={selected.evidenceAgainst || []} onAdd={(text) => onUpdateEntry({ ...selected, evidenceAgainst: [...(selected.evidenceAgainst || []), text], dateUpdated: today() })} />
          <InfoPanel title="Linked Sources" items={linkedSources.map((item) => item.title)} empty="No sources linked yet." />
          <InfoPanel title="Linked Works" items={linkedDrafts.map((draft) => draft.title)} empty="No works linked yet." />
          <InfoPanel title="Version History" items={(selected.versionHistory || []).map((v) => `${v.date}: ${v.description}`)} empty="No revisions recorded yet." />
        </div>
        <BeliefEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draftEntry} setDraft={setDraftEntry} concepts={concepts} media={media} onAddConcept={onAddConcept} onSave={saveEntry} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80 leading-none">Positions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">State what you currently believe, what you are testing, and what evidence supports or challenges each position.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search positions, principles..." className="w-72 pl-9 h-9" />
          </div>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90 px-6 shadow-md shadow-accent/20">
            <Plus className="size-4 mr-1.5" /> NEW BELIEF
          </Button>
        </div>
      </header>

      <div className="mb-10">
        <p className="text-xl font-headline italic text-foreground/60 mb-5">Explicit positions, principles, and mental models</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all",
              filter === 'all' 
                ? "bg-accent text-white shadow-sm" 
                : "bg-white text-muted-foreground border border-border/60 shadow-sm hover:text-foreground hover:bg-muted/5"
            )}
          >
            ALL
          </button>
          {vaultTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all whitespace-nowrap",
                filter === type 
                  ? "bg-accent text-white shadow-sm" 
                  : "bg-white text-muted-foreground border border-border/60 shadow-sm hover:text-foreground hover:bg-muted/5"
              )}
            >
              {TYPE_LABELS[type] === 'Belief' ? 'BELIEFS' : TYPE_LABELS[type].toUpperCase() + 'S'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.map((entry) => (
          <Card 
            key={entry.id} 
            className="group cursor-pointer hover:shadow-xl transition-all border-border/50 bg-white p-4 flex gap-4 shadow-sm" 
            onClick={() => setSelectedId(entry.id)}
          >
            <div className="size-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
              <Triangle className="size-4 fill-current rotate-180" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="readex-kicker opacity-50 mb-1">{TYPE_LABELS[entry.type]}</div>
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
                        n <= entry.confidence ? 'bg-accent' : 'bg-muted'
                      )} 
                    />
                  ))}
                </div>
                <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-tighter px-2 py-0 bg-emerald-100/40 text-emerald-700 border-emerald-200/50 rounded-full">
                  {entry.status}
                </Badge>
                <div className="font-code text-[9px] text-muted-foreground/60">
                  {(entry.sourceIds || []).length} source{(entry.sourceIds || []).length !== 1 && 's'}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filteredEntries.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40">
            <ShieldCheck className="size-20 mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-headline italic mb-2">No positions found</h2>
            <p className="max-w-md font-body">Refine your search or turn an idea into something you are willing to examine.</p>
          </div>
        )}
      </div>

      <BeliefEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draftEntry} setDraft={setDraftEntry} concepts={concepts} media={media} onAddConcept={onAddConcept} onSave={saveEntry} />
    </div>
  );
}

function EvidencePanel({ title, items, onAdd }: { title: string; items: string[]; onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Card className="p-5 bg-white border-border/40 shadow-sm">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2 mb-3">{items.map((item, index) => <div key={`${item}-${index}`} className="rounded bg-muted/30 p-3 text-sm italic shadow-sm">{item}</div>)}</div>
      <div className="flex gap-2"><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Add evidence..." className="h-9" /><Button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }} size="sm" className="h-9 px-4">Add</Button></div>
    </Card>
  );
}

function InfoPanel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card className="p-5 bg-white border-border/40 shadow-sm">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      {items.length ? items.map((item) => (
        <div key={item} className="rounded bg-muted/30 p-3 text-sm mb-2 italic shadow-sm">{item}</div>
      )) : (
        <p className="text-sm text-muted-foreground italic px-2">{empty}</p>
      )}
    </Card>
  );
}

function BeliefEditor({ open, onOpenChange, draft, setDraft, concepts, media, onAddConcept, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Partial<VaultEntry>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<VaultEntry>>>;
  concepts: Concept[];
  media: Media[];
  onAddConcept: (data: Partial<Concept>) => void;
  onSave: () => void;
}) {
  const toggleSource = (id: string) => {
    setDraft(prev => {
      const current = prev.sourceIds || [];
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white border-none shadow-2xl rounded-2xl">
        <DialogHeader><DialogTitle className="font-headline text-2xl italic">{draft.id ? 'Edit Position' : 'Form Position'}</DialogTitle></DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="readex-kicker">Title</Label>
              <Input value={draft.title || ''} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Type</Label>
              <Select value={draft.type || 'belief'} onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as VaultType }))}>
                <SelectTrigger className="h-10 border-border/60 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{vaultTypes.map((type) => <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker">Statement</Label>
            <Textarea value={draft.statement || ''} onChange={(event) => setDraft((prev) => ({ ...prev, statement: event.target.value, description: prev.description || event.target.value }))} placeholder="The core position in one clear sentence..." className="min-h-[60px]" />
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker">Description</Label>
            <Textarea value={draft.description || ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder="Elaborate on the reasoning, assumptions, or evidence..." className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker">Concept Tags</Label>
            <ConceptTagPicker concepts={concepts} value={draft.tags || []} onChange={(tags) => setDraft((prev) => ({ ...prev, tags }))} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
          </div>
          
          <SourceLinker 
            media={media} 
            selectedIds={draft.sourceIds || []} 
            onToggle={toggleSource} 
            label="Supporting Sources"
          />
        </div>
        <DialogFooter className="pt-4"><Button onClick={onSave} className="bg-accent shadow-md shadow-accent/20 h-10 px-8">Save Position</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
