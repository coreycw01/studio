"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Cloud,
  Download,
  ExternalLink,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlink,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { FormattingToolbar } from './FormattingToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { PageViewControls } from './PageViewControls';
import type { Concept, Draft, DraftStatus, DraftType, ExternalDocProvider, Media, Question, UserPreferences, VaultEntry, WritingStyle } from '@/lib/types';
import { DRAFT_LABELS, WRITING_STYLE_LABELS, WRITING_STYLES, normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { escapeTextAsHtml, sanitizeHtml } from '@/lib/sanitize';

export type PageViewMode = 'vertical-continuous' | 'vertical-single' | 'horizontal-single';
export type PageSize = 'letter' | 'a4';
export type PaperColor = 'blank' | 'warm' | 'sepia' | 'dark';
export type PaperPattern = 'none' | 'notebook' | 'grid';

interface AtelierProps {
  drafts: Draft[];
  media: Media[];
  vault: VaultEntry[];
  questions: Question[];
  concepts: Concept[];
  writingDefaults: UserPreferences['writingDefaults'];
  onAddDraft: (data: Partial<Draft>) => void;
  onUpdateDraft: (draft: Draft) => void;
  onDeleteDraft: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const statuses: DraftStatus[] = ['seed', 'drafting', 'revised', 'final'];
const articulationTypes: DraftType[] = ['essay', 'script', 'field_note', 'voice_note', 'talk_to_text', 'drawing', 'recording'];
const workFilters: ('all' | DraftType | DraftStatus)[] = ['all', ...articulationTypes, 'drafting', 'final'];

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

function canvasStyleForWriting(style: WritingStyle): { color: PaperColor; pattern: PaperPattern } {
  switch (style) {
    case 'ruled_notebook':
    case 'manuscript':
      return { color: 'blank', pattern: 'notebook' };
    case 'mind_map':
    case 'timeline':
      return { color: 'blank', pattern: 'grid' };
    case 'cornell_notes':
    case 'two_column_debate':
    case 'dialectic':
    case 'belief_audit':
    case 'source_analysis':
      return { color: 'warm', pattern: 'none' };
    default:
      return { color: 'blank', pattern: 'none' };
  }
}

export function Atelier({ drafts, concepts, writingDefaults, onAddDraft, onUpdateDraft, onDeleteDraft, onAddConcept }: AtelierProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | DraftType | DraftStatus>('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({
    title: '',
    type: writingDefaults.type as DraftType,
    writingStyle: writingDefaults.writingStyle as WritingStyle,
  });
  const [docDraft, setDocDraft] = useState({ title: '', url: '', provider: 'google_docs' as ExternalDocProvider, autoSync: true });
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [draftBuffer, setDraftBuffer] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);

  const [viewMode, setViewMode] = useState<PageViewMode>('vertical-continuous');
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [paperColor, setPaperColor] = useState<PaperColor>('blank');
  const [paperPattern, setPaperPattern] = useState<PaperPattern>('none');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const { toast } = useToast();
  const activeFromStore = drafts.find((draft) => draft.id === activeId) || null;
  const active = draftBuffer || activeFromStore;

  const visibleDrafts = drafts
    .filter((draft) => {
      if (filter === 'all') return true;
      return draft.type === filter || draft.status === filter;
    })
    .filter((draft) => !search || draft.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime());

  const updateActive = useCallback((patch: Partial<Draft>) => {
    setDraftBuffer((current) => {
      const base = current || activeFromStore;
      if (!base) return current;
      return { ...base, ...patch, dateUpdated: today() };
    });
    setDirty(true);
    setSaveStatus('unsaved');
  }, [activeFromStore]);

  const saveActive = useCallback(() => {
    if (!active) return;
    setSaveStatus('saving');
    onUpdateDraft({ ...active, dateUpdated: today() });
    setDirty(false);
    window.setTimeout(() => setSaveStatus('saved'), 600);
  }, [active, onUpdateDraft]);

  const handleUpdateContent = useCallback((newContent: string) => {
    updateActive({ body: sanitizeHtml(newContent) });
  }, [updateActive]);

  const exportManuscript = () => {
    if (!active) return;
    const content = `# ${active.title}\n\nType: ${DRAFT_LABELS[active.type]}\nStatus: ${active.status}\nConcepts: ${(active.conceptTags || []).join(', ')}\n\n---\n\n${active.body.replace(/<[^>]+>/g, '\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${active.title.replace(/\s+/g, '_')}_Noesis_Export.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Manuscript Exported', description: 'Your synthesis is ready as a Markdown file.' });
  };

  const createDraft = () => {
    if (!newDraft.title.trim()) return;
    onAddDraft({
      ...newDraft,
      body: '',
      status: writingDefaults.status,
      conceptTags: [],
      sourceIds: [],
      questionIds: [],
      beliefIds: [],
      dateCreated: today(),
      dateUpdated: today(),
    });
    setIsAddOpen(false);
    setNewDraft({ title: '', type: writingDefaults.type, writingStyle: writingDefaults.writingStyle });
  };

  const openNewDraft = (type: DraftType) => {
    setNewDraft({ title: '', type, writingStyle: writingDefaults.writingStyle });
    setIsAddOpen(true);
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
    updateActive({
      externalDoc: {
        provider,
        title: docDraft.title.trim() || active.title,
        url,
        documentId: extractDocumentId(url),
        autoSync: docDraft.autoSync,
        syncStatus: 'connected',
      },
    });
    setIsDocOpen(false);
  };

  const detachExternalDoc = () => {
    if (!active) return;
    const { externalDoc, ...rest } = active;
    setDraftBuffer(rest);
    setDirty(true);
    setSaveStatus('unsaved');
  };

  const syncExternalDoc = async (draft: Draft) => {
    if (!draft.externalDoc?.url || syncingId === draft.id) return;
    setSyncingId(draft.id);
    updateActive({ externalDoc: { ...draft.externalDoc, syncStatus: 'syncing', syncError: '' } });
    try {
      const response = await fetch('/api/import-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: draft.externalDoc.url, provider: draft.externalDoc.provider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Document sync failed.');
      updateActive({
        body: escapeTextAsHtml(result.text),
        externalDoc: {
          ...draft.externalDoc,
          lastSyncedAt: result.importedAt || today(),
          syncStatus: 'synced',
          syncError: result.truncated ? 'Imported text was truncated to keep the draft responsive.' : '',
        },
      });
    } catch (error) {
      updateActive({
        externalDoc: {
          ...draft.externalDoc,
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Document sync failed.',
        },
      });
    } finally {
      setSyncingId(null);
    }
  };

  useEffect(() => {
    if (!activeFromStore) {
      setDraftBuffer(null);
      setDirty(false);
      setSaveStatus('saved');
      return;
    }
    setDraftBuffer(activeFromStore);
    setDirty(false);
    setSaveStatus('saved');
  }, [activeFromStore?.id]);

  useEffect(() => {
    const style = active?.writingStyle || writingDefaults.writingStyle;
    const canvas = canvasStyleForWriting(style);
    setPaperColor(canvas.color);
    setPaperPattern(canvas.pattern);
  }, [active?.id, active?.writingStyle, writingDefaults.writingStyle]);

  useEffect(() => {
    if (!dirty || !active) return;
    const timeout = window.setTimeout(() => {
      setSaveStatus('saving');
      onUpdateDraft({ ...active, dateUpdated: today() });
      setDirty(false);
      window.setTimeout(() => setSaveStatus('saved'), 600);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [active, dirty, onUpdateDraft]);

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

  if (active) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden font-body">
        <header className="px-8 pt-8 pb-4 border-b border-border/30 bg-background/80 backdrop-blur z-50">
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveId(null)}
                className="font-code text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
              >
                <ChevronLeft className="size-4" /> BACK TO WORKS
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-3">
                  <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">PAPER</span>
                  <Select value={active.writingStyle || writingDefaults.writingStyle} onValueChange={(value) => updateActive({ writingStyle: value as WritingStyle })}>
                    <SelectTrigger className="h-8 border-border/40 bg-white shadow-sm font-code text-[9px] uppercase tracking-wider rounded-full w-44 px-3 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WRITING_STYLES.map((style) => (
                        <SelectItem key={style} value={style} className="font-code text-[9px] uppercase">{WRITING_STYLE_LABELS[style]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={openDocDialog} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white border-border/60">
                  <Link2 className="size-4 mr-2" /> {active.externalDoc ? 'Doc' : 'Connect Doc'}
                </Button>
                <Button variant="outline" size="sm" onClick={saveActive} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white border-border/60">
                  <Save className="size-4 mr-2" /> {dirty ? 'Save*' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportManuscript} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white border-border/60">
                  <Download className="size-4 mr-2" /> Export
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { onDeleteDraft(active.id); setActiveId(null); }} className="h-9 w-9 rounded-full shadow-sm">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Input
                  className="bg-transparent border-none text-4xl font-headline font-bold focus-visible:ring-0 italic p-0 h-auto rounded-none shadow-none text-primary placeholder:text-muted-foreground/20 flex-1"
                  value={active.title}
                  onChange={(event) => updateActive({ title: event.target.value })}
                  placeholder="Enter Work Title..."
                />
                <div className="flex items-center gap-3 bg-muted/10 px-4 py-2 rounded-full border border-border/30">
                  <div className={cn('size-2 rounded-full', saveStatus === 'saved' ? 'bg-emerald-500' : saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-red-400')} />
                  <span className="font-code text-[9px] uppercase tracking-widest font-bold opacity-60">
                    {saveStatus === 'saved' ? 'Changes Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                  </span>
                </div>
              </div>

              {active.externalDoc && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-code text-[9px] uppercase tracking-widest text-accent font-bold">External Writing Source</div>
                    <p className="font-body text-sm italic text-primary/80">
                      {providerLabels[active.externalDoc.provider]} - {active.externalDoc.title || active.title}
                    </p>
                    <p className="font-code text-[8px] uppercase tracking-widest text-muted-foreground mt-1">
                      {active.externalDoc.lastSyncedAt ? `Last synced ${new Date(active.externalDoc.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                      {active.externalDoc.syncError ? ` - ${active.externalDoc.syncError}` : ''}
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

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/10">
                <div className="flex items-center gap-4">
                  <span className="font-code text-[10px] uppercase tracking-widest opacity-40 font-bold">CONCEPTS</span>
                  <ConceptTagPicker
                    concepts={concepts}
                    value={active.conceptTags || []}
                    onChange={(tags) => updateActive({ conceptTags: normalizeConceptTags(tags) })}
                    onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })}
                    compact
                  />
                </div>

                <PageViewControls
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  paperColor={paperColor}
                  onPaperColorChange={setPaperColor}
                  paperPattern={paperPattern}
                  onPaperPatternChange={setPaperPattern}
                />
              </div>
            </div>
          </div>
        </header>

        <FormattingToolbar saveStatus={saveStatus} />

        <div className="flex-1 overflow-hidden relative">
          <DocumentCanvas
            content={active.body}
            onContentChange={handleUpdateContent}
            viewMode={viewMode}
            pageSize={pageSize}
            paperColor={paperColor}
            paperPattern={paperPattern}
            title={active.title}
          />
        </div>

        <ExternalDocDialog
          open={isDocOpen}
          onOpenChange={setIsDocOpen}
          docDraft={docDraft}
          setDocDraft={setDocDraft}
          onConnect={connectExternalDoc}
        />
      </div>
    );
  }

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
          <div className="flex flex-wrap justify-end gap-2">
            {articulationTypes.map((type) => (
              <Button
                key={type}
                variant={type === 'essay' ? 'default' : 'outline'}
                onClick={() => openNewDraft(type)}
                size="sm"
                className={cn(
                  'h-9 px-4 font-code text-[10px] tracking-widest rounded-full uppercase font-bold shadow-sm',
                  type === 'essay' ? 'shadow-accent/20' : 'border-border/60 bg-card'
                )}
              >
                + {DRAFT_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="mb-12">
        <div className="flex flex-wrap gap-2.5">
          {workFilters.map((val) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                'px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm',
                filter === val
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5'
              )}
            >
              {val === 'all' ? 'ALL' : DRAFT_LABELS[val as DraftType] || val.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleDrafts.map((draft) => (
          <Card
            key={draft.id}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border border-accent/20 bg-white/95 p-6 rounded-xl shadow-md relative"
            onClick={() => setActiveId(draft.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                {DRAFT_LABELS[draft.type]}
              </span>
              <div className="flex items-center gap-2">
                {draft.externalDoc && <Cloud className="size-3.5 text-accent" />}
                <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter bg-white shadow-sm border-border/60 rounded-full font-bold px-2 py-0.5">
                  {draft.status}
                </Badge>
              </div>
            </div>

            <h3 className="font-headline text-2xl font-bold italic leading-tight group-hover:text-accent transition-colors text-primary mb-6">
              {draft.title || 'Untitled Draft'}
            </h3>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-widest bg-accent/10 text-accent border-transparent rounded-full font-bold">
                {WRITING_STYLE_LABELS[draft.writingStyle || writingDefaults.writingStyle]}
              </Badge>
              {(draft.conceptTags || []).slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-code text-[8px] uppercase tracking-widest bg-muted/20 border-transparent text-muted-foreground/60 rounded-full font-bold">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border/20">
              <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">
                {draft.body.split(/\s+/).filter(Boolean).length} WORDS
              </div>
              <time className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/20 font-bold">
                {new Date(draft.dateUpdated).toLocaleDateString()}
              </time>
            </div>
          </Card>
        ))}

        <Card
          className="aspect-video rounded-xl border-2 border-dashed border-border/50 bg-white/50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
          onClick={() => openNewDraft(writingDefaults.type)}
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
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">STARTING PAPER</Label>
              <Select value={newDraft.writingStyle} onValueChange={(value) => setNewDraft((prev) => ({ ...prev, writingStyle: value as WritingStyle }))}>
                <SelectTrigger className="h-11 rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WRITING_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>{WRITING_STYLE_LABELS[style]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

function ExternalDocDialog({
  open,
  onOpenChange,
  docDraft,
  setDocDraft,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docDraft: { title: string; url: string; provider: ExternalDocProvider; autoSync: boolean };
  setDocDraft: React.Dispatch<React.SetStateAction<{ title: string; url: string; provider: ExternalDocProvider; autoSync: boolean }>>;
  onConnect: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">Cancel</Button>
          <Button onClick={onConnect} disabled={!docDraft.url.trim()} className="rounded-full bg-accent px-8">Connect Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
