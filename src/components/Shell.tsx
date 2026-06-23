
"use client";

import React from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  History, 
  Library, 
  Map as MapIcon, 
  PenTool, 
  Settings, 
  ShieldCheck,
  Edit2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { GoalSettings, MediaType } from '@/lib/types';
import { MEDIA_LABELS } from '@/lib/readex';

interface ShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  counts: {
    concepts: number;
    questions: number;
    media: number;
    vault: number;
    drafts: number;
    timeline: number;
  };
  goal: GoalSettings;
  goalProgress: Partial<Record<MediaType, number>>;
  onEditGoal: () => void;
}

export function Shell({ children, activeView, onViewChange, counts, goal, goalProgress, onEditGoal }: ShellProps) {
  const navItems = [
    { id: 'atlas', label: 'Atlas', icon: MapIcon, section: 'Mind' },
    { id: 'concepts', label: 'Concepts', icon: BookOpen, section: 'Mind', count: counts.concepts },
    { id: 'questions', label: 'Inquiries', icon: HelpCircle, section: 'Mind', count: counts.questions },
    { id: 'library', label: 'Sources', icon: Library, section: 'Inputs', count: counts.media },
    { id: 'vault', label: 'Beliefs', icon: ShieldCheck, section: 'Outputs', count: counts.vault },
    { id: 'writing', label: 'Writing', icon: PenTool, section: 'Outputs', count: counts.drafts },
    { id: 'evolution', label: 'Evolution', icon: History, section: 'Outputs', count: counts.timeline },
  ];

  const sortedActiveGoals = goal.types.map((type) => {
    const done = goalProgress[type] || 0;
    const target = goal.targets[type] || 12;
    const percent = (done / Math.max(1, target)) * 100;
    return { type, done, target, percent };
  }).sort((a, b) => b.percent - a.percent);

  const doneTotal = sortedActiveGoals.reduce((sum, row) => sum + row.done, 0);
  const targetTotal = sortedActiveGoals.reduce((sum, row) => sum + row.target, 0);
  const totalProgress = targetTotal ? (doneTotal / targetTotal) * 100 : 0;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-[252px] bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-2xl z-20">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[22px] font-headline font-bold text-white tracking-tight">Noesis<span className="text-accent">.</span></span>
          </div>
          <p className="font-code text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/30 font-medium">Turn thought into understanding.</p>

          <div 
            onClick={onEditGoal}
            className="mt-6 w-full rounded border border-white/10 bg-white/[0.05] p-3 transition-all hover:border-white/20 hover:bg-white/[0.075] group/goals relative cursor-pointer"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-code text-[9px] uppercase tracking-wider text-sidebar-foreground/60 font-bold">Source Goals</span>
              <Edit2 className="size-3 text-sidebar-foreground/40 opacity-0 group-hover/goals:opacity-100 transition-opacity" />
            </div>
            
            <ScrollArea className="h-[110px] pr-2">
              <div className="space-y-4">
                {sortedActiveGoals.map((row) => (
                  <div key={row.type} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="font-code text-[7px] uppercase tracking-widest text-sidebar-foreground/40 font-bold">{MEDIA_LABELS[row.type]}</span>
                      <span className="font-code text-[9px] text-white/70 font-bold">{row.done}/{row.target}</span>
                    </div>
                    <Progress value={row.percent} className="h-1 bg-white/10" />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-code text-[8px] uppercase tracking-widest text-sidebar-foreground/30 font-bold group-hover/goals:text-sidebar-foreground/60 transition-colors">
              <span>View All Details</span>
              <ChevronRight className="size-2.5" />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {['Mind', 'Inputs', 'Outputs'].map((section) => (
            <div key={section} className="mb-5">
              <h4 className="px-5 mb-1 font-code text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/20 font-bold">{section}</h4>
              <ul className="space-y-1">
                {navItems.filter((item) => item.section === section).map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 border-l-2 px-5 py-2.5 transition-all group',
                        activeView === item.id
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-transparent text-sidebar-foreground/50 hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      <item.icon className={cn('size-4', activeView === item.id ? 'text-white' : 'group-hover:text-accent')} />
                      <span className="text-[13px] font-body font-medium tracking-wide flex-1 text-left">{item.label}</span>
                      {typeof item.count === 'number' && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-code text-[9px] text-white/35">{item.count}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-transparent flex items-center justify-between">
          <button className="text-sidebar-foreground/40 hover:text-white transition-colors" onClick={onEditGoal}>
            <Settings className="size-4" />
          </button>
          <span className="text-[9px] font-code text-sidebar-foreground/20">v1.3.0 cloud</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}
