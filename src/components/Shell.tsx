
"use client";

import React from 'react';
import { 
  Library, 
  Map as MapIcon, 
  BookOpen, 
  HelpCircle, 
  PenTool, 
  History, 
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

interface ShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  mediaCount: number;
}

export function Shell({ children, activeView, onViewChange, mediaCount }: ShellProps) {
  const { auth } = useAuth();
  const goalTarget = 12;
  const progress = (mediaCount / goalTarget) * 100;

  const navItems = [
    { id: 'atlas', label: 'Atlas', icon: MapIcon, section: 'Mind' },
    { id: 'concepts', label: 'Concepts', icon: BookOpen, section: 'Mind' },
    { id: 'questions', label: 'Questions', icon: HelpCircle, section: 'Mind' },
    { id: 'library', label: 'Library', icon: Library, section: 'Inputs' },
    { id: 'vault', label: 'Beliefs', icon: ShieldCheck, section: 'Outputs' },
    { id: 'writing', label: 'Writing', icon: PenTool, section: 'Outputs' },
    { id: 'evolution', label: 'Evolution', icon: History, section: 'Outputs' },
  ];

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-2xl z-20">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-headline font-bold text-white tracking-tight">Readex<span className="text-accent">.</span></span>
          </div>
          <p className="font-code text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">Personal Philosophy OS</p>
          
          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-end mb-1">
              <span className="font-code text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Annual Goal</span>
              <span className="font-code text-[11px] text-white/80">{mediaCount} / {goalTarget}</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1 bg-white/10" />
            </div>
            <p className="text-[11px] text-sidebar-foreground/40 italic mt-2">2026 Scholastic Progress</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
          {['Mind', 'Inputs', 'Outputs'].map(section => (
            <div key={section} className="mb-6">
              <h4 className="px-3 mb-2 font-code text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/30 font-bold">{section}</h4>
              <ul className="space-y-1">
                {navItems.filter(i => i.section === section).map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group",
                        activeView === item.id 
                          ? "bg-accent text-accent-foreground shadow-lg" 
                          : "text-sidebar-foreground/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className={cn("size-4", activeView === item.id ? "text-white" : "group-hover:text-accent")} />
                      <span className="text-sm font-medium tracking-wide">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30 space-y-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/40 hover:text-white transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </button>
          <div className="flex items-center justify-between">
            <button className="text-sidebar-foreground/40 hover:text-white transition-colors">
              <Settings className="size-4" />
            </button>
            <span className="text-[10px] font-code text-sidebar-foreground/20">v1.2.0.cloud</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
