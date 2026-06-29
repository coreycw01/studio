
"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, MessageCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceLinker } from '@/components/SourceLinker';
import { NextPhilosophicalActionPanel } from '@/components/Philosophy/NextPhilosophicalActionPanel';
import { GenerativeAiIcon } from '@/components/GenerativeAiIcon';
import { aiClient } from '@/lib/ai-client';
import type { Concept, Draft, Media, Question, VaultEntry } from '@/lib/types';
import { allQuestions, conceptKey, today } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuestionsWorkspaceProps {
  questions: Question[];
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  concepts: Concept[];
  onAddQuestion: (data: Partial<Question>) => Question;
  onUpdateQuestion: (question: Question) => void;
  onAddVaultEntry: (data: Partial<VaultEntry>) => void;
  onAddDraft: (data: Partial<Draft>) => void;
  onFormPositionFromInquiry: (question: Question, position: { title: string; statement: string; description: string; confidence: number }, finalAnswer: string) => void;
  focusedQuestionId?: string | null;
  onFocusedQuestionHandled?: () => void;
}

type FilterType = 'all' | 'open' | 'annotations' | 'answered';

export function QuestionsWorkspace({ questions, media, vault, drafts, concepts, onAddQuestion, onUpdateQuestion, onAddVaultEntry, onAddDraft, onFormPositionFromInquiry, focusedQuestionId, onFocusedQuestionHandled }: QuestionsWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', sourceIds: [] as string[] });
  const { toast } = useToast();

  const all = useMemo(() => allQuestions(media, questions), [media, questions]);
  React.useEffect(() => {
    if (!focusedQuestionId) return;
    setSelectedId(focusedQuestionId);
    onFocusedQuestionHandled?.();
  }, [focusedQuestionId, onFocusedQuestionHandled]);
  const filtered = all.filter((question) => {
    let typeOk = true;
    if (filter === 'open') typeOk = !question.answer;
    if (filter === 'answered') typeOk = !!question.answer;
    if (filter === 'annotations') typeOk = question.type === 'annotation';
    return typeOk && (!search || question.text.toLowerCase().includes(search.toLowerCase()) || (question.answer || '').toLowerCase().includes(search.toLowerCase()));
  });
  const selected = all.find((question) => question.id === selectedId) || null;

  const createQuestion = () => {
    if (!newQuestion.text.trim()) return;
    const created = onAddQuestion({ text: newQuestion.text.trim(), status: 'open', sourceIds: newQuestion.sourceIds, evidenceIds: newQuestion.sourceIds });
    setNewQuestion({ text: '', sourceIds: [] });
    setIsAddOpen(false);
    setSelectedId(created.id);
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
    return (
        <QuestionDetail
          question={selected}
          sources={relatedSources}
          concepts={conceptNames}
          beliefs={relatedBeliefs}
          drafts={relatedDrafts}
          onBack={() => setSelectedId(null)}
          onFormPositionFromInquiry={onFormPositionFromInquiry}
          onAiFeedback={(title, description, variant) => toast({ title, description, ...(variant ? { variant } : {}) })}
        />
    );
  }

  const answered = all.filter((q) => !!q.answer).length;
  const linkedDraftCount = drafts.filter(d => (d.questionIds || []).length > 0).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-7xl mx-auto w-full font-body">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Inquiries</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground font-body">Work through the questions that keep returning. Answer them through Socratic dialogue and crystallize a position.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="w-64 pl-9 h-9 rounded-full" />
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
            <Card key={question.id} className="border border-accent/20 bg-white/95 p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-code text-[8px] uppercase tracking-widest bg-muted/20 border-transparent text-muted-foreground/80 rounded-full font-bold px-2.5 py-0.5">
                    {question.type || 'manual'}
                  </Badge>
                  <span className={cn(
                    "font-code text-[8px] font-bold uppercase tracking-widest",
                    question.answer ? "text-emerald-600/60" : "text-accent/60"
                  )}>
                    {question.answer ? 'ANSWERED' : 'OPEN'}
                  </span>
                  {(question.beliefIds || []).length > 0 && (
                    <span className="font-code text-[8px] font-bold uppercase tracking-widest text-emerald-600/80">· POSITION FORMED</span>
                  )}
                </div>
                <div className="font-code text-[8px] uppercase text-muted-foreground/40 font-bold">{draftLinks} WORKS LINKED</div>
              </div>

              <button className="w-full text-left group" onClick={() => setSelectedId(question.id)}>
                <h3 className="text-2xl font-headline font-bold italic group-hover:text-accent transition-colors leading-relaxed text-primary mb-4">
                  {question.text}
                </h3>
              </button>

              <div className="font-body text-xs text-muted-foreground italic flex items-center gap-2 opacity-60 border-t border-border/20 pt-4 mb-4">
                {sources.length > 0 ? (
                  <span className="truncate">From {sources.map(s => s.title).join(', ')}</span>
                ) : (
                  <span>Synthesized from various internal connections</span>
                )}
              </div>

              <NextPhilosophicalActionPanel
                compact
                status={question.status || (question.answer ? 'answered' : 'open')}
                title="Investigate this inquiry"
                description="Open a Socratic dialogue to work through this question and crystallize a position."
                actions={[
                  {
                    label: 'Investigate',
                    tone: 'support',
                    onClick: () => setSelectedId(question.id),
                  },
                  {
                    label: 'Mark Resolved',
                    disabled: !!question.answer,
                    onClick: () => {
                      if (!question.id.startsWith('open:') && !question.id.startsWith('annotation:')) {
                        onUpdateQuestion({ ...question, status: 'answered', dateUpdated: today() } as Question);
                      }
                    },
                  },
                ]}
              />
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

type DialogPhase = 'write' | 'probing' | 'ready';

function QuestionDetail({ question, sources, concepts, beliefs, drafts, onBack, onFormPositionFromInquiry, onAiFeedback }: {
  question: Question;
  sources: Media[];
  concepts: string[];
  beliefs: VaultEntry[];
  drafts: Draft[];
  onBack: () => void;
  onFormPositionFromInquiry: (question: Question, position: { title: string; statement: string; description: string; confidence: number }, finalAnswer: string) => void;
  onAiFeedback: (title: string, description: string, variant?: 'default' | 'destructive') => void;
}) {
  const [phase, setPhase] = useState<DialogPhase>('write');
  const [initialAnswer, setInitialAnswer] = useState(question.answer || '');
  const [exchanges, setExchanges] = useState<{ probe: string; response: string }[]>([]);
  const [currentProbe, setCurrentProbe] = useState('');
  const [currentFocus, setCurrentFocus] = useState('');
  const [probeResponse, setProbeResponse] = useState('');
  const [positionDraft, setPositionDraft] = useState<{ title: string; statement: string; description: string; confidence: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDialogue = async () => {
    if (!initialAnswer.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await aiClient.socratesReflect({ question: question.text, initialAnswer, exchanges: undefined });
      if (result.ready) {
        setPositionDraft({
          title: result.positionTitle || question.text.slice(0, 60),
          statement: result.statement || initialAnswer,
          description: result.description || '',
          confidence: result.confidence || 3,
        });
        setPhase('ready');
        onAiFeedback('Position crystallized.', 'AI synthesized a first position draft from your answer.');
      } else {
        setCurrentProbe(result.probe || '');
        setCurrentFocus(result.focus || '');
        setPhase('probing');
        onAiFeedback('AI reflection complete.', 'A Socratic probe is ready for your next response.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'AI reflection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const continueDialogue = async () => {
    if (!probeResponse.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const newExchanges = [...exchanges, { probe: currentProbe, response: probeResponse }];
      const result = await aiClient.socratesReflect({ question: question.text, initialAnswer, exchanges: newExchanges });
      setExchanges(newExchanges);
      setProbeResponse('');
      if (result.ready) {
        setPositionDraft({
          title: result.positionTitle || question.text.slice(0, 60),
          statement: result.statement || initialAnswer,
          description: result.description || '',
          confidence: result.confidence || 3,
        });
        setPhase('ready');
        onAiFeedback('Position draft ready.', 'AI has enough to form a position from this inquiry.');
      } else {
        setCurrentProbe(result.probe || '');
        setCurrentFocus(result.focus || '');
        onAiFeedback('Another probe generated.', 'AI found one more tension to explore before forming a position.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'AI reflection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const savePosition = () => {
    if (!positionDraft) return;
    const allAnswers = [initialAnswer, ...exchanges.map(e => e.response)].filter(Boolean).join('\n\n');
    onFormPositionFromInquiry(question, positionDraft, allAnswers);
    onBack();
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-8 max-w-6xl mx-auto w-full font-body">
      <Button variant="ghost" onClick={onBack} className="mb-8 h-9 text-[10px] font-code uppercase tracking-widest rounded-full hover:bg-muted/50">
        <ArrowLeft className="size-4 mr-2" /> Back to Inquiries
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
        <div>
          {phase === 'write' && (
            <Card className="p-10 bg-white border border-accent/10 shadow-md rounded-2xl space-y-6">
              <Badge variant="outline" className="font-code text-[10px] uppercase tracking-widest bg-muted/20 border-border/30 rounded-full px-4 py-1 font-bold">
                {question.type || 'manual'}
              </Badge>
              <h1 className="font-headline text-4xl italic text-primary leading-tight font-bold">{question.text}</h1>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">Write what you currently believe. Socrates will probe your thinking until you can crystallize a clear position.</p>
              <div>
                <Label className="readex-kicker mb-2 block">YOUR ANSWER</Label>
                <Textarea
                  value={initialAnswer}
                  onChange={(e) => setInitialAnswer(e.target.value)}
                  className="min-h-[260px] text-[18px] leading-9 font-body italic"
                  placeholder="What do you currently believe about this? Write freely..."
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={startDialogue}
                disabled={!initialAnswer.trim() || isLoading}
                className="h-12 px-10 rounded-full font-bold shadow-lg shadow-accent/20"
              >
                {isLoading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <MessageCircle className="size-4 mr-2" />}
                BEGIN DIALOGUE
              </Button>
            </Card>
          )}

          {phase === 'probing' && (
            <Card className="p-10 bg-white border border-accent/10 shadow-md rounded-2xl space-y-6">
              <h1 className="font-headline text-3xl italic text-primary leading-tight font-bold">{question.text}</h1>

              <div className="space-y-4">
                <div className="bg-muted/10 rounded-xl p-5 border border-border/10">
                  <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2">YOUR INITIAL ANSWER</div>
                  <p className="font-body italic text-[15px] text-primary/80 leading-relaxed">{initialAnswer}</p>
                </div>
                {exchanges.map((ex, i) => (
                  <React.Fragment key={i}>
                    <div className="bg-accent/5 rounded-xl p-5 border border-accent/10">
                      <div className="font-code text-[9px] uppercase tracking-widest text-accent/60 mb-2">SOCRATIC PROBE</div>
                      <p className="font-body text-[15px] text-primary leading-relaxed">{ex.probe}</p>
                    </div>
                    <div className="bg-muted/10 rounded-xl p-5 border border-border/10">
                      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2">YOUR RESPONSE</div>
                      <p className="font-body italic text-[15px] text-primary/80 leading-relaxed">{ex.response}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              <div className="bg-accent/10 rounded-xl p-6 border border-accent/20">
                {currentFocus && (
                  <div className="font-code text-[9px] uppercase tracking-widest text-accent/70 mb-2">{currentFocus}</div>
                )}
                <p className="font-body text-[16px] text-primary leading-relaxed font-medium">{currentProbe}</p>
              </div>

              <div>
                <Label className="readex-kicker mb-2 block">YOUR RESPONSE</Label>
                <Textarea
                  value={probeResponse}
                  onChange={(e) => setProbeResponse(e.target.value)}
                  className="min-h-[160px] text-[16px] leading-8 font-body italic"
                  placeholder="Respond to the probe..."
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={continueDialogue}
                disabled={!probeResponse.trim() || isLoading}
                className="h-12 px-10 rounded-full font-bold shadow-lg shadow-accent/20"
              >
                {isLoading ? <Loader2 className="size-5 mr-2 animate-spin" /> : <GenerativeAiIcon className="mr-2 size-7" />}
                CONTINUE
              </Button>
            </Card>
          )}

          {phase === 'ready' && positionDraft && (
            <Card className="p-10 bg-white border border-accent/10 shadow-md rounded-2xl space-y-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span className="font-code text-[10px] uppercase tracking-widest text-emerald-600 font-bold">Position Crystallized</span>
              </div>
              <h1 className="font-headline text-3xl italic text-primary leading-tight font-bold">{question.text}</h1>

              <div className="space-y-5">
                <div>
                  <Label className="readex-kicker mb-2 block">POSITION TITLE</Label>
                  <Input
                    value={positionDraft.title}
                    onChange={(e) => setPositionDraft(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="font-headline text-xl italic h-auto p-4"
                  />
                </div>
                <div>
                  <Label className="readex-kicker mb-2 block">CORE STATEMENT</Label>
                  <Textarea
                    value={positionDraft.statement}
                    onChange={(e) => setPositionDraft(prev => prev ? { ...prev, statement: e.target.value } : null)}
                    className="font-body text-base min-h-[100px]"
                  />
                </div>
                <div>
                  <Label className="readex-kicker mb-2 block">DESCRIPTION</Label>
                  <Textarea
                    value={positionDraft.description}
                    onChange={(e) => setPositionDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="font-body text-base min-h-[140px]"
                  />
                </div>
                <div>
                  <Label className="readex-kicker mb-3 block">CONFIDENCE</Label>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setPositionDraft(prev => prev ? { ...prev, confidence: v } : null)}
                        className={cn(
                          "size-10 rounded-full font-code text-sm font-bold transition-all",
                          positionDraft.confidence === v
                            ? "bg-accent text-white shadow-lg shadow-accent/30"
                            : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={savePosition} className="h-12 px-10 rounded-full font-bold shadow-lg shadow-accent/20">
                <CheckCircle className="size-4 mr-2" /> SAVE POSITION
              </Button>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <ContextPanel title="Evidence Sources" items={sources.map((s) => s.title)} />
          <ContextPanel title="Active Concepts" items={Array.from(new Set(concepts))} />
          <ContextPanel title="Related Positions" items={beliefs.map((e) => e.title)} />
          <ContextPanel title="Linked Works" items={drafts.map((d) => d.title)} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="bg-white border border-accent/10 shadow-sm p-4 h-20 flex flex-col justify-center rounded-xl">
      <div className="font-code text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-headline font-bold text-accent leading-none">{value}</div>
    </Card>
  );
}

function ContextPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-6 bg-white border border-accent/10 shadow-sm rounded-xl">
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
