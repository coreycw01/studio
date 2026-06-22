"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Concept, Draft, DraftStatus, DraftType, Media, Question, VaultEntry } from '@/lib/types';
import { allQuestions, DRAFT_LABELS, normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface AtelierProps {
  drafts: Draft[];
  media: Media[];
  vault: VaultEntry[];
  questions: Question[];
  concepts: Concept[];
  onAddDraft: (data: Partial<Draft>) => void;
  onUpdateDraft: (draft: Draft) => void;
  onDeleteDraft: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const statuses: DraftStatus[] = ['seed', 'drafting', 'revised', 'final'];

export function Atelier({ drafts, media, vault, questions, concepts, onAddDraft, onUpdateDraft, onDeleteDraft, onAddConcept }: AtelierProps) {
  const [activeId, setActiveId] = useState<string | null>(drafts[0]?.id || null);
  const [filter, setFilter] = useState<'all' | DraftType | DraftStatus>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: '', type: 'essay' as DraftType });
  const active = drafts.find((draft) => draft.id === activeId) || null;
  const questionList = allQuestions(media, questions);
  const visibleDrafts = drafts.filter((draft) => filter === 'all' || draft.type === filter || draft.status === filter);
  const linkedSourceCount = active?.sourceIds?.length || 0;
  const linkedQuestionCount = active?.questionIds?.length || 0;
  const linkedBeliefCount = active?.beliefIds?.length || 0;
  const conceptCount = active?.conceptTags?.length || 0;

  useEffect(() => {
    if (!activeId && drafts[0]) setActiveId(drafts[0].id);
  }, [activeId, drafts]);

  const createDraft = () => {
    if (!newDraft.title.trim()) return;
    onAddDraft(newDraft);
    setIsAddOpen(false);
    setNewDraft({ title: '', type: 'essay' });
  };

  const updateActive = (patch: Partial<Draft>) => {
    if (!active) return;
    onUpdateDraft({ ...active, ...patch, dateUpdated: today() });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="p-7 border-b border-border/50 bg-background">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-headline font-semibold italic">Writing Studio</h1>
            <p className="mt-1 text-muted-foreground font-body text-[15px]">Draft essays, scripts, and field notes while keeping evidence and concept links beside the editor.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setNewDraft({ title: '', type: 'field_note' }); setIsAddOpen(true); }}>+ Field Note</Button>
            <Button variant="outline" onClick={() => { setNewDraft({ title: '', type: 'script' }); setIsAddOpen(true); }}>+ Script</Button>
            <Button onClick={() => { setNewDraft({ title: '', type: 'essay' }); setIsAddOpen(true); }}>+ Essay</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StudioStat label="Drafts" value={drafts.length} sub="All writing outputs" />
          <StudioStat label="Concept Tags" value={conceptCount} sub="Grouping this draft" />
          <StudioStat label="Evidence Links" value={linkedSourceCount + linkedQuestionCount + linkedBeliefCount} sub="Sources, questions, beliefs" />
          <StudioStat label="Status" value={active?.status || 'None'} sub={active ? DRAFT_LABELS[active.type] : 'Create a draft'} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden px-7 pb-7 gap-4">
      <div className="w-72 border border-border flex flex-col bg-white rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border/50 flex justify-between items-center">
          <h2 className="font-headline font-semibold text-xl italic">Drafts</h2>
          <Button size="icon" variant="ghost" onClick={() => setIsAddOpen(true)}><Plus className="size-4" /></Button>
        </div>
        <div className="p-3 flex flex-wrap gap-2 border-b">
          {(['all','essay','script','field_note','drafting','final'] as const).map((value) => <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{value.replace('_',' ')}</Button>)}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {visibleDrafts.map((draft) => (
              <button key={draft.id} onClick={() => setActiveId(draft.id)} className={cn('w-full text-left p-4 rounded-md transition-all', active?.id === draft.id ? 'bg-white shadow-sm ring-1 ring-border' : 'hover:bg-white/50')}>
                <div className="flex justify-between mb-1"><span className="font-code text-[9px] uppercase text-muted-foreground">{DRAFT_LABELS[draft.type]}</span><span className="font-code text-[8px] uppercase">{draft.status}</span></div>
                <h3 className="font-headline font-semibold text-sm line-clamp-1">{draft.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1 font-body mt-1">{(draft.conceptTags || []).join(', ') || 'No concepts yet'}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-lg border border-border overflow-hidden">
        {active ? (
          <>
            <div className="p-4 border-b border-border/50 flex gap-3 items-center bg-muted">
              <Input className="flex-1 bg-transparent border-none text-2xl font-headline font-semibold focus-visible:ring-0 italic" value={active.title} onChange={(event) => updateActive({ title: event.target.value })} />
              <Select value={active.type} onValueChange={(value) => updateActive({ type: value as DraftType })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="essay">Essay</SelectItem><SelectItem value="script">Script</SelectItem><SelectItem value="field_note">Field Note</SelectItem></SelectContent></Select>
              <Select value={active.status} onValueChange={(value) => updateActive({ status: value as DraftStatus })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
              <Button variant="outline" onClick={() => onUpdateDraft(active)}><Save className="size-3 mr-2" /> Save</Button>
              <Button variant="destructive" onClick={() => { onDeleteDraft(active.id); setActiveId(null); }}><Trash2 className="size-3" /></Button>
            </div>
            <div className="flex-1 p-8 max-w-4xl mx-auto w-full overflow-y-auto font-body">
              <Textarea className="w-full h-full min-h-[64vh] border-none shadow-none text-[17px] leading-8 font-body focus-visible:ring-0 resize-none" placeholder="Write here..." value={active.body} onChange={(event) => updateActive({ body: event.target.value })} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-12"><Button variant="outline" onClick={() => setIsAddOpen(true)}>New Draft</Button></div>
        )}
      </div>

      <div className="w-80 border border-border bg-white rounded-lg overflow-y-auto p-4 space-y-4">
        {active && (
          <>
            <Card className="p-4"><h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Concepts</h3><ConceptTagPicker concepts={concepts} value={active.conceptTags || []} onChange={(tags) => updateActive({ conceptTags: normalizeConceptTags(tags) })} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} compact /></Card>
            <LinkPanel title="Sources" items={media.map((m) => ({ id: m.id, label: m.title }))} selected={active.sourceIds || []} onChange={(sourceIds) => updateActive({ sourceIds })} />
            <LinkPanel title="Questions" items={questionList.map((q) => ({ id: q.id, label: q.text }))} selected={active.questionIds || []} onChange={(questionIds) => updateActive({ questionIds })} />
            <LinkPanel title="Beliefs" items={vault.map((v) => ({ id: v.id, label: v.title }))} selected={active.beliefIds || []} onChange={(beliefIds) => updateActive({ beliefIds })} />
          </>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">New Draft</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={newDraft.title} onChange={(event) => setNewDraft((prev) => ({ ...prev, title: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Type</Label><Select value={newDraft.type} onValueChange={(value) => setNewDraft((prev) => ({ ...prev, type: value as DraftType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="essay">Essay</SelectItem><SelectItem value="script">Script</SelectItem><SelectItem value="field_note">Field Note</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={createDraft}>Create Draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function StudioStat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Card className="readex-header-card">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-headline text-2xl font-bold italic truncate">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

function LinkPanel({ title, items, selected, onChange }: { title: string; items: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <Card className="p-4">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.length ? items.map((item) => (
          <label key={item.id} className="flex gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
            <span className="line-clamp-1">{item.label}</span>
          </label>
        )) : <p className="text-sm text-muted-foreground italic">Nothing available yet.</p>}
      </div>
    </Card>
  );
}
