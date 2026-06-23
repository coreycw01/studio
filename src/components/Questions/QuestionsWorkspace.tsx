"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceLinker } from '@/components/SourceLinker';
import type { Concept, Draft, Media, Question, VaultEntry } from '@/lib/types';
import { allQuestions, conceptKey, today } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface QuestionsWorkspaceProps {
  questions: Question[];
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  concepts: Concept[];
  onAddQuestion: (data: Partial<Question>) => void;
  onUpdateQuestion: (question: Question) => void;
}

type FilterType = 'all' | 'open' | 'annotations' | 'answered';

export function QuestionsWorkspace({ questions, media, vault, drafts, concepts, onAddQuestion, onUpdateQuestion }: QuestionsWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', sourceIds: [] as string[] });
  
  const all = useMemo(() => allQuestions(media, questions), [media, questions]);
  const filtered = all.filter((question) => {
    let typeOk = true;
    if (filter === 'open') typeOk = !question.answer;
    if (filter === 'answered') typeOk = !!question.answer;
    if (filter === 'annotations') typeOk = question.type === 'annotation';
    
    return typeOk && (!search || question.text.toLowerCase().includes(search.toLowerCase()) || (question.answer || '').toLowerCase().includes(search.toLowerCase()));
  });
  const selected = all.find((question) => question.id === selectedId) || null;

  const saveAnswer = (answer: string) => {
    if (!selected) return;
    if (selected.id.startsWith('open:') || selected.id.startsWith('annotation:')) {
      onAddQuestion({ text: selected.text, answer, status: 'answered', evidenceIds: selected.evidenceIds, conceptIds: selected.conceptIds, sourceIds: selected.sourceIds, type: selected.type });
    } else {
      onUpdateQuestion({ ...selected, answer, status: answer ? 'answered' : 'open', dateUpdated: today() });
    }
    setSelectedId(null);
  };

  const createQuestion = () => {
    if (!newQuestion.text.trim()) return;
    onAddQuestion({ text: newQuestion.text.trim(), status: 'open', sourceIds: newQuestion.sourceIds, evidenceIds: newQuestion.sourceIds });
    setNewQuestion({ text: '', sourceIds: [] });
    setIsAddOpen(false);
  };

  const toggleNewQuestionSource = (id: string) => {
    setNewQuestion(prev => {
      const current = prev.sourceIds;
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  if (selected) {
    const sourceIds = selected.sourceIds || selected.evidenceIds || [];
    const relatedSources = media.filter((item) => sourceIds.includes(item.id));
    const conceptNames = selected.conceptIds || relatedSources.flatMap((item) => item.tags || []);
    const relatedBeliefs = vault.filter((entry) => (entry.tags || []).some((tag) => conceptNames.map(conceptKey).includes(conceptKey(tag))) || (entry.sourceIds || []).some((id) => sourceIds.includes(id)));
    const relatedDrafts = drafts.filter((draft) => (draft.questionIds || []).includes(selected.id) || (draft.conceptTags || []).some((tag) => conceptNames.map(conceptKey).includes(conceptKey(tag))));
    return <QuestionDetail question={selected} sources={relatedSources} concepts={conceptNames} beliefs={relatedBeliefs} drafts={relatedDrafts} onBack={() => setSelectedId(null)} onSave={saveAnswer} />;
  }

  const answered = all.filter((q) => !!q.answer).length;
  const linkedDraftCount = drafts.filter(d => (d.questionIds || []).length > 0).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Inquiries</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Work through the questions that keep returning and gather evidence toward answers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="w-64 pl-9 h-9" />
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-accent hover:bg-accent/90 rounded-full h-9 px-6 font-bold">
            <Plus className="size-4 mr-1.5" /> ADD INQUIRY
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Total Questions" value={all.length} />
        <Stat label="Answered" value={answered} />
        <Stat label="Open Inquiries" value={all.length - answered} />
        <Stat label="Linked Works" value={linkedDraftCount} />
      </div>

      <div className="mb-10">
        <p className="text-xl font-headline italic text-foreground/60 mb-5">Workspace for active synthesis and evidence gathering</p>
        <div className="flex flex-wrap gap-2.5">
          {(['all', 'open', 'annotations', 'answered'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-code font-bold uppercase tracking-[0.16em] transition-all shadow-sm",
                filter === v 
                  ? "bg-accent text-white border-accent" 
                  : "bg-white text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/5"
              )}
            >
              {v === 'annotations' ? 'Annotations' : v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((question) => {
          const sources = media.filter(m => (question.sourceIds || []).includes(m.id));
          const draftLinks = drafts.filter(d => (d.questionIds || []).includes(question.id)).length;
          
          return (
            <Card key={question.id} className="cursor-pointer hover:shadow-xl transition-all border-border/40 group bg-white rounded-xl shadow-sm p-2" onClick={() => setSelectedId(question.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="secondary" className="font-code text-[9px] uppercase tracking-widest bg-muted/20 border-transparent text-muted-foreground/80 rounded-full font-bold px-3 py-1">
                    {question.type || 'manual'}
                  </Badge>
                  <span className="font-code text-[10px] text-accent/60 font-bold uppercase tracking-widest">
                    {question.answer ? 'RESOLVED' : 'IN PROGRESS'}
                  </span>
                </div>
                <CardTitle className="text-2xl font-headline font-bold italic group-hover:text-accent transition-colors leading-relaxed text-primary">
                  {question.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-body text-sm text-muted-foreground italic flex items-center gap-3 mt-4 opacity-60">
                  {sources.length > 0 && (
                    <>
                      <span className="truncate max-w-[200px]">From {sources.map(s => s.title).join(', ')}</span>
                      <span className="size-1 rounded-full bg-border" />
                    </>
                  )}
                  <span className="font-bold font-code text-[9px] uppercase tracking-tighter">{draftLinks} connected works</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center opacity-30">
            <Search className="size-16 mx-auto mb-6 text-muted-foreground" />
            <h3 className="font-headline text-3xl italic">No matches discovered</h3>
            <p className="font-body text-base mt-3">Refine your search or expand your inquiry filters.</p>
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">Formulate Inquiry</DialogTitle></DialogHeader>
          <div className="space-y-8 pt-4">
            <div className="space-y-2">
              <Label className="readex-kicker">THE QUESTION</Label>
              <Textarea 
                value={newQuestion.text} 
                onChange={(event) => setNewQuestion(prev => ({ ...prev, text: event.target.value }))} 
                placeholder="What core problem or mystery are you exploring?" 
                className="min-h-[140px] font-body text-xl italic bg-muted/5 leading-relaxed"
              />
            </div>
            
            <SourceLinker 
              media={media} 
              selectedIds={newQuestion.sourceIds} 
              onToggle={toggleNewQuestionSource} 
              label="INFLUENCED BY SOURCE(S)"
            />
          </div>
          <DialogFooter className="pt-8"><Button onClick={createQuestion} className="w-full h-12 rounded-full font-bold shadow-lg shadow-accent/20">OPEN INVESTIGATION</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionDetail({ question, sources, concepts, beliefs, drafts, onBack, onSave }: {
  question: Question;
  sources: Media[];
  concepts: string[];
  beliefs: VaultEntry[];
  drafts: Draft[];
  onBack: () => void;
  onSave: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState(question.answer || '');
  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-6xl mx-auto w-full font-body">
      <Button variant="ghost" onClick={onBack} className="mb-8 h-9 text-[10px] font-code uppercase tracking-widest rounded-full hover:bg-muted/50"><ArrowLeft className="size-4 mr-2" /> Back to Inquiries</Button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <Card className="p-10 bg-white border-border/40 shadow-sm rounded-2xl">
          <Badge variant="outline" className="mb-6 font-code text-[10px] uppercase tracking-widest bg-muted/20 border-border/30 rounded-full px-4 py-1 font-bold">{question.type || 'manual'}</Badge>
          <h1 className="font-headline text-4xl italic mb-10 text-primary leading-tight font-bold">{question.text}</h1>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-px bg-accent/20" />
            <Textarea 
              value={answer} 
              onChange={(event) => setAnswer(event.target.value)} 
              className="min-h-[500px] pl-10 text-[18px] leading-9 font-body border-none shadow-none bg-transparent focus-visible:ring-0 italic placeholder:text-muted-foreground/30" 
              placeholder="Begin your synthesis. Examine evidence, resolve contradictions, and work toward a formal position..." 
            />
          </div>
          <div className="flex justify-end mt-12"><Button onClick={() => onSave(answer)} className="px-12 h-12 rounded-full font-bold shadow-xl shadow-accent/20">ARCHIVE SYNTHESIS</Button></div>
        </Card>
        <aside className="space-y-5">
          <ContextPanel title="Evidence Sources" items={sources.map((item) => item.title)} />
          <ContextPanel title="Active Concepts" items={Array.from(new Set(concepts))} />
          <ContextPanel title="Related Positions" items={beliefs.map((entry) => entry.title)} />
          <ContextPanel title="Linked Works" items={drafts.map((draft) => draft.title)} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="bg-white border-border/40 shadow-sm p-4 h-20 flex flex-col justify-center rounded-xl">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-headline font-bold text-accent leading-none">{value}</div>
    </Card>
  );
}

function ContextPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-6 bg-white border-border/40 shadow-sm rounded-xl">
      <h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-5 font-bold">{title}</h3>
      <div className="space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-lg bg-muted/20 p-4 text-[13px] italic border border-border/10 line-clamp-2 leading-relaxed text-primary/80">
            {item}
          </div>
        )) : (
          <p className="text-[12px] text-muted-foreground italic px-2 font-body">No linked evidence discovered.</p>
        )}
      </div>
    </Card>
  );
}
