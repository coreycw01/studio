
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Cloud, 
  ExternalLink, 
  Link2, 
  Plus, 
  RefreshCw, 
  Save, 
  Search, 
  Trash2, 
  Unlink, 
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Baseline,
  ChevronDown,
  List,
  ListOrdered,
  Download,
  Clock,
  FileText,
  FileBox,
  MonitorPlay,
  Type as TypeIcon
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

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
  const [docTargetId, setDocTargetId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState({ title: '', type: 'essay' as DraftType });
  const [docDraft, setDocDraft] = useState({ title: '', url: '', provider: 'google_docs' as ExternalDocProvider, autoSync: true });
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'scroll' | 'page'>('scroll');
  const { toast } = useToast();
  
  const active = drafts.find((draft) => draft.id === activeId) || null;
  
  const visibleDrafts = drafts
    .filter((draft) => {
      if (filter === 'all') return true;
      return draft.type === filter || draft.status === filter;
    })
    .filter(draft => !search || draft.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime());

  const wordCount = active?.body.split(/\s+/).filter(Boolean).length || 0;
  const readingTime = Math.ceil(wordCount / 225);

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

  const openDocDialog = (draftId?: string) => {
    const target = drafts.find(d => d.id === draftId) || active;
    if (!target) return;
    setDocTargetId(target.id);
    setDocDraft({
      title: target.externalDoc?.title || target.title || '',
      url: target.externalDoc?.url || '',
      provider: target.externalDoc?.provider || 'google_docs',
      autoSync: target.externalDoc?.autoSync ?? true,
    });
    setIsDocOpen(true);
  };

  const connectExternalDoc = () => {
    const targetId = docTargetId || activeId;
    if (!targetId) return;
    const target = drafts.find(d => d.id === targetId);
    if (!target || !docDraft.url.trim()) return;

    const url = docDraft.url.trim();
    const provider = docDraft.provider || detectProvider(url);
    onUpdateDraft({
      ...target,
      externalDoc: {
        provider,
        title: docDraft.title.trim() || target.title,
        url,
        documentId: extractDocumentId(url),
        autoSync: docDraft.autoSync,
        syncStatus: 'connected',
      },
      dateUpdated: today(),
    });
    setIsDocOpen(false);
  };

  const detachExternalDoc = (draftId?: string) => {
    const target = drafts.find(d => d.id === (draftId || activeId));
    if (!target) return;
    const { externalDoc, ...rest } = target;
    onUpdateDraft({ ...rest, dateUpdated: today() });
  };

  const exportManuscript = () => {
    if (!active) return;
    const content = `# ${active.title}\n\nType: ${DRAFT_LABELS[active.type]}\nStatus: ${active.status}\nConcepts: ${(active.conceptTags || []).join(', ')}\nDate Exported: ${new Date().toLocaleString()}\n\n---\n\n${active.body}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${active.title.replace(/\s+/g, '_')}_Noesis_Export.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Manuscript Exported",
      description: "Your synthesis is ready as a Markdown file."
    });
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
  }, [active?.id, active?.externalDoc?.autoSync]);

  if (active) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background font-body">
        <header className="px-8 pt-8 pb-8 border-b border-border/30 bg-background/80 backdrop-blur z-30">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between">
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

                <Button variant="outline" size="sm" onClick={exportManuscript} className="h-9 px-5 rounded-full font-bold shadow-sm bg-white border-border/60">
                  <Download className="size-4 mr-2" /> Export
                </Button>
                <Button onClick={() => onUpdateDraft(active)} size="sm" className="bg-accent h-9 px-6 rounded-full font-bold shadow-lg shadow-accent/20">
                  <Save className="size-4 mr-2" /> SAVE
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { onDeleteDraft(active.id); setActiveId(null); }} className="h-9 w-9 rounded-full shadow-sm">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Input 
                className="bg-transparent border-none text-4xl font-headline font-bold focus-visible:ring-0 italic p-0 h-auto rounded-none shadow-none text-primary placeholder:text-muted-foreground/20 w-full" 
                value={active.title} 
                onChange={(event) => updateActive({ title: event.target.value })}
                placeholder="Enter Manuscript Title..."
              />
              
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
                
                <div className="flex items-center gap-6 opacity-60">
                  <div className="text-right flex items-center gap-2">
                    <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">WORDS</span>
                    <span className="font-code text-[10px] font-bold text-primary">{wordCount}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">READ TIME</span>
                    <span className="font-code text-[10px] font-bold text-primary">{readingTime}m</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">UPDATED</span>
                    <span className="font-code text-[10px] font-bold text-primary">{new Date(active.dateUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <FormattingToolbar viewMode={viewMode} onViewModeChange={setViewMode} />

        <ScrollArea className="flex-1 bg-muted/5">
          <div className={cn(
            "mx-auto transition-all duration-300",
            viewMode === 'page' 
              ? "max-w-[850px] my-12 bg-white min-h-[1100px] shadow-2xl border border-border/40 p-24 rounded-sm"
              : "max-w-3xl px-8 py-16"
          )}>
            <div className="space-y-12">
              {active.externalDoc && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-6 flex flex-wrap items-center justify-between gap-4">
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
                    <Button variant="ghost" size="sm" onClick={() => detachExternalDoc()} className="rounded-full text-destructive hover:text-destructive">
                      <Unlink className="mr-2 size-4" /> Detach
                    </Button>
                  </div>
                </div>
              )}

              <Textarea 
                className={cn(
                  "w-full border-none shadow-none focus-visible:ring-0 resize-none bg-transparent p-0 italic text-primary/90 placeholder:text-muted-foreground/10",
                  viewMode === 'page' ? "text-[18px] leading-[2.4] min-h-[900px]" : "text-[21px] leading-[2.2] min-h-[600px]"
                )}
                placeholder={active.externalDoc ? "Sync your external document to update this text..." : "Begin your synthesis..."} 
                value={active.body} 
                onChange={(event) => updateActive({ body: event.target.value })} 
                readOnly={!!active.externalDoc}
              />
            </div>
          </div>
        </ScrollArea>
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDocDialog()} size="sm" className="h-9 px-5 rounded-full font-bold border-border/60 bg-white">
              <Link2 className="size-4 mr-2" /> Connect Doc
            </Button>
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
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border border-accent/20 bg-white/95 p-6 rounded-xl shadow-md relative"
          >
            <div className="flex justify-between items-start mb-4" onClick={() => setActiveId(draft.id)}>
              <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                {DRAFT_LABELS[draft.type]}
              </span>
              <Badge variant="outline" className="font-code text-[8px] uppercase tracking-tighter bg-white shadow-sm border-border/60 rounded-full font-bold px-2 py-0.5">
                {draft.status}
              </Badge>
            </div>
            
            <h3 className="font-headline text-2xl font-bold italic leading-tight group-hover:text-accent transition-colors text-primary mb-6" onClick={() => setActiveId(draft.id)}>
              {draft.title || "Untitled Draft"}
            </h3>
            
            <div className="flex flex-wrap gap-1.5 mb-6" onClick={() => setActiveId(draft.id)}>
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
                  <button 
                    onClick={() => openDocDialog(draft.id)}
                    className="flex items-center gap-1.5 hover:text-accent transition-colors"
                  >
                    <Badge variant="secondary" className="rounded-full bg-accent/5 text-accent/60 border-accent/10 font-code text-[7px] uppercase tracking-widest px-2">
                      <Cloud className="mr-1 size-2.5" /> {providerLabels[draft.externalDoc.provider]}
                    </Badge>
                  </button>
                ) : (
                  <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">
                    {draft.body.split(/\s+/).filter(Boolean).length} WORDS
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <time className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/20 font-bold">
                  {new Date(draft.dateUpdated).toLocaleDateString()}
                </time>
                <button 
                  onClick={(e) => { e.stopPropagation(); openDocDialog(draft.id); }} 
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-accent"
                >
                  <Link2 className="size-3.5" />
                </button>
              </div>
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

function FormattingToolbar({ viewMode, onViewModeChange }: { viewMode: 'scroll' | 'page', onViewModeChange: (v: 'scroll' | 'page') => void }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center border-b border-border/30 bg-background/95 backdrop-blur py-2 px-8">
      <div className="flex items-center gap-1 p-1.5 rounded-full border border-border/60 bg-white shadow-sm overflow-x-auto max-w-full">
        
        <div className="flex items-center px-4 border-r border-border/40 gap-3">
          <button 
            onClick={() => onViewModeChange('scroll')}
            className={cn(
              "p-1.5 rounded-full transition-all flex items-center gap-1.5",
              viewMode === 'scroll' ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-primary"
            )}
            title="Continuous Scroll"
          >
            <MonitorPlay className="size-3.5" />
            <span className="text-[9px] font-code font-bold uppercase tracking-widest">SCROLL</span>
          </button>
          <button 
            onClick={() => onViewModeChange('page')}
            className={cn(
              "p-1.5 rounded-full transition-all flex items-center gap-1.5",
              viewMode === 'page' ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-primary"
            )}
            title="Page View"
          >
            <FileBox className="size-3.5" />
            <span className="text-[9px] font-code font-bold uppercase tracking-widest">PAGE</span>
          </button>
        </div>

        <div className="flex items-center px-3 border-r border-border/40 gap-2">
          <TypeIcon className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-body italic text-primary/80">Spectral</span>
          <ChevronDown className="size-3 text-muted-foreground/50" />
        </div>

        <div className="flex items-center px-3 border-r border-border/40 gap-2">
          <span className="text-[11px] font-code font-bold text-primary/80">14</span>
          <ChevronDown className="size-3 text-muted-foreground/50" />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={Bold} />
          <ToolbarButton icon={Italic} />
          <ToolbarButton icon={Underline} />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={AlignLeft} active />
          <ToolbarButton icon={AlignCenter} />
          <ToolbarButton icon={AlignRight} />
          <ToolbarButton icon={AlignJustify} />
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          <ToolbarButton icon={List} />
          <ToolbarButton icon={ListOrdered} />
        </div>

        <div className="flex items-center gap-0.5 px-2">
          <ToolbarButton icon={Baseline} />
          <div className="flex items-center gap-1.5 ml-2 mr-1 group cursor-pointer">
            <div className="size-3.5 rounded-full bg-primary shadow-sm" />
            <ChevronDown className="size-2.5 text-muted-foreground/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, active }: { icon: any, active?: boolean }) {
  return (
    <button className={cn(
      "size-8 rounded-full flex items-center justify-center transition-all hover:bg-muted",
      active ? "bg-accent/10 text-accent" : "text-muted-foreground"
    )}>
      <Icon className="size-3.5" />
    </button>
  );
}
