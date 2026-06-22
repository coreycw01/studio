"use client";

import React, { useMemo, useState } from 'react';
import { ArrowLeft, HelpCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Concept, Draft, Media, Question, VaultEntry } from '@/lib/types';
import { allQuestions, conceptKey, today } from '@/lib/readex';

interface QuestionsWorkspaceProps {
  questions: Question[];
  media: Media[];
  vault: VaultEntry[];
  drafts: Draft[];
  concepts: Concept[];
  onAddQuestion: (data: Partial<Question>) => void;
  onUpdateQuestion: (question: Question) => void;
}

export function QuestionsWorkspace({ questions, media, vault, drafts, concepts, onAddQuestion, onUpdateQuestion }: QuestionsWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '' });
  const all = useMemo(() => allQuestions(media, questions), [media, questions]);
  const filtered = all.filter((question) => {
    const statusOk = filter === 'all' || (filter === 'answered' ? !!question.answer : !question.answer);
    return statusOk && (!search || question.text.toLowerCase().includes(search.toLowerCase()) || (question.answer || '').toLowerCase().includes(search.toLowerCase()));
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
    onAddQuestion({ text: newQuestion.text.trim(), status: 'open' });
    setNewQuestion({ text: '' });
    setIsAddOpen(false);
  };

  if (selected) {
    const sourceIds = selected.sourceIds || selected.evidenceIds || [];
    const relatedSources = media.filter((item) => sourceIds.includes(item.id));
    const conceptNames = selected.conceptIds || relatedSources.flatMap((item) => item.tags || []);
    const relatedBeliefs = vault.filter((entry) => (entry.tags || []).some((tag) => conceptNames.map(conceptKey).includes(conceptKey(tag))) || (entry.sourceIds || []).some((id) => sourceIds.includes(id)));
    const relatedDrafts = drafts.filter((draft) => (draft.questionIds || []).includes(selected.id) || (draft.conceptTags || []).some((tag) => conceptNames.map(conceptKey).includes(conceptKey(tag))));
    return <QuestionDetail question={selected} sources={relatedSources} concepts={conceptNames} beliefs={relatedBeliefs} drafts={relatedDrafts} onBack={() => setSelectedId(null)} onSave={saveAnswer} />;
  }

  const answered = all.filter((question) => !!question.answer).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2 italic">Questions</h1>
          <p className="text-muted-foreground font-body text-lg">Answer workspace for the problems currently alive in your system.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}><Plus className="size-4 mr-2" /> New Question</Button>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Questions" value={all.length} />
        <Stat label="Answered" value={answered} />
        <Stat label="Open" value={all.length - answered} />
      </div>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="pl-9 bg-white/70" />
        </div>
        {(['all','open','answered'] as const).map((value) => <Button key={value} variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>{value}</Button>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((question) => (
          <Card key={question.id} className="cursor-pointer hover:shadow-xl transition-all" onClick={() => setSelectedId(question.id)}>
            <CardHeader>
              <Badge variant="outline" className="w-fit">{question.answer ? 'answered' : 'open'}</Badge>
              <CardTitle className="text-2xl font-headline italic">{question.text}</CardTitle>
            </CardHeader>
            <CardContent>
              {question.answer ? <p className="text-sm font-body italic text-primary/80 line-clamp-3">"{question.answer}"</p> : <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground/50">Answer pending synthesis...</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Formulate Question</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Question</Label><Textarea value={newQuestion.text} onChange={(event) => setNewQuestion({ text: event.target.value })} /></div>
          <DialogFooter><Button onClick={createQuestion}>Open Investigation</Button></DialogFooter>
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
    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
      <Button variant="ghost" onClick={onBack} className="mb-6"><ArrowLeft className="size-4 mr-2" /> Questions</Button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <Card className="p-6">
          <Badge variant="outline" className="mb-3">{question.type || 'manual'}</Badge>
          <h1 className="font-headline text-3xl italic mb-6">{question.text}</h1>
          <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-[340px] text-base leading-relaxed" placeholder="Work toward an answer. Name assumptions, evidence, contradictions, and what would change your mind..." />
          <div className="flex justify-end mt-4"><Button onClick={() => onSave(answer)}>Save Answer</Button></div>
        </Card>
        <aside className="space-y-4">
          <ContextPanel title="Evidence Sources" items={sources.map((item) => item.title)} />
          <ContextPanel title="Concepts" items={Array.from(new Set(concepts))} />
          <ContextPanel title="Related Beliefs" items={beliefs.map((entry) => entry.title)} />
          <ContextPanel title="Linked Drafts" items={drafts.map((draft) => draft.title)} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <Card className="p-4 text-center"><div className="text-2xl font-headline font-bold text-accent">{value}</div><div className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div></Card>;
}

function ContextPanel({ title, items }: { title: string; items: string[] }) {
  return <Card className="p-4"><h3 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>{items.length ? items.map((item) => <div key={item} className="rounded bg-muted/30 p-2 text-sm mb-2">{item}</div>) : <p className="text-sm text-muted-foreground italic">Nothing linked yet.</p>}</Card>;
}
