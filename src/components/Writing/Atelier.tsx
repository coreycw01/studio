"use client";

import React, { useEffect, useState } from 'react';
import { Cloud, ExternalLink, Link2, Plus, RefreshCw, Save, Search, Trash2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import type { Concept, Draft, DraftStatus, DraftType, ExternalDocProvider, Media, Question, VaultEntry } from '@/lib/types';
import { DRAFT_LABELS, normalizeConceptTags, today } from '@/lib/readex';
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

const providerLabels: Record<ExternalDocProvider, string> = {
  google_docs: 'Google Docs',
  notion: 'Notion',
  dropbox_paper: 'Dropbox Paper',
  microsoft_word: 'Microsoft Word',
  markdown: 'Markdown / Text',
  other: 'Other',
};

function detectProvider(url: string): ExternalDocProvider {
  if (url.includes('docs.google.com/document')) return 'google_docs';
  if (url.includes('notion.so')) return 'notion';
  if (url.includes('paper.dropbox.com')) return 'dropbox_paper';
  if (url.includes('office.com') || url.includes('sharepoint.com') || url.includes('onedrive.live.com')) return 'microsoft_word';
  if (url.endsWith('.md') || url.endsWith('.txt')) return 'markdown';
  return 'other';
}

function extractDocumentId(url: string) {
  const google = url.match(/docs\.google\.com\/document\/d\/([^/]+)/)?.[1];
  if (google) return google;
  const publishedGoogle = url.match(/docs\.google\.com\/document\/d\/e\/([^/]+)/)?.[1];
  if (publishedGoogle) return publishedGoogle;
  return undefined;
}

export function Atelier({ drafts, media, vault, questions, concepts, onAddDraft, onUpdateDraft, onDeleteDraft, onAddConcept }: AtelierProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | DraftType | DraftStatus>('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: '', type: 'essay' as DraftType });
  const [docDraft, setDocDraft] = useState({ title: '', url: '', provider: 'google_docs' as ExternalDocProvider, autoSync: true });
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  const active = drafts.find((draft) => draft.id === activeId) || null;
  
  const visibleDrafts = drafts
    .filter((draft) => {
      if (filter === 'all') return true;
      return draft.type === filter || draft.status === filter;
    })
    .filter(draft => !search || draft.title.toLowerCase().includes(search.toLowerCase()));

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

  const openDocDialog = () => {
    if (!active) return;
    setDocDraft({
      title: active.externalDoc?.title || active.title || '',
      url: active.externalDoc?.url || '',
      provider: active.externalDoc?.provider || 'google_docs',
      autoSync: active.externalDoc?.autoSync ?? true,
    });
    setIsDocOpen(true);
  };

  const connectExternalDoc = () => {
    if (!active || !docDraft.url.trim()) return;
    const url = docDraft.url.trim();
    const provider = docDraft.provider || detectProvider(url);
    onUpdateDraft({
      ...active,
      externalDoc: {
        provider,
        title: docDraft.title.trim() || active.title,
        url,
        documentId: extractDocumentId(url),
        autoSync: docDraft.autoSync,
        syncStatus: 'connected',
      },
      dateUpdated: today(),
    });
    setIsDocOpen(false);
  };

  const detachExternalDoc = () => {
    if (!active) return;
    const { externalDoc, ...rest } = active;
    onUpdateDraft({ ...rest, dateUpdated: today() });
  };

  const syncExternalDoc = async (draft: Draft) => {
    if (!draft.externalDoc?.url || syncingId === draft.id) return;
    setSyncingId(draft.id);
    onUpdateDraft({
      ...draft,
      externalDoc: { ...draft.externalDoc, syncStatus: 'syncing', syncError: '' },
      dateUpdated: today(),
    });

    try {
      const response = await fetch('/api/import-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: draft.externalDoc.url, provider: draft.externalDoc.provider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Document sync failed.');
      onUpdateDraft({
        ...draft,
        body: result.text,
        externalDoc: {
          ...draft.externalDoc,
          lastSyncedAt: result.importedAt || today(),
          syncStatus: 'synced',
          syncError: result.truncated ? 'Imported text was truncated to keep the draft responsive.' : '',
        },
        dateUpdated: today(),
      });
    } catch (error) {
      onUpdateDraft({
        ...draft,
        externalDoc: {
          ...draft.externalDoc,
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Document sync failed.',
        },
        dateUpdated: today(),
      });
    } finally {
      setSyncingId(null);
    }
  };

  const openNewDraft = (type: DraftType) => {
    setNewDraft({ title: '', type });
    setIsAddOpen(true);
  };

  useEffect(() => {
    if (!active?.externalDoc?.autoSync || active.externalDoc.syncStatus === 'syncing') return;
    const lastSynced = active.externalDoc.lastSyncedAt ? new Date(active.externalDoc.lastSyncedAt).getTime() : 0;
    if (Date.now() - lastSynced > 60_000) void syncExternalDoc(active);
    const interval = window.setInterval(() => {
      const latest = drafts.find((draft) => draft.id === active.id);
      if (latest?.externalDoc?.autoSync) void syncExternalDoc(latest);
    }, 120_000);
    return () => window.clearInterval(interval);
  }, [active?.id, active?.externalDoc?.autoSync]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="p-8 pt-8 w-full max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Works</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Develop essays, scripts, field notes, and longer pieces from the ideas gathered across Noesis.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="Search drafts..." 
                className="w-64 pl-9 bg-muted/40 font-code text-[11px] h-9" 
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openNewDraft('field_note')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold">+ FIELD NOTE</Button>
              <Button variant="outline" onClick={() => openNewDraft('script')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold">+ SCRIPT</Button>
              <Button onClick={() => openNewDraft('essay')} size="sm" className="bg-accent hover:bg-accent/90 h-9 px-7 font-code text-[10px] tracking-widest shadow-lg shadow-accent/20 text-white border-accent rounded-full uppercase font-bold">+ ESSAY</Button>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <p className="text-xl font-headline italic text-foreground/60 mb-5">Essays, scripts, field notes, and longer works</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'essay', 'script', 'field_note', 'drafting', 'final'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={cn(
                  "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all shadow-sm",
                  filter === val 
                    ? "bg-accent text-white shadow-md" 
                    : "bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5"
                )}
              >
                {val === 'field_note' ? 'FIELD NOTES' : val === 'essay' ? 'ESSAYS' : val === 'script' ? 'SCRIPTS' : val.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden px-8 pb-8 gap-12 max-w-7xl mx-auto w-full">
        {/* Left Side: Draft List */}
        <div className="w-1/3 flex flex-col overflow-hidden">
          {visibleDrafts.length > 0 ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {visibleDrafts.map((draft) => (
                  <Card 
                    key={draft.id} 
                    onClick={() => setActiveId(draft.id)}
                    className={cn(
                      "cursor-pointer p-6 transition-all border border-accent/20 bg-white/95 rounded-xl shadow-md group hover:shadow-xl hover:-translate-y-1",
                      activeId === draft.id && "border-accent ring-2 ring-accent"
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{DRAFT_LABELS[draft.type]}</span>
                      <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter bg-white shadow-sm border-border/60 rounded-full font-bold">{draft.status}</Badge>
                    </div>
                    <h3 className={cn(
                      "font-headline text-xl font-bold italic leading-tight group-hover:text-accent transition-colors",
                      activeId === draft.id ? "text-accent" : "text-primary"
                    )}>
                      {draft.title || "Untitled Draft"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 font-body italic mt-3 opacity-60">
                      {draft.conceptTags?.length ? draft.conceptTags.join(', ') : 'No concepts linked'}
                    </p>
                    {draft.externalDoc && (
                      <Badge variant="secondary" className="mt-3 rounded-full bg-accent/10 text-accent border-accent/20 font-code text-[8px] uppercase tracking-widest">
                        <Cloud className="mr-1 size-3" /> {providerLabels[draft.externalDoc.provider]}
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
              <p className="font-headline text-lg italic leading-relaxed">
                No drafts yet. Start with an essay, script, or field note.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Editor or Context */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-border/30 pl-12">
          {active ? (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-border/20">
                <div className="flex-1">
                  <Input 
                    className="bg-transparent border-none text-4xl font-headline font-bold focus-visible:ring-0 italic p-0 h-auto rounded-none shadow-none text-primary" 
                    value={active.title} 
                    onChange={(event) => updateActive({ title: event.target.value })} 
                  />
                  <div className="flex gap-6 mt-4">
                    <div className="flex items-center gap-3">
                      <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">TYPE</span>
                      <Select value={active.type} onValueChange={(value) => updateActive({ type: value as DraftType })}>
                        <SelectTrigger className="h-8 border-border/40 bg-white shadow-sm font-code text-[9px] uppercase tracking-wider rounded-full w-32 px-3 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="essay" className="font-code text-[9px] uppercase">Essay</SelectItem>
                          <SelectItem value="script" className="font-code text-[9px] uppercase">Script</SelectItem>
                          <SelectItem value="field_note" className="font-code text-[9px] uppercase">Field Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">STATUS</span>
                      <Select value={active.status} onValueChange={(value) => updateActive({ status: value as DraftStatus })}>
                        <SelectTrigger className="h-8 border-border/40 bg-white shadow-sm font-code text-[9px] uppercase tracking-wider rounded-full w-32 px-3 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s} value={s} className="font-code text-[9px] uppercase">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={openDocDialog} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white">
                    <Link2 className="size-4 mr-2" /> {active.externalDoc ? 'Doc' : 'Connect Doc'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onUpdateDraft(active)} className="h-9 px-6 rounded-full font-bold shadow-sm bg-white"><Save className="size-4 mr-2" /> Save</Button>
                  <Button variant="destructive" size="sm" onClick={() => { onDeleteDraft(active.id); setActiveId(null); }} className="h-9 w-9 rounded-full shadow-sm"><Trash2 className="size-4" /></Button>
                </div>
              </div>

              {active.externalDoc && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-code text-[9px] uppercase tracking-widest text-accent font-bold">External Writing Source</div>
                    <p className="font-body text-sm italic text-primary/80">
                      {providerLabels[active.externalDoc.provider]} · {active.externalDoc.title || active.title}
                    </p>
                    <p className="font-code text-[8px] uppercase tracking-widest text-muted-foreground mt-1">
                      {active.externalDoc.lastSyncedAt ? `Last synced ${new Date(active.externalDoc.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                      {active.externalDoc.syncError ? ` · ${active.externalDoc.syncError}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => syncExternalDoc(active)} disabled={syncingId === active.id} className="rounded-full bg-white">
                      <RefreshCw className={cn('mr-2 size-4', syncingId === active.id && 'animate-spin')} /> Sync Now
                    </Button>
                    <Button variant="outline" size="sm" asChild className="rounded-full bg-white">
                      <a href={active.externalDoc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4" /> Open</a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={detachExternalDoc} className="rounded-full text-destructive hover:text-destructive">
                      <Unlink className="mr-2 size-4" /> Detach
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-4 pt-6">
                <Textarea 
                  className="w-full h-full min-h-[50vh] border-none shadow-none text-[19px] leading-[2.2] font-body focus-visible:ring-0 resize-none bg-transparent p-0 italic text-primary/90" 
                  placeholder={active.externalDoc ? "Sync your external document to update this text..." : "Begin your synthesis..."} 
                  value={active.body} 
                  onChange={(event) => updateActive({ body: event.target.value })} 
                  readOnly={!!active.externalDoc}
                />
              </div>

              {/* Secondary Controls */}
              <div className="pt-8 border-t border-border/20 grid grid-cols-2 gap-12">
                <div>
                  <h4 className="font-code text-[10px] uppercase tracking-widest opacity-40 mb-4 font-bold">Linked Concepts</h4>
                  <ConceptTagPicker 
                    concepts={concepts} 
                    value={active.conceptTags || []} 
                    onChange={(tags) => updateActive({ conceptTags: normalizeConceptTags(tags) })} 
                    onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} 
                    compact 
                  />
                </div>
                <div className="flex flex-col justify-end items-end gap-2">
                   <p className="font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold">
                     {active.body.split(/\s+/).filter(Boolean).length} WORDS
                   </p>
                   <p className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/30 font-bold">
                     LAST SAVED {new Date(active.dateUpdated).toLocaleDateString()}
                   </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
              <p className="font-headline text-lg italic leading-relaxed">
                Select a manuscript or initiate a new work.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl bg-white">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">Initiate {DRAFT_LABELS[newDraft.type]}</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">MANUSCRIPT TITLE</Label>
              <Input 
                value={newDraft.title} 
                onChange={(event) => setNewDraft((prev) => ({ ...prev, title: event.target.value }))} 
                placeholder="Enter a working title..."
                className="h-12 text-base font-body italic"
              />
            </div>
          </div>
          <DialogFooter className="pt-8 gap-3">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-11 px-8 font-code text-[10px] tracking-widest uppercase font-bold text-muted-foreground hover:bg-transparent rounded-full">CANCEL</Button>
            <Button onClick={createDraft} className="h-11 px-10 bg-accent font-code text-[10px] tracking-widest uppercase shadow-xl shadow-accent/20 rounded-full font-bold">ANCHOR WORK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Connect External Document</DialogTitle>
            <p className="text-sm text-muted-foreground">Write in your preferred platform and let Noesis keep a synced copy when the document exposes readable text.</p>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">Platform</Label>
              <Select value={docDraft.provider} onValueChange={(value) => setDocDraft((prev) => ({ ...prev, provider: value as ExternalDocProvider }))}>
                <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(providerLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">Document Name</Label>
              <Input value={docDraft.title} onChange={(event) => setDocDraft((prev) => ({ ...prev, title: event.target.value }))} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">Document URL</Label>
              <Input
                value={docDraft.url}
                onChange={(event) => {
                  const url = event.target.value;
                  setDocDraft((prev) => ({ ...prev, url, provider: detectProvider(url) }));
                }}
                placeholder="Paste a Google Doc, Notion, Word, Markdown, or text link..."
                className="h-11"
              />
              <p className="text-xs text-muted-foreground italic">Auto-import works best with published Google Docs, public Markdown/text files, or pages that expose readable text.</p>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
              <input type="checkbox" checked={docDraft.autoSync} onChange={(event) => setDocDraft((prev) => ({ ...prev, autoSync: event.target.checked }))} className="size-4 accent-accent" />
              <span className="text-sm font-body">Auto-sync while this draft is open</span>
            </label>
          </div>
          <DialogFooter className="pt-6 gap-3">
            <Button variant="ghost" onClick={() => setIsDocOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={connectExternalDoc} disabled={!docDraft.url.trim()} className="rounded-full bg-accent px-8">Connect Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
