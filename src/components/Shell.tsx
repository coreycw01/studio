"use client";

import React from 'react';
import { BookOpen, HelpCircle, History, Library, Map as MapIcon, PenTool, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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
    { id: 'questions', label: 'Questions', icon: HelpCircle, section: 'Mind', count: counts.questions },
    { id: 'library', label: 'Library', icon: Library, section: 'Inputs', count: counts.media },
    { id: 'vault', label: 'Beliefs', icon: ShieldCheck, section: 'Outputs', count: counts.vault },
    { id: 'writing', label: 'Writing', icon: PenTool, section: 'Outputs', count: counts.drafts },
    { id: 'evolution', label: 'Evolution', icon: History, section: 'Outputs', count: counts.timeline },
  ];

  const goalRows = goal.types.map((type) => {
    const done = goalProgress[type] || 0;
    const target = goal.targets[type] || 12;
    return { type, done, target };
  });
  const doneTotal = goalRows.reduce((sum, row) => sum + row.done, 0);
  const targetTotal = goalRows.reduce((sum, row) => sum + row.target, 0);
  const totalProgress = targetTotal ? (doneTotal / targetTotal) * 100 : 0;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-2xl z-20">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-headline font-bold text-white tracking-tight">Readex<span className="text-accent">.</span></span>
          </div>
          <p className="font-code text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">Personal Philosophy OS</p>

          <button onClick={onEditGoal} className="mt-8 w-full rounded-md border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10">
            <div className="flex justify-between items-end mb-2">
              <span className="font-code text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Goal</span>
              <span className="font-code text-[10px] text-white/70">By Type</span>
            </div>
            <p className="font-code text-[9px] uppercase tracking-wider text-sidebar-foreground/45 mb-2">{goal.label}</p>
            <Progress value={totalProgress} className="h-1 bg-white/10 mb-3" />
            <div className="space-y-1.5">
              {goalRows.length ? goalRows.map((row) => (
                <div key={row.type} className="grid grid-cols-[1fr_auto] gap-2 font-code text-[9px] uppercase tracking-wider text-sidebar-foreground/45">
                  <span>{MEDIA_LABELS[row.type]}</span>
                  <span className="text-white/70">{row.done} / {row.target}</span>
                </div>
              )) : (
                <div className="font-code text-[9px] uppercase text-sidebar-foreground/45">No media goals selected</div>
              )}
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
          {['Mind', 'Inputs', 'Outputs'].map((section) => (
            <div key={section} className="mb-6">
              <h4 className="px-3 mb-2 font-code text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/30 font-bold">{section}</h4>
              <ul className="space-y-1">
                {navItems.filter((item) => item.section === section).map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group',
                        activeView === item.id
                          ? 'bg-accent text-accent-foreground shadow-lg'
                          : 'text-sidebar-foreground/60 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon className={cn('size-4', activeView === item.id ? 'text-white' : 'group-hover:text-accent')} />
                      <span className="text-sm font-medium tracking-wide flex-1 text-left">{item.label}</span>
                      {typeof item.count === 'number' && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 font-code text-[9px] text-white/60">{item.count}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30 flex items-center justify-between">
          <button className="text-sidebar-foreground/40 hover:text-white transition-colors" onClick={onEditGoal}>
            <Settings className="size-4" />
          </button>
          <span className="text-[10px] font-code text-sidebar-foreground/20">v1.3.0.cloud</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
