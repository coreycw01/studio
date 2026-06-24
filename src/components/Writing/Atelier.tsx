
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ChevronLeft,
  Download,
  Save,
  Trash2,
  FileText,
  Layout,
  Maximize2,
  Minimize2,
  Search,
  Plus,
  Link2,
  Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { FormattingToolbar } from './FormattingToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { PageViewControls } from './PageViewControls';
import type { Concept, Draft, DraftStatus, DraftType, ExternalDocProvider, Media, VaultEntry, Question } from '@/lib/types';
import { DRAFT_LABELS, normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  onAddDraft: (data: Partial<Draft>) => void;
  onUpdateDraft: (draft: Draft) => void;
  onDeleteDraft: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
}

const statuses: DraftStatus[] = ['seed', 'drafting', 'revised', 'final'];

export function Atelier({ drafts, media, vault, questions, concepts, onAddDraft, onUpdateDraft, onDeleteDraft, onAddConcept }: AtelierProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | DraftType | DraftStatus>('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: '', type: 'essay' as DraftType });
  
  // Page View & Style State
  const [viewMode, setViewMode] = useState<PageViewMode>('vertical-continuous');
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [paperColor, setPaperColor] = useState<PaperColor>('blank');
  const [paperPattern, setPaperPattern] = useState<PaperPattern>('none');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  
  const { toast } = useToast();
  const active = drafts.find((draft) => draft.id === activeId) || null;
  
  const visibleDrafts = drafts
    .filter((draft) => {
      if (filter === 'all') return true;
      return draft.type === filter || draft.status === filter;
    })
    .filter(draft => !search || draft.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime());

  const handleUpdateContent = useCallback((newContent: string) => {
    if (!active) return;
    setSaveStatus('saving');
    onUpdateDraft({ ...active, body: newContent, dateUpdated: today() });
    setTimeout(() => setSaveStatus('saved'), 1000);
  }, [active, onUpdateDraft]);

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
    
    toast({ title: "Manuscript Exported", description: "Your synthesis is ready as a Markdown file." });
  };

  const openNewDraft = (type: DraftType) => {
    setNewDraft({ title: '', type });
    setIsAddOpen(true);
  };

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
                <ChevronLeft className="size-4" /> BACK TO MANUSCRIPTS
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 mr-4">
                  <span className="font-code text-[9px] uppercase tracking-widest opacity-40 font-bold">STATUS</span>
                  <Select value={active.status} onValueChange={(value) => onUpdateDraft({ ...active, status: value as DraftStatus })}>
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
                  onChange={(e) => onUpdateDraft({ ...active, title: e.target.value })}
                  placeholder="Enter Manuscript Title..."
                />
                <div className="flex items-center gap-3 bg-muted/10 px-4 py-2 rounded-full border border-border/30">
                  <div className={cn("size-2 rounded-full", saveStatus === 'saved' ? "bg-emerald-500" : saveStatus === 'saving' ? "bg-amber-500 animate-pulse" : "bg-red-400")} />
                  <span className="font-code text-[9px] uppercase tracking-widest font-bold opacity-60">
                    {saveStatus === 'saved' ? 'Changes Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/10">
                <div className="flex items-center gap-4">
                   <span className="font-code text-[10px] uppercase tracking-widest opacity-40 font-bold">CONCEPTS</span>
                   <ConceptTagPicker 
                    concepts={concepts} 
                    value={active.conceptTags || []} 
                    onChange={(tags) => onUpdateDraft({ ...active, conceptTags: normalizeConceptTags(tags) })} 
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
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search manuscripts..." 
              className="w-72 pl-9 h-9 rounded-full" 
            />
          </div>
          <Button variant="outline" onClick={() => openNewDraft('field_note')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold border-border/60 bg-white">Notes</Button>
          <Button variant="outline" onClick={() => openNewDraft('script')} size="sm" className="h-9 px-5 font-code text-[10px] tracking-widest rounded-full uppercase font-bold border-border/60 bg-white">+ SCRIPT</Button>
          <Button onClick={() => openNewDraft('essay')} size="sm" className="bg-accent hover:bg-accent/90 h-9 px-7 font-code text-[10px] tracking-widest shadow-lg shadow-accent/20 text-white border-accent rounded-full uppercase font-bold">+ ESSAY</Button>
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
            onClick={() => setActiveId(draft.id)}
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
                onChange={(e) => setNewDraft((prev) => ({ ...prev, title: e.target.value }))} 
                placeholder="Enter a working title..."
                className="h-12 text-base font-body italic rounded-full"
              />
            </div>
          </div>
          <DialogFooter className="pt-8 gap-3">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-11 px-8 font-code text-[10px] tracking-widest uppercase font-bold text-muted-foreground hover:bg-transparent rounded-full">CANCEL</Button>
            <Button onClick={() => {
              if (!newDraft.title.trim()) return;
              onAddDraft({ ...newDraft, body: '', status: 'seed', conceptTags: [], sourceIds: [], questionIds: [], beliefIds: [], dateCreated: today(), dateUpdated: today() });
              setIsAddOpen(false);
            }} className="h-11 px-10 bg-accent font-code text-[10px] tracking-widest uppercase shadow-xl shadow-accent/20 rounded-full font-bold">ANCHOR WORK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
