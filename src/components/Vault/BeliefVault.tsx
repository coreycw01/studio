
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, Edit, LayoutGrid, Lightbulb, Loader2, Plus, ShieldCheck, Table2, Trash2, Search, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ConceptTagPicker } from '@/components/ConceptTagPicker';
import { SourceLinker } from '@/components/SourceLinker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Concept, Draft, Media, PhilosophicalLink, Practice, Question, TimelineEvent, VaultEntry, VaultType } from '@/lib/types';
import { normalizeConceptTags, today } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { ConceptDetailDialog } from '@/components/Library/MediaLibrary';
import { NextPhilosophicalActionPanel } from '@/components/Philosophy/NextPhilosophicalActionPanel';
import { generateIdeaQuestions, formPositionFromIdea } from '@/ai/flows/philosophy-suggestions';
import { useToast } from '@/hooks/use-toast';
import { GenerativeAiIcon } from '@/components/GenerativeAiIcon';

interface BeliefVaultProps {
  entries: VaultEntry[];
  media: Media[];
  drafts: Draft[];
  practices: Practice[];
  questions: Question[];
  timeline: TimelineEvent[];
  concepts: Concept[];
  links: PhilosophicalLink[];
  onAddEntry: (data: Partial<VaultEntry>) => void;
  onUpdateEntry: (entry: VaultEntry) => void;
  onDeleteEntry: (id: string) => void;
  onAddConcept: (data: Partial<Concept>) => void;
  onCreateLink: (data: Partial<PhilosophicalLink>) => void;
  onAddDraft: (data: Partial<Draft>) => void;
  onAddPractice: (data: Partial<Practice>) => void;
  onCreateIdea: (data: { title: string; body: string; tags: string[]; sourceIds: string[]; position?: { title: string; statement: string; description: string; confidence: number } }) => void;
  onUpdateLink?: (link: PhilosophicalLink) => void;
  focusedEntryId?: string | null;
  onFocusedEntryHandled?: () => void;
}

const vaultTypes: VaultType[] = ['belief', 'principle', 'mental_model', 'life_rule', 'worldview'];

const TYPE_LABELS: Record<VaultType, string> = {
  belief: 'Belief',
  principle: 'Principle',
  mental_model: 'Mental Model',
  life_rule: 'Life Rule',
  worldview: 'Worldview',
};

function safePosition(entry: VaultEntry): VaultEntry {
  const title = entry.title || entry.statement || entry.description || 'Untitled Position';
  return {
    ...entry,
    id: entry.id || title,
    title,
    type: (entry.type || 'belief') as VaultType,
    statement: entry.statement || entry.description || '',
    description: entry.description || entry.statement || '',
    confidence: Number.isFinite(entry.confidence) ? entry.confidence : 3,
    status: entry.status || 'active',
    tags: entry.tags || [],
    sourceIds: entry.sourceIds || [],
    evidenceFor: entry.evidenceFor || [],
    evidenceAgainst: entry.evidenceAgainst || [],
    versionHistory: entry.versionHistory || [],
    dateCreated: entry.dateCreated || entry.dateUpdated || new Date().toISOString(),
    dateUpdated: entry.dateUpdated || entry.dateCreated || new Date().toISOString(),
  };
}

function safePositionDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toLocaleDateString() : date.toLocaleDateString();
}

export function BeliefVault({ entries, media, drafts, practices, questions, timeline, concepts, links, onAddEntry, onUpdateEntry, onDeleteEntry, onAddConcept, onCreateLink, onAddDraft, onAddPractice, onCreateIdea, onUpdateLink, focusedEntryId, onFocusedEntryHandled }: BeliefVaultProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | VaultType | 'ideas'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [draftEntry, setDraftEntry] = useState<Partial<VaultEntry>>({ type: 'belief', title: '', statement: '', description: '', confidence: 3, status: 'active', tags: [] });
  const [conceptPopupName, setConceptPopupName] = useState<string | null>(null);
  const { toast } = useToast();

  // Idea pipeline state
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaStep, setIdeaStep] = useState<1 | 2 | 3>(1);
  const [ideaDraft, setIdeaDraft] = useState({ title: '', body: '' });
  const [ideaQA, setIdeaQA] = useState<Array<{ question: string; focus: string; answer: string }>>([]);
  const [ideaPosition, setIdeaPosition] = useState<{ positionTitle: string; statement: string; description: string; confidence: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const openIdeaDialog = () => {
    setIdeaDraft({ title: '', body: '' });
    setIdeaQA([]);
    setIdeaPosition(null);
    setIdeaStep(1);
    setIdeaOpen(true);
  };

  const handleGenerateQuestions = async () => {
    if (!ideaDraft.title.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateIdeaQuestions({ ideaTitle: ideaDraft.title, ideaBody: ideaDraft.body });
      setIdeaQA(result.questions.map((q) => ({ ...q, answer: '' })));
      setIdeaStep(2);
    } catch {
      toast({ variant: 'destructive', title: 'AI Unavailable', description: 'Could not generate questions. Try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormPosition = async () => {
    if (ideaQA.some((q) => !q.answer.trim())) {
      toast({ title: 'Answer all questions', description: 'Each question helps shape your position.' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await formPositionFromIdea({
        ideaTitle: ideaDraft.title,
        ideaBody: ideaDraft.body,
        qa: ideaQA.map((q) => ({ question: q.question, answer: q.answer })),
      });
      setIdeaPosition(result);
      setIdeaStep(3);
    } catch {
      toast({ variant: 'destructive', title: 'AI Unavailable', description: 'Could not form position. Try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveIdeaPosition = () => {
    if (!ideaPosition) return;
    onCreateIdea({
      title: ideaDraft.title,
      body: ideaDraft.body,
      tags: [],
      sourceIds: [],
      position: {
        title: ideaPosition.positionTitle,
        statement: ideaPosition.statement,
        description: ideaPosition.description,
        confidence: ideaPosition.confidence,
      },
    });
    setIdeaOpen(false);
    toast({ title: 'Position Created', description: `"${ideaPosition.positionTitle}" added to your Positions.` });
  };

  const safeEntries = useMemo(() => entries.filter((entry) => entry?.id).map(safePosition), [entries]);
  const selected = safeEntries.find((entry) => entry.id === selectedId) || null;
  const filteredEntries = safeEntries.filter(e => {
    const typeOk = filter === 'all'
      ? true
      : filter === 'ideas'
        ? e.createdFrom === 'idea'
        : e.type === filter;
    const haystack = `${e.title || ''} ${e.statement || ''} ${e.description || ''}`.toLowerCase();
    const queryOk = !search ||
      haystack.includes(search.toLowerCase());
    return typeOk && queryOk;
  });

  const openEditor = (entry?: VaultEntry) => {
    setDraftEntry(entry ? { ...entry } : { type: 'belief', title: '', statement: '', description: '', confidence: 3, status: 'active', tags: [] });
    setEditorOpen(true);
  };

  useEffect(() => {
    if (!focusedEntryId) return;
    if (safeEntries.some((entry) => entry.id === focusedEntryId)) {
      setSelectedId(focusedEntryId);
      onFocusedEntryHandled?.();
    }
  }, [safeEntries, focusedEntryId, onFocusedEntryHandled]);

  const saveEntry = () => {
    if (!draftEntry.title?.trim()) return;
    if (draftEntry.id) onUpdateEntry({ ...(draftEntry as VaultEntry), tags: normalizeConceptTags(draftEntry.tags), dateUpdated: today() });
    else onAddEntry({ ...draftEntry, tags: normalizeConceptTags(draftEntry.tags) });
    setEditorOpen(false);
  };

  const tensions = useMemo(() => {
    const active = safeEntries.filter((e) => e.status !== 'rejected' && e.status !== 'abandoned');
    const pairs: Array<{ a: VaultEntry; b: VaultEntry; sharedTags: string[] }> = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const tagsA = (active[i].tags || []).map((t) => t.toLowerCase());
        const tagsB = (active[j].tags || []).map((t) => t.toLowerCase());
        const shared = tagsA.filter((t) => tagsB.includes(t));
        if (shared.length > 0 && active[i].id !== active[j].id) {
          pairs.push({ a: active[i], b: active[j], sharedTags: shared });
        }
      }
    }
    return pairs.slice(0, 3);
  }, [safeEntries]);

  if (selected) {
    const linkedSources = media.filter((item) => (selected.sourceIds || []).includes(item.id));
    const linkedDrafts = drafts.filter((draft) => (draft.beliefIds || []).includes(selected.id));
    const typedLinks = links.filter((link) => (link.fromType === 'position' && link.fromId === selected.id) || (link.toType === 'position' && link.toId === selected.id));
    const tensionLinks = typedLinks.filter((link) => link.type === 'contradicts' || link.type === 'challenges' || link.note?.toLowerCase().includes('tension'));
    const firstLinkedSource = linkedSources[0];
    return (
      <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-5xl mx-auto w-full font-body">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setSelectedId(null)} className="h-8 font-code text-[10px] uppercase tracking-widest rounded-full"><ArrowLeft className="size-4 mr-2" /> Positions</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openEditor(selected)} className="h-8 bg-white border-border/60 shadow-sm rounded-full"><Edit className="size-4 mr-2" /> Edit</Button>
            <Button variant="destructive" onClick={() => { onDeleteEntry(selected.id); setSelectedId(null); }} className="h-8 shadow-sm rounded-full"><Trash2 className="size-4 mr-2" /> Delete</Button>
          </div>
        </div>

        <Card className="p-6 mb-6 bg-white border-border/50 shadow-sm rounded-xl">
          <Badge variant="outline" className="mb-3 font-code uppercase bg-white border-border/60 shadow-sm rounded-full">{(selected.type || 'belief').replace('_', ' ')}</Badge>
          <h1 className="font-headline text-4xl font-bold mb-3">{selected.title}</h1>
          <p className="font-body text-lg italic text-primary/80 mb-4">{selected.statement || selected.description}</p>
          <div className="flex flex-wrap gap-2">
            {(selected.tags || []).map((tag) => (
              <button 
                key={tag} 
                onClick={() => setConceptPopupName(tag)}
                className="font-code text-[9px] uppercase tracking-widest px-3 py-1 bg-white border border-border/60 shadow-sm rounded-full font-bold hover:bg-accent/10 hover:text-accent transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </Card>

        <div className="mb-6">
          <NextPhilosophicalActionPanel
            status={selected.status}
            title="Next Philosophical Action"
            description="Positions are the center of gravity: support them, challenge them, express them, or test them."
            actions={[
              {
                label: 'Raise Confidence',
                tone: 'support',
                disabled: selected.confidence >= 5,
                description: 'Increase confidence in this position.',
                onClick: () => onUpdateEntry({ ...selected, confidence: Math.min(5, (selected.confidence || 3) + 1), dateUpdated: today() }),
              },
              {
                label: 'Lower Confidence',
                tone: 'challenge',
                disabled: selected.confidence <= 1,
                description: 'Decrease confidence — add doubt before revising.',
                onClick: () => onUpdateEntry({ ...selected, confidence: Math.max(1, (selected.confidence || 3) - 1), dateUpdated: today() }),
              },
              {
                label: 'Turn into Essay',
                description: 'Open this position as an essay draft.',
                onClick: () => onAddDraft({
                  title: selected.title,
                  body: `**Position:** ${selected.statement}\n\n**Reasoning:**\n${selected.description || ''}`,
                  type: 'essay',
                  status: 'seed',
                  beliefIds: [selected.id],
                  sourceIds: selected.sourceIds || [],
                  conceptTags: selected.tags || [],
                }),
              },
              {
                label: 'Start Practice',
                description: 'Create a behavioral experiment to test this position.',
                onClick: () => onAddPractice({
                  title: `Test: ${selected.title.slice(0, 60)}`,
                  description: `This practice tests the position: "${selected.statement}"`,
                  type: 'experiment',
                  status: 'planned',
                  durationDays: 7,
                  positionIds: [selected.id],
                  conceptTags: selected.tags || [],
                  sourceIds: selected.sourceIds || [],
                }),
              },
              {
                label: 'Mark Challenged',
                tone: 'challenge',
                disabled: selected.status === 'challenged',
                onClick: () => onUpdateEntry({
                  ...selected,
                  status: 'challenged',
                  versionHistory: [
                    ...(selected.versionHistory || []),
                    { date: today(), eventType: 'challenged', description: 'Marked as challenged for further examination.' },
                  ],
                  dateUpdated: today(),
                }),
              },
              {
                label: 'Mark Revised',
                disabled: selected.status === 'revised',
                onClick: () => onUpdateEntry({
                  ...selected,
                  status: 'revised',
                  versionHistory: [
                    ...(selected.versionHistory || []),
                    { date: today(), eventType: 'revised', description: 'Marked as revised after reflection.' },
                  ],
                  dateUpdated: today(),
                }),
              },
              {
                label: 'Reject',
                tone: 'challenge',
                disabled: selected.status === 'rejected',
                description: 'Mark this position as rejected after examination.',
                onClick: () => onUpdateEntry({
                  ...selected,
                  status: 'rejected',
                  versionHistory: [
                    ...(selected.versionHistory || []),
                    { date: today(), eventType: 'revised', description: 'Position rejected after examination.' },
                  ],
                  dateUpdated: today(),
                }),
              },
            ]}
          />
        </div>

        <TensionResolutionPanel
          selected={selected}
          tensionLinks={tensionLinks}
          onUpdateEntry={onUpdateEntry}
          onUpdateLink={onUpdateLink}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EvidencePanel title="Evidence For" items={selected.evidenceFor || []} onAdd={(text) => onUpdateEntry({ ...selected, evidenceFor: [...(selected.evidenceFor || []), text], dateUpdated: today() })} />
          <EvidencePanel title="Evidence Against" items={selected.evidenceAgainst || []} onAdd={(text) => onUpdateEntry({ ...selected, evidenceAgainst: [...(selected.evidenceAgainst || []), text], dateUpdated: today() })} />
          <InfoPanel title="Linked Sources" items={linkedSources.map((item) => item.title)} empty="No sources linked yet." />
          <InfoPanel title="Linked Works" items={linkedDrafts.map((draft) => draft.title)} empty="No works linked yet." />
          <InfoPanel title="Typed Links" items={typedLinks.map((link) => `${link.type.replace(/_/g, ' ')}: ${link.fromLabel || link.fromType} -> ${link.toLabel || link.toType}`)} empty="No typed links recorded yet." />
          <InfoPanel title="Version History" items={(selected.versionHistory || []).map((v) => `${v.date}: ${v.description}`)} empty="No revisions recorded yet." />
        </div>
        
        <ConceptDetailDialog 
          name={conceptPopupName} 
          onClose={() => setConceptPopupName(null)}
          concepts={concepts}
          media={media}
          vault={safeEntries}
          drafts={drafts}
          practices={practices}
          questions={questions}
          timeline={timeline}
        />

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
          <div className="flex rounded-full border border-border/60 bg-card p-1 shadow-sm">
            <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('cards')} className="h-7 rounded-full px-3">
              <LayoutGrid className="size-3.5" /> Cards
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-7 rounded-full px-3">
              <Table2 className="size-3.5" /> Table
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search positions, principles..." className="w-72 pl-9 h-9 rounded-full" />
          </div>
          <Button variant="outline" onClick={openIdeaDialog} size="sm" className="bg-white border-border/60 shadow-sm rounded-full h-9 font-bold">
            <Lightbulb className="size-4 mr-1.5" /> NEW IDEA
          </Button>
          <Button onClick={() => openEditor()} size="sm" className="bg-accent hover:bg-accent/90 px-6 shadow-md shadow-accent/20 rounded-full h-9 font-bold">
            <Plus className="size-4 mr-1.5" /> NEW POSITION
          </Button>
        </div>
      </header>

      {tensions.length > 0 && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-code text-[10px] uppercase tracking-[0.2em] text-foreground font-bold">Possible Tensions Detected</h3>
          </div>
          <div className="space-y-3">
            {tensions.map(({ a, b, sharedTags }) => (
              <div key={`${a.id}-${b.id}`} className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-body">
                  <button onClick={() => setSelectedId(a.id)} className="font-headline text-base font-bold italic text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                    {a.title}
                  </button>
                  <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground self-center">shares concept</span>
                  <span className="font-code text-[9px] bg-accent/10 text-accent rounded-full px-2.5 py-1 self-center border border-accent/20 font-bold">{sharedTags[0]}</span>
                  <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground self-center">with</span>
                  <button onClick={() => setSelectedId(b.id)} className="font-headline text-base font-bold italic text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                    {b.title}
                  </button>
                </div>
                <p className="mt-3 text-sm text-foreground/80 font-body italic leading-6">Examine whether these positions contradict, refine, or complement each other.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <p className="text-xl font-headline italic text-foreground/60 mb-5">Explicit positions, principles, and mental models</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all",
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
                "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all whitespace-nowrap",
                filter === type
                  ? "bg-accent text-white shadow-sm"
                  : "bg-white text-muted-foreground border border-border/60 shadow-sm hover:text-foreground hover:bg-muted/5"
              )}
            >
              {TYPE_LABELS[type] === 'Belief' ? 'BELIEFS' : TYPE_LABELS[type].toUpperCase() + 'S'}
            </button>
          ))}
          <button
            onClick={() => setFilter('ideas')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.14em] transition-all whitespace-nowrap",
              filter === 'ideas'
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm hover:bg-amber-100"
            )}
          >
            IDEAS
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <PositionsTable entries={filteredEntries} onOpen={setSelectedId} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.map((entry) => (
          <Card 
            key={entry.id} 
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all border border-accent/20 bg-white/95 p-5 rounded-xl shadow-md" 
            onClick={() => setSelectedId(entry.id)}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 font-bold">
                  {TYPE_LABELS[entry.type] || 'Position'}
                </div>
                <h3 className="font-headline text-xl font-bold italic leading-tight group-hover:text-accent transition-colors truncate text-primary">
                  {entry.title}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                <Triangle className="size-4 fill-current rotate-180" />
              </div>
            </div>
            
            <p className="text-[13px] leading-relaxed text-muted-foreground font-body line-clamp-2 italic mb-6">
              {entry.statement || entry.description}
            </p>

            <div className="flex items-center gap-5 pt-4 border-t border-border/30">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div 
                    key={n} 
                    className={cn(
                      'size-2 rounded-full shadow-sm', 
                      n <= (entry.confidence || 3) ? 'bg-accent' : 'bg-muted'
                    )} 
                  />
                ))}
              </div>
              <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-widest px-2 py-0.5 bg-emerald-100/40 text-emerald-700 border-emerald-200/50 rounded-full font-bold">
                {entry.status}
              </Badge>
              <div className="flex items-center gap-1.5 ml-auto">
                {(entry.tags || []).slice(0, 2).map(tag => (
                  <button
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); setConceptPopupName(tag); }}
                    className="font-code text-[8px] uppercase tracking-widest px-2 py-0.5 bg-muted/10 text-muted-foreground/40 rounded-full font-bold hover:bg-accent/10 hover:text-accent transition-all"
                  >
                    {tag}
                  </button>
                ))}
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
      )}
      
      <ConceptDetailDialog 
        name={conceptPopupName} 
        onClose={() => setConceptPopupName(null)}
        concepts={concepts}
        media={media}
        vault={entries}
        drafts={drafts}
        practices={practices}
        questions={questions}
        timeline={timeline}
      />

      <BeliefEditor open={editorOpen} onOpenChange={setEditorOpen} draft={draftEntry} setDraft={setDraftEntry} concepts={concepts} media={media} onAddConcept={onAddConcept} onSave={saveEntry} />

      {/* Idea → Position pipeline dialog */}
      <Dialog open={ideaOpen} onOpenChange={(open) => { if (!open) setIdeaOpen(false); }}>
        <DialogContent className="max-w-xl bg-white border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className={cn('h-1 flex-1 rounded-full transition-all', ideaStep >= n ? 'bg-accent' : 'bg-muted/30')} />
              ))}
            </div>
            <DialogTitle className="font-headline text-2xl italic">
              {ideaStep === 1 && 'Write Your Idea'}
              {ideaStep === 2 && 'Sharpen It'}
              {ideaStep === 3 && 'Review Your Position'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-body">
              {ideaStep === 1 && 'Capture the thought. AI will ask 3 questions to turn it into a position.'}
              {ideaStep === 2 && 'Answer each question to clarify the claim you are willing to own.'}
              {ideaStep === 3 && 'Edit and save the position AI formed from your idea and answers.'}
            </p>
          </DialogHeader>

          {ideaStep === 1 && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Idea Statement</Label>
                <Input
                  value={ideaDraft.title}
                  onChange={(e) => setIdeaDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="State the idea briefly..."
                  className="rounded-full"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Reasoning / Context</Label>
                <Textarea
                  value={ideaDraft.body}
                  onChange={(e) => setIdeaDraft((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Why do you think this? What prompted it?"
                  className="min-h-[100px]"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={!ideaDraft.title.trim() || isGenerating}
                  className="bg-accent shadow-md shadow-accent/20 rounded-full px-8 w-full"
                >
                  {isGenerating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <GenerativeAiIcon className="mr-2 size-4" />}
                  {isGenerating ? 'Generating questions…' : 'Ask AI'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {ideaStep === 2 && (
            <div className="space-y-5 pt-2">
              <div className="rounded-lg bg-muted/20 border border-border/30 px-4 py-3">
                <p className="text-xs text-muted-foreground font-code uppercase tracking-widest mb-1 font-bold">Your Idea</p>
                <p className="text-sm italic font-body text-primary/80">{ideaDraft.title}</p>
              </div>
              {ideaQA.map((qa, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-code text-[8px] uppercase tracking-widest text-accent font-bold px-2 py-0.5 bg-accent/10 rounded-full">{qa.focus}</span>
                  </div>
                  <p className="text-sm font-body text-foreground/80 leading-snug">{qa.question}</p>
                  <Textarea
                    value={qa.answer}
                    onChange={(e) => setIdeaQA((prev) => prev.map((q, j) => j === i ? { ...q, answer: e.target.value } : q))}
                    placeholder="Your answer..."
                    className="min-h-[72px]"
                  />
                </div>
              ))}
              <DialogFooter className="pt-2">
                <Button
                  onClick={handleFormPosition}
                  disabled={isGenerating}
                  className="bg-accent shadow-md shadow-accent/20 rounded-full px-8 w-full"
                >
                  {isGenerating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ChevronRight className="size-4 mr-2" />}
                  {isGenerating ? 'Forming position…' : 'Form Position'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {ideaStep === 3 && ideaPosition && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Position Title</Label>
                <Input
                  value={ideaPosition.positionTitle}
                  onChange={(e) => setIdeaPosition((p) => p ? { ...p, positionTitle: e.target.value } : p)}
                  className="rounded-full font-headline font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Core Claim</Label>
                <Textarea
                  value={ideaPosition.statement}
                  onChange={(e) => setIdeaPosition((p) => p ? { ...p, statement: e.target.value } : p)}
                  className="min-h-[72px] italic"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Supporting Reasoning</Label>
                <Textarea
                  value={ideaPosition.description}
                  onChange={(e) => setIdeaPosition((p) => p ? { ...p, description: e.target.value } : p)}
                  className="min-h-[90px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-code text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Confidence (1–5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setIdeaPosition((p) => p ? { ...p, confidence: n } : p)}
                      className={cn(
                        'flex-1 h-9 rounded-full text-[11px] font-code font-bold uppercase tracking-wider transition-all border',
                        ideaPosition.confidence === n
                          ? 'bg-accent text-white border-accent shadow-md'
                          : 'bg-white text-muted-foreground border-border/60 hover:border-accent/40'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  onClick={handleSaveIdeaPosition}
                  className="bg-accent shadow-md shadow-accent/20 rounded-full px-8 w-full"
                >
                  Save Position
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TensionResolutionPanel({
  selected,
  tensionLinks,
  onUpdateEntry,
  onUpdateLink,
}: {
  selected: VaultEntry;
  tensionLinks: PhilosophicalLink[];
  onUpdateEntry: (entry: VaultEntry) => void;
  onUpdateLink?: (link: PhilosophicalLink) => void;
}) {
  if (!tensionLinks.length) return null;

  const updateLink = (link: PhilosophicalLink, type: PhilosophicalLink['type'], note: string) => {
    onUpdateLink?.({
      ...link,
      type,
      note,
      dateUpdated: today(),
    });
  };

  const resolveTension = (link: PhilosophicalLink) => {
    updateLink(link, 'refines', 'Resolved by refining the distinction between these positions.');
    onUpdateEntry({
      ...selected,
      status: 'revised',
      versionHistory: [
        ...(selected.versionHistory || []),
        { date: today(), eventType: 'revised', description: 'Resolved a possible tension by refining this position.' },
      ],
      dateUpdated: today(),
    });
  };

  return (
    <Card className="mb-6 rounded-xl border-amber-200/60 bg-amber-50/60 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-code text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Possible Tension Detected</h2>
          <p className="mt-1 text-sm italic leading-5 text-muted-foreground">Decide whether this relationship is compatible, opposed, or needs refinement.</p>
        </div>
        <Badge variant="outline" className="rounded-full bg-white font-code text-[8px] uppercase tracking-widest">{tensionLinks.length} open</Badge>
      </div>
      <div className="space-y-3">
        {tensionLinks.map((link) => {
          const otherLabel = link.fromId === selected.id ? link.toLabel || link.toType : link.fromLabel || link.fromType;
          return (
            <div key={link.id} className="rounded-lg border border-amber-200/50 bg-white/80 p-3">
              <div className="mb-3 text-sm italic text-primary/80">
                {otherLabel} is currently marked as <span className="font-code text-[10px] uppercase tracking-widest text-amber-700">{link.type}</span>.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => updateLink(link, 'coheres', 'Reviewed and marked as not a contradiction.')} className="rounded-full bg-white">
                  Not A Contradiction
                </Button>
                <Button variant="outline" size="sm" onClick={() => updateLink(link, 'contradicts', 'Confirmed as an active contradiction to examine.')} className="rounded-full border-destructive/25 text-destructive hover:text-destructive">
                  Confirms Conflict
                </Button>
                <Button size="sm" onClick={() => resolveTension(link)} className="rounded-full">
                  Resolve / Fix
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PositionsTable({ entries, onOpen }: { entries: VaultEntry[]; onOpen: (id: string) => void }) {
  if (!entries.length) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
        <ShieldCheck className="size-20 mb-6 text-muted-foreground" />
        <h2 className="text-2xl font-headline italic mb-2">No positions found</h2>
        <p className="max-w-md font-body">Refine your search or turn an idea into something you are willing to examine.</p>
      </div>
    );
  }

  return (
    <>
      <Card className="hidden overflow-hidden rounded-xl border-border/60 bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Sources</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="cursor-pointer" onClick={() => onOpen(entry.id)}>
                <TableCell>
                  <div className="font-headline text-base font-semibold italic">{entry.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{entry.statement || entry.description}</div>
                </TableCell>
                <TableCell className="font-code text-[10px] uppercase tracking-widest">{TYPE_LABELS[entry.type] || 'Position'}</TableCell>
                <TableCell><Badge variant="outline" className="rounded-full bg-card font-code text-[8px] uppercase tracking-widest">{entry.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={cn('size-2 rounded-full shadow-sm', n <= entry.confidence ? 'bg-accent' : 'bg-muted')} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-code text-xs">{(entry.sourceIds || []).length}</TableCell>
                <TableCell className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">{safePositionDate(entry.dateUpdated || entry.dateCreated)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <button key={entry.id} onClick={() => onOpen(entry.id)} className="rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground">{TYPE_LABELS[entry.type] || 'Position'}</div>
                <h3 className="mt-1 font-headline text-xl font-bold italic">{entry.title}</h3>
              </div>
              <Badge variant="outline" className="rounded-full bg-card font-code text-[8px] uppercase tracking-widest">{entry.status}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">{entry.statement || entry.description}</p>
            <div className="mt-4 flex justify-between font-code text-[9px] uppercase tracking-widest text-muted-foreground">
              <span>{entry.confidence}/5 confidence</span>
              <span>{(entry.sourceIds || []).length} sources</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function EvidencePanel({ title, items, onAdd }: { title: string; items: string[]; onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Card className="p-5 bg-white border-border/40 shadow-sm rounded-xl">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-bold">{title}</h3>
      <div className="space-y-2 mb-3">{items.map((item, index) => <div key={`${item}-${index}`} className="rounded-lg bg-muted/30 p-3 text-sm italic shadow-sm border border-border/10 leading-relaxed text-primary/80">{item}</div>)}</div>
      <div className="flex gap-2"><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Add evidence..." className="h-9 rounded-full" /><Button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }} size="sm" className="h-9 px-4 rounded-full">Add</Button></div>
    </Card>
  );
}

function InfoPanel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card className="p-5 bg-white border-border/40 shadow-sm rounded-xl">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-bold">{title}</h3>
      {items.length ? items.map((item) => (
        <div key={item} className="rounded-lg bg-muted/30 p-3 text-sm mb-2 italic shadow-sm border border-border/10 leading-relaxed text-primary/80">{item}</div>
      )) : (
        <p className="text-sm text-muted-foreground italic px-2 font-body">{empty}</p>
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
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">TITLE</Label>
              <Input value={draft.title || ''} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} className="italic rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">TYPE</Label>
              <Select value={draft.type || 'belief'} onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as VaultType }))}>
                <SelectTrigger className="h-10 border-border/60 bg-white shadow-sm rounded-full font-code text-[10px] uppercase"><SelectValue /></SelectTrigger>
                <SelectContent>{vaultTypes.map((type) => <SelectItem key={type} value={type} className="font-code text-[10px] uppercase">{type.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">STATEMENT</Label>
            <Textarea value={draft.statement || ''} onChange={(event) => setDraft((prev) => ({ ...prev, statement: event.target.value, description: prev.description || event.target.value }))} placeholder="The core position in one clear sentence..." className="min-h-[60px] italic text-base" />
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">DESCRIPTION</Label>
            <Textarea value={draft.description || ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder="Elaborate on the reasoning, assumptions, or evidence..." className="min-h-[120px] italic text-base" />
          </div>
          <div className="space-y-2">
            <Label className="readex-kicker uppercase opacity-50 font-bold text-[9px]">CONCEPT TAGS</Label>
            <ConceptTagPicker concepts={concepts} value={draft.tags || []} onChange={(tags) => setDraft((prev) => ({ ...prev, tags }))} onCreateConcept={(name) => onAddConcept({ name, description: '', createdFrom: 'tag' })} />
          </div>
          
          <SourceLinker 
            media={media} 
            selectedIds={draft.sourceIds || []} 
            onToggle={toggleSource} 
            label="Supporting Sources"
          />
        </div>
        <DialogFooter className="pt-4"><Button onClick={onSave} className="bg-accent shadow-md shadow-accent/20 h-11 px-10 rounded-full font-bold">Save Position</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
