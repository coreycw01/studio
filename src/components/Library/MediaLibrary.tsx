"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Annotation, Concept, Media, MediaStatus, MediaType, VaultEntry } from '@/lib/types';
import { MEDIA_LABELS, MEDIA_TYPES, normalizeConceptTags, today, uid } from '@/lib/readex';

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
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Media>>({ type: 'book', title: '', creator: '', status: 'Want to Read', tags: [] });
  const [annotationDraft, setAnnotationDraft] = useState({ type: 'thought' as Annotation['type'], text: '' });

  const selected = media.find((item) => item.id === selectedId) || null;
  const filtered = useMemo(() => media.filter((item) => {
    const typeOk = filter === 'all' || item.type === filter;
    const query = `${item.title} ${item.creator} ${(item.tags || []).join(' ')}`.toLowerCase();
    return typeOk && (!search || query.includes(search.toLowerCase()));
  }), [filter, media, search]);

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

  if (selected) {
    const linkedBeliefs = vault.filter((entry) => (entry.sourceIds || []).includes(selected.id));
    return (
      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setSelectedId(null)}><ArrowLeft className="size-4 mr-2" /> Library</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openEditor(selected)}><Edit className="size-4 mr-2" /> Edit</Button>
            <Button variant="destructive" onClick={() => { onDeleteMedia(selected.id); setSelectedId(null); }}><Trash2 className="size-4 mr-2" /> Delete</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <Card className="p-5 h-fit">
            <div className="aspect-[2/3] rounded bg-muted flex items-center justify-center text-center p-6 mb-4">
              <div>
                <div className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{MEDIA_LABELS[selected.type]}</div>
                <h2 className="font-headline text-2xl italic">{selected.title}</h2>
              </div>
            </div>
            <p className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">{selected.creator}</p>
            <Select value={selected.status} onValueChange={(value) => updateSelected({ status: value as MediaStatus })}>
              <SelectTrigger className="mt-4"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="font-headline text-xl font-bold mb-3">Concept Tags</h3>
              <ConceptTagPicker concepts={concepts} value={selected.tags || []} onChange={(tags) => updateSelected({ tags })} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
            </Card>

            <Card className="p-5">
              <h3 className="font-headline text-xl font-bold mb-3">Capture</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CaptureField label="Open Question" value={selected.capture?.before?.openQuestion} onChange={(value) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, openQuestion: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Working Answer" value={selected.capture?.before?.openAnswer} onChange={(value) => updateSelected({ capture: { ...selected.capture, before: { ...selected.capture?.before, openAnswer: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Core Argument" value={selected.capture?.after?.coreArgument} onChange={(value) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, coreArgument: value }, sessions: selected.capture?.sessions || [] } })} />
                <CaptureField label="Belief Change" value={selected.capture?.after?.beliefChange} onChange={(value) => updateSelected({ capture: { ...selected.capture, after: { ...selected.capture?.after, beliefChange: value }, sessions: selected.capture?.sessions || [] } })} />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-headline text-xl font-bold mb-3">Annotations</h3>
              <div className="flex gap-2 mb-4">
                <Select value={annotationDraft.type} onValueChange={(value) => setAnnotationDraft((prev) => ({ ...prev, type: value as Annotation['type'] }))}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight">Highlight</SelectItem>
                    <SelectItem value="thought">Thought</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="connection">Connection</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={annotationDraft.text} onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, text: event.target.value }))} placeholder="Add note, quote, question, or connection..." />
                <Button onClick={addAnnotation}>Add</Button>
              </div>
              <div className="space-y-2">
                {(selected.annotations || []).map((annotation) => (
                  <div key={annotation.id} className="rounded border p-3 text-sm">
                    <Badge variant="outline" className="mb-2">{annotation.type}</Badge>
                    <p className="font-body">{annotation.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-headline text-xl font-bold mb-3">Linked Beliefs</h3>
              {linkedBeliefs.length ? linkedBeliefs.map((entry) => <div key={entry.id} className="rounded bg-muted/30 p-3 mb-2">{entry.title}</div>) : <p className="text-sm text-muted-foreground italic">No beliefs linked yet.</p>}
            </Card>
          </div>
        </div>
        <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2 italic">Library</h1>
          <p className="text-muted-foreground font-body text-lg">Sources are inputs: books, videos, movies, articles, lectures, conversations, and notes.</p>
        </div>
        <Button onClick={() => openEditor()}><Plus className="size-4 mr-2" /> Add Source</Button>
      </header>

      <div className="flex flex-col gap-3 mb-8 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sources..." className="pl-9 bg-white/70" />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as MediaType | 'all')}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {MEDIA_TYPES.map((type) => <SelectItem key={type} value={type}>{MEDIA_LABELS[type]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filtered.map((item) => (
          <Card key={item.id} className="cursor-pointer border-none shadow-none bg-transparent hover:-translate-y-2 transition-transform" onClick={() => setSelectedId(item.id)}>
            <div className="aspect-[2/3] rounded-sm overflow-hidden shadow-lg mb-4 bg-muted flex items-center justify-center p-4 text-center">
              <div>
                <div className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{MEDIA_LABELS[item.type]}</div>
                <h3 className="font-headline text-lg italic">{item.title}</h3>
              </div>
            </div>
            <h3 className="font-headline text-base leading-tight line-clamp-2">{item.title}</h3>
            <p className="font-code text-[10px] text-muted-foreground uppercase tracking-widest">{item.creator}</p>
          </Card>
        ))}
      </div>

      <MediaEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draft} setDraft={setDraft} onSave={saveMedia} />
    </div>
  );
}

function CaptureField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="font-code text-[10px] uppercase tracking-widest">{label}</Label>
      <Textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-h-[100px]" />
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-headline text-2xl italic">{draft.id ? 'Edit Source' : 'Add Source'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={draft.title || ''} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} /></div>
          <div className="space-y-2"><Label>Creator</Label><Input value={draft.creator || ''} onChange={(event) => setDraft((prev) => ({ ...prev, creator: event.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={draft.type || 'book'} onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as MediaType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEDIA_TYPES.map((type) => <SelectItem key={type} value={type}>{MEDIA_LABELS[type]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={onSave}>Save Source</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
