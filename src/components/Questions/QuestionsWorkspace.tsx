
"use client";

import React, { useState } from 'react';
import { Plus, HelpCircle, Search, Filter, BookOpen, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Question } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuestionsWorkspaceProps {
  questions: Question[];
  onAddQuestion: (data: Partial<Question>) => void;
  onSelectQuestion: (q: Question) => void;
}

export function QuestionsWorkspace({ questions, onAddQuestion, onSelectQuestion }: QuestionsWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '' });

  const filtered = questions.filter(q => q.text.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.text) return;
    onAddQuestion(newQuestion);
    setIsAddOpen(false);
    setNewQuestion({ text: '' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2 italic">Inquiry Workspace</h1>
          <p className="text-muted-foreground font-body text-lg">Active threads of curiosity and evolving answers.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 shadow-xl">
          <Plus className="size-4 mr-2" /> New Question
        </Button>
      </header>

      <div className="flex gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search inquiries..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/50 border-border/50 font-body italic"
          />
        </div>
        <Button variant="outline"><Filter className="size-4 mr-2" /> Filter</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((q) => (
          <Card 
            key={q.id} 
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 flex flex-col"
            onClick={() => onSelectQuestion(q)}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1 pr-8">
                 <Badge variant="outline" className={cn(
                   "font-code text-[9px] uppercase tracking-wider mb-2",
                   q.status === 'investigating' && "text-amber-600 border-amber-600",
                   q.status === 'answered' && "text-emerald-600 border-emerald-600",
                   q.status === 'open' && "text-blue-600 border-blue-600",
                 )}>
                   {q.status}
                 </Badge>
                 <CardTitle className="text-2xl font-headline italic leading-snug group-hover:text-accent transition-colors">
                   {q.text}
                 </CardTitle>
              </div>
              <HelpCircle className="size-6 text-muted-foreground/20 group-hover:text-accent/20 transition-colors" />
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <div className="bg-[#FAFAF9] p-4 rounded-sm border border-border/30 mt-2 mb-6 min-h-[80px]">
                {q.answer ? (
                   <p className="text-sm font-body italic text-primary/80 line-clamp-3">"{q.answer}"</p>
                ) : (
                   <p className="text-sm font-code text-[11px] uppercase tracking-widest text-muted-foreground/40 text-center py-4">Answer pending synthesis...</p>
                )}
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-border/50 mt-auto">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    <span className="text-[10px] font-code uppercase tracking-widest">{q.evidenceIds?.length || 0} Evidence</span>
                 </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="size-3.5" />
                    <span className="text-[10px] font-code uppercase tracking-widest">{q.conceptIds?.length || 0} Concepts</span>
                 </div>
                 <div className="ml-auto text-[10px] font-code text-muted-foreground/40 uppercase">
                    Captured: {new Date(q.dateCreated).toLocaleDateString()}
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40 grayscale pointer-events-none">
             <HelpCircle className="size-24 mb-6 text-muted-foreground" />
             <h2 className="text-2xl font-headline italic mb-2">The Silence of the Unquestioned</h2>
             <p className="max-w-md font-body">Formulate your first philosophical inquiry to begin your investigation.</p>
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] font-body">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Formulate Inquiry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question" className="font-code text-[10px] uppercase tracking-widest">Investigation Question</Label>
              <Textarea 
                id="question" 
                placeholder="What is the nature of...?" 
                value={newQuestion.text} 
                onChange={e => setNewQuestion(p => ({ ...p, text: e.target.value }))} 
                className="font-body italic min-h-[100px]" 
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-code uppercase tracking-widest text-xs">Open Investigation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
