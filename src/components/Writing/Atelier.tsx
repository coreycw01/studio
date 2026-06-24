
"use client";

import React, { useEffect, useState } from 'react';
import { Cloud, ExternalLink, Link2, Plus, RefreshCw, Save, Search, Trash2, Unlink, ChevronLeft } from 'lucide-react';
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
    .filter(draft => !search || draft.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime());

  const createDraft = () => {
    if (!newDraft.title.trim()) return;
    onAddDraft({
      ...newDraft,
      body: '',
      status: 'seed',
      conceptTags: [],
      sourceIds: [],
      questionIds: [],
      beliefIds: []
    });
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

  // Detail View (The Full Page Editor)
  if (active) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background font-body">
        <header className="px-8 pt-8 pb-6 border-b border-border/30 bg-background/80 backdrop-blur z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => setActiveId(null)}
              className="font-code text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <ChevronLeft className="size-4" /> BACK TO MANUSCRIPTS
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 mr-4">
                <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">STATUS</span>
                <Select value={active.status} onValueChange={(value) => updateActive({ status: value as DraftStatus })}>
                  <SelectTrigger className="h-8 border-border/40 bg-white shadow-sm font-code text-[9px] uppercase tracking-wider rounded-full w-32 px-3 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s} className="font-code text-[9px] uppercase">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={openDocDialog} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white border-border/60">
                <Link2 className="size-4 mr-2" /> {active.externalDoc ? 'Doc' : 'Connect Doc'}
              </Button>
              <Button onClick={() => onUpdateDraft(active)} size="sm" className="bg-accent h-9 px-6 rounded-full font-bold shadow-lg shadow-accent/20">
                <Save className="size-4 mr-2" /> SAVE
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { onDeleteDraft(active.id); setActiveId(null); }} className="h-9 w-9 rounded-full shadow-sm">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-8 py-16">
            {active.externalDoc && (
              <div className="mb-12 rounded-xl border border-accent/20 bg-accent/5 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-code text-[9px] uppercase tracking-widest text-accent font-bold mb-1">External Writing Source</div>
                  <p className="font-body text-base italic text-primary/80 truncate">
                    {providerLabels[active.externalDoc.provider]} · {active.externalDoc.title || active.title}
                  </p>
                  <p className="font-code text-[8px] uppercase tracking-widest text-muted-foreground mt-2">
                    {active.externalDoc.lastSyncedAt ? `Last synced ${new Date(active.externalDoc.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                    {active.externalDoc.syncError ? ` · ${active.externalDoc.syncError}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => syncExternalDoc(active)} disabled={syncingId === active.id} className="rounded-full bg-white border-border/60">
                    <RefreshCw className={cn('mr-2 size-4', syncingId === active.id && 'animate-spin')} /> Sync
                  </Button>
                  <Button variant="outline" size="sm" asChild className="rounded-full bg-white border-border/60">
                    <a href={active.externalDoc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4" /> Open</a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={detachExternalDoc} className="rounded-full text-destructive hover:text-destructive">
                    <Unlink className="mr-2 size-4" /> Detach
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-12">
              <div className="space-y-4">
                <div className="font-code text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40 font-bold">{DRAFT_LABELS[active.type]}</div>
                <Input 
                  className="bg-transparent border-none text-5xl font-headline font-bold focus-visible:ring-0 italic p-0 h-auto rounded-none shadow-none text-primary placeholder:text-muted-foreground/20" 
                  value={active.title} 
                  onChange={(event) => updateActive({ title: event.target.value })}
                  placeholder="Manuscript Title..."
                />
              </div>

              <Textarea 
                className="w-full min-h-[600px] border-none shadow-none text-[21px] leading-[2.2] font-body focus-visible:ring-0 resize-none bg-transparent p-0 italic text-primary/90 placeholder:text-muted-foreground/10" 
                placeholder={active.externalDoc ? "Sync your external document to update this text..." : "Begin your synthesis..."} 
                value={active.body} 
                onChange={(event) => updateActive({ body: event.target.value })} 
                readOnly={!!active.externalDoc}
              />

              <div className="pt-16 border-t border-border/20">
                <div className="flex flex-col gap-8">
                  <section>
                    <h4 className="font-code text-[10px] uppercase tracking-widest opacity-40 mb-6 font-bold">Linked Concepts</h4>
                    <ConceptTagPicker 
                      concepts={concepts} 
                      value={active.conceptTags || []} 
                      onChange={(tags) => updateActive({ conceptTags: normalizeConceptTags(tags) })} 
                      onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} 
                    />
                  </section>
                  
                  <div className="flex justify-between items-center py-8 opacity-40">
                    <div className="font-code text-[10px] uppercase tracking-[0.2em] font-bold">
                      {active.body.split(/\s+/).filter(Boolean).length} WORDS
                    </div>
                    <div className="font-code text-[9px] uppercase tracking-widest font-bold">
                      UPDATED {new Date(active.dateUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
          <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="font-headline text-3xl italic">Connect External Document</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">Write in your preferred platform and let Noesis keep a synced copy.</p>
            </DialogHeader>
            <div className="space-y-6 pt-6">
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
                <Input value={docDraft.title} onChange={(event) => setDocDraft((prev) => ({ ...prev, title: event.target.value }))} className="h-11 rounded-full" />
              </div>
              <div className="space-y-2">
                <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">Document URL</Label>
                <Input
                  value={docDraft.url}
                  onChange={(event) => {
                    const url = event.target.value;
                    setDocDraft((prev) => ({ ...prev, url, provider: detectProvider(url) }));
                  }}
                  placeholder="Paste a Google Doc, Notion, or Markdown link..."
                  className="h-11 rounded-full"
                />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/5 p-4 cursor-pointer">
                <input type="checkbox" checked={docDraft.autoSync} onChange={(event) => setDocDraft((prev) => ({ ...prev, autoSync: event.target.checked }))} className="size-4 accent-accent" />
                <span className="text-sm font-body italic">Auto-sync while this draft is open</span>
              </label>
            </div>
            <DialogFooter className="pt-8 gap-3">
              <Button variant="ghost" onClick={() => setIsDocOpen(false)} className="rounded-full">Cancel</Button>
              <Button onClick={connectExternalDoc} disabled={!docDraft.url.trim()} className="rounded-full bg-accent px-8 shadow-lg shadow-accent/20">Connect Document</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Index View (The Card Grid)
  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-start mb-12">
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
              placeholder="Search manuscripts..." 
              className="w-72 pl-9 h-9 rounded-full" 
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openNewDraft('field_note')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold border-border/60 bg-white">Notes</Button>
            <Button variant="outline" onClick={() => openNewDraft('script')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold border-border/60 bg-white">+ SCRIPT</Button>
            <Button onClick={() => openNewDraft('essay')} size="sm" className="bg-accent hover:bg-accent/90 h-9 px-7 font-code text-[10px] tracking-widest shadow-lg shadow-accent/20 text-white border-accent rounded-full uppercase font-bold">+ ESSAY</Button>
          </div>
        </div>
      </header>

      <div className="mb-12">
        <div className="flex flex-wrap gap-2.5">
          {(['all', 'essay', 'script', 'field_note', 'drafting', 'final'] as const).map((val) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
                filter === val 
                  ? "bg-accent text-white border-accent" 
                  : "bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5"
              )}
            >
              {val === 'field_note' ? 'FIELD NOTES' : val === 'essay' ? 'ESSAYS' : val === 'script' ? 'SCRIPTS' : val.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleDrafts.map((draft) => (
          <Card 
            key={draft.id} 
            onClick={() => setActiveId(draft.id)}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border border-accent/20 bg-white/95 p-6 rounded-xl shadow-md"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                {DRAFT_LABELS[draft.type]}
              </span>
              <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter bg-white shadow-sm border-border/60 rounded-full font-bold px-2 py-0.5">
                {draft.status}
              </Badge>
            </div>
            
            <h3 className="font-headline text-2xl font-bold italic leading-tight group-hover:text-accent transition-colors text-primary mb-6">
              {draft.title || "Untitled Draft"}
            </h3>
            
            <div className="flex flex-wrap gap-1.5 mb-6">
              {(draft.conceptTags || []).slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-widest bg-muted/20 border-transparent text-muted-foreground/60 rounded-full font-bold">
                  {tag}
                </Badge>
              ))}
              {!draft.conceptTags?.length && <span className="text-[10px] italic text-muted-foreground/40 font-body">No concepts linked</span>}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border/20">
              <div className="flex items-center gap-2">
                {draft.externalDoc ? (
                  <Badge variant="secondary" className="rounded-full bg-accent/5 text-accent/60 border-accent/10 font-code text-[7px] uppercase tracking-widest px-2">
                    <Cloud className="mr-1 size-2.5" /> {providerLabels[draft.externalDoc.provider]}
                  </Badge>
                ) : (
                  <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">
                    {draft.body.split(/\s+/).filter(Boolean).length} WORDS
                  </div>
                )}
              </div>
              <time className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/20 font-bold">
                {new Date(draft.dateUpdated).toLocaleDateString()}
              </time>
            </div>
          </Card>
        ))}

        <Card 
          className="aspect-video rounded-xl border-2 border-dashed border-border/50 bg-white/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
          onClick={() => openNewDraft('essay')}
        >
          <div className="size-12 rounded-full bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md border border-border/30">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <div className="readex-kicker text-muted-foreground font-bold text-[10px]">INITIATE WORK</div>
        </Card>
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
                className="h-12 text-base font-body italic rounded-full"
              />
            </div>
          </div>
          <DialogFooter className="pt-8 gap-3">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-11 px-8 font-code text-[10px] tracking-widest uppercase font-bold text-muted-foreground hover:bg-transparent rounded-full">CANCEL</Button>
            <Button onClick={createDraft} className="h-11 px-10 bg-accent font-code text-[10px] tracking-widest uppercase shadow-xl shadow-accent/20 rounded-full font-bold">ANCHOR WORK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
