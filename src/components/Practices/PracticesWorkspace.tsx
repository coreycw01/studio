"use client";

import React, { useMemo, useState } from 'react';
import { Edit, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Concept, Draft, Media, Practice, PracticeStatus, PracticeType, Question, VaultEntry } from '@/lib/types';
import { allQuestions, normalizeConceptTags, PRACTICE_LABELS, today } from '@/lib/readex';

interface PracticesWorkspaceProps {
  practices: Practice[];
  concepts: Concept[];
  media: Media[];
  questions: Question[];
  positions: VaultEntry[];
  drafts: Draft[];
  onAddPractice: (data: Partial<Practice>) => void;
  onUpdatePractice: (practice: Practice) => void;
  onDeletePractice: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const practiceTypes: PracticeType[] = ['habit', 'experiment', 'discipline', 'reflection_prompt', 'commitment', 'observation', 'rule', 'challenge'];
const statuses: PracticeStatus[] = ['planned', 'active', 'completed', 'paused', 'abandoned'];

export function PracticesWorkspace({ practices, concepts, media, questions, positions, drafts, onAddPractice, onUpdatePractice, onDeletePractice, onAddConcept }: PracticesWorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<PracticeStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PracticeType | 'all'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Practice>>({ title: '', description: '', type: 'experiment', status: 'planned', durationDays: 7, conceptTags: [] });
  const questionList = useMemo(() => allQuestions(media, questions), [media, questions]);
  const activePractices = practices.filter((practice) => practice.status === 'active' || practice.status === 'planned');
  const filtered = practices.filter((practice) => (statusFilter === 'all' || practice.status === statusFilter) && (typeFilter === 'all' || practice.type === typeFilter));

  const openEditor = (practice?: Practice) => {
    setDraft(practice ? { ...practice } : { title: '', description: '', type: 'experiment', status: 'planned', durationDays: 7, startDate: today().slice(0, 10), endDate: '', conceptTags: [] });
    setEditorOpen(true);
  };

  const savePractice = () => {
    if (!draft.title?.trim()) return;
    const payload = { ...draft, conceptTags: normalizeConceptTags(draft.conceptTags) };
    if (draft.id) onUpdatePractice(payload as Practice);
    else onAddPractice(payload);
    setEditorOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">Practices</h1>
          <p className="text-muted-foreground font-body text-lg">Turn understanding into habits, experiments, disciplines, commitments, and lived tests.</p>
        </div>
        <Button onClick={() => openEditor()}><Plus className="size-4 mr-2" /> New Practice</Button>
      </header>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="size-4 text-accent" />
          <h2 className="font-headline text-2xl font-semibold italic">Active Loop</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(activePractices.length ? activePractices : practices.slice(0, 3)).map((practice) => (
            <PracticeCard key={practice.id} practice={practice} questions={questionList} positions={positions} onEdit={() => openEditor(practice)} onDelete={() => onDeletePractice(practice.id)} />
          ))}
          {!practices.length && (
            <Card className="p-8 border-dashed text-center md:col-span-2 xl:col-span-3">
              <Repeat className="size-10 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-headline text-2xl italic mb-2">No practices yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create the first lived test that asks what your understanding requires of you.</p>
              <Button variant="outline" onClick={() => openEditor()}>Create Practice</Button>
            </Card>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PracticeStatus | 'all')}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as PracticeType | 'all')}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Practice Types</SelectItem>
            {practiceTypes.map((type) => <SelectItem key={type} value={type}>{PRACTICE_LABELS[type]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((practice) => (
          <PracticeCard key={practice.id} practice={practice} questions={questionList} positions={positions} onEdit={() => openEditor(practice)} onDelete={() => onDeletePractice(practice.id)} />
        ))}
      </div>

      <PracticeEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        draft={draft}
        setDraft={setDraft}
        concepts={concepts}
        media={media}
        questions={questionList}
        positions={positions}
        drafts={drafts}
        onAddConcept={onAddConcept}
        onSave={savePractice}
      />
    </div>
  );
}

function PracticeCard({ practice, questions, positions, onEdit, onDelete }: { practice: Practice; questions: Question[]; positions: VaultEntry[]; onEdit: () => void; onDelete: () => void }) {
  const linkedQuestions = questions.filter((question) => (practice.questionIds || []).includes(question.id));
  const linkedPositions = positions.filter((position) => (practice.positionIds || []).includes(position.id));
  return (
    <Card className="group hover:shadow-xl transition-all border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-code text-[9px] uppercase">{PRACTICE_LABELS[practice.type]}</Badge>
            <Badge variant="outline" className="font-code text-[9px] uppercase">{practice.status}</Badge>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}><Edit className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <CardTitle className="font-headline text-xl">{practice.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground font-body line-clamp-3 mb-4">{practice.description || 'No requirement written yet.'}</p>
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <MiniStat label="days" value={practice.durationDays || 0} />
          <MiniStat label="inquiries" value={linkedQuestions.length} />
          <MiniStat label="positions" value={linkedPositions.length} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(practice.conceptTags || []).slice(0, 4).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded bg-muted/40 p-2"><div className="font-headline font-bold text-lg">{value}</div><div className="font-code text-[8px] uppercase text-muted-foreground">{label}</div></div>;
}

function PracticeEditor({ open, onOpenChange, draft, setDraft, concepts, media, questions, positions, drafts, onAddConcept, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Partial<Practice>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Practice>>>;
  concepts: Concept[];
  media: Media[];
  questions: Question[];
  positions: VaultEntry[];
  drafts: Draft[];
  onAddConcept: (data: Partial<Concept>) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-headline text-2xl italic">{draft.id ? 'Edit Practice' : 'New Practice'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title"><Input value={draft.title || ''} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} /></Field>
            <Field label="Duration Days"><Input type="number" min={0} value={draft.durationDays || 0} onChange={(event) => setDraft((prev) => ({ ...prev, durationDays: Math.max(0, Number(event.target.value) || 0) }))} /></Field>
            <Field label="Type">
              <Select value={draft.type || 'experiment'} onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as PracticeType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{practiceTypes.map((type) => <SelectItem key={type} value={type}>{PRACTICE_LABELS[type]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={draft.status || 'planned'} onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as PracticeStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Start Date"><Input type="date" value={draft.startDate || ''} onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))} /></Field>
            <Field label="End Date"><Input type="date" value={draft.endDate || ''} onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))} /></Field>
          </div>
          <Field label="What This Requires"><Textarea value={draft.description || ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[110px]" /></Field>
          <Field label="Observations And Notes"><Textarea value={draft.notes || ''} onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} className="min-h-[120px]" /></Field>
          <Field label="Concept Tags"><ConceptTagPicker concepts={concepts} value={draft.conceptTags || []} onChange={(conceptTags) => setDraft((prev) => ({ ...prev, conceptTags }))} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} /></Field>
          <LinkGrid title="Linked Sources" items={media.map((item) => ({ id: item.id, label: item.title }))} selected={draft.sourceIds || []} onChange={(sourceIds) => setDraft((prev) => ({ ...prev, sourceIds }))} />
          <LinkGrid title="Linked Inquiries" items={questions.map((item) => ({ id: item.id, label: item.text }))} selected={draft.questionIds || []} onChange={(questionIds) => setDraft((prev) => ({ ...prev, questionIds }))} />
          <LinkGrid title="Linked Positions" items={positions.map((item) => ({ id: item.id, label: item.title }))} selected={draft.positionIds || []} onChange={(positionIds) => setDraft((prev) => ({ ...prev, positionIds }))} />
          <LinkGrid title="Linked Works" items={drafts.map((item) => ({ id: item.id, label: item.title }))} selected={draft.draftIds || []} onChange={(draftIds) => setDraft((prev) => ({ ...prev, draftIds }))} />
        </div>
        <DialogFooter><Button onClick={onSave}>Save Practice</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function LinkGrid({ title, items, selected, onChange }: { title: string; items: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <Field label={title}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto rounded-md border p-3">
        {items.length ? items.map((item) => (
          <label key={item.id} className="flex gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
            <span className="line-clamp-1">{item.label}</span>
          </label>
        )) : <p className="text-sm text-muted-foreground italic">Nothing available yet.</p>}
      </div>
    </Field>
  );
}
