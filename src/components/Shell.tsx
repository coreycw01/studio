
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  HelpCircle,
  History,
  Library,
  Menu,
  Map as MapIcon,
  PenTool,
  Repeat,
  Settings,
  ShieldCheck,
  Edit2,
  ChevronRight,
  Table as TableIcon,
  Highlighter,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { GoalSettings, MediaType } from '@/lib/types';
import { MEDIA_LABELS } from '@/lib/readex';
import placeholderData from '@/app/lib/placeholder-images.json';

export interface MovementMetrics {
  rawAnnotations: number;
  unsupportedPositions: number;
  openInquiries: number;
  practicesWithoutPosition: number;
  positionsWithoutPractice: number;
}

interface ShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  counts: {
    concepts: number;
    questions: number;
    media: number;
    annotations: number;
    vault: number;
    drafts: number;
    practices: number;
    timeline: number;
  };
  goal: GoalSettings;
  goalProgress: Partial<Record<MediaType, number>>;
  onOpenSettings: () => void;
  movement?: MovementMetrics;
}

export function Shell({ children, activeView, onViewChange, counts, goal, goalProgress, onOpenSettings, movement }: ShellProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = [
    { id: 'atlas', label: 'Atlas', icon: MapIcon, section: 'Mind' },
    { id: 'concepts', label: 'Concepts', icon: BookOpen, section: 'Mind', count: counts.concepts },
    { id: 'questions', label: 'Inquiries', icon: HelpCircle, section: 'Mind', count: counts.questions },
    { id: 'library', label: 'Library', icon: Library, section: 'Inputs', count: counts.media },
    { id: 'source-index', label: 'Source Index', icon: TableIcon, section: 'Inputs', count: counts.media },
    { id: 'annotations', label: 'Annotations', icon: Highlighter, section: 'Inputs', count: counts.annotations },
    { id: 'goals', label: 'Goals', icon: Target, section: 'Inputs' },
    { id: 'vault', label: 'Positions', icon: ShieldCheck, section: 'Outputs', count: counts.vault },
    { id: 'writing', label: 'Works', icon: PenTool, section: 'Outputs', count: counts.drafts },
    { id: 'practices', label: 'Practices', icon: Repeat, section: 'Outputs', count: counts.practices },
    { id: 'evolution', label: 'Evolution', icon: History, section: 'Outputs', count: counts.timeline },
  ];

  const logoData = placeholderData.placeholderImages.find(img => img.id === 'app-logo');

  useEffect(() => {
    const saved = window.localStorage.getItem('noesis:sidebar-collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('noesis:sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const sortedActiveGoals = goal.types.map((type) => {
    const done = goalProgress[type] || 0;
    const target = goal.targets[type] || 12;
    const percent = (done / Math.max(1, target)) * 100;
    return { type, done, target, percent };
  }).sort((a, b) => b.percent - a.percent);

  const toggleSidebar = () => setCollapsed((current) => !current);
  const handleNavChange = (view: string) => {
    onViewChange(view);
    setMobileNavOpen(false);
  };

  const renderNavButton = (item: typeof navItems[number]) => {
    const button = (
      <button
        onClick={() => handleNavChange(item.id)}
        className={cn(
          'w-full flex items-center transition-all group',
          collapsed && !isMobile ? 'justify-center px-3 py-2.5' : 'gap-2.5 px-5 py-2.5',
          activeView === item.id
            ? 'border-accent bg-accent/10 text-white border-l-2'
            : 'border-transparent text-sidebar-foreground/60 hover:text-white hover:bg-white/[0.04] border-l-2'
        )}
      >
        <item.icon className={cn('size-4 shrink-0', activeView === item.id ? 'text-white' : 'group-hover:text-accent')} />
        {(!collapsed || isMobile) && (
          <>
            <span className="text-[13px] font-body font-medium tracking-wide flex-1 text-left">{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-code text-[9px] text-white/50">{item.count}</span>
            )}
          </>
        )}
      </button>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return <React.Fragment key={item.id}>{button}</React.Fragment>;
  };

  const sidebarContent = (
    <>
      <div className={cn("border-b border-sidebar-border", collapsed && !isMobile ? "p-3" : "p-5")}>
        <div className={cn("mb-2 flex items-center", collapsed && !isMobile ? "justify-center" : "gap-3")}>
          <div className="relative size-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] shrink-0">
            {logoData && (
              <Image
                src={logoData.imageUrl}
                alt={logoData.description}
                width={32}
                height={32}
                className="object-cover"
                data-ai-hint={logoData.imageHint}
              />
            )}
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-[22px] font-headline font-bold text-white tracking-tight">Noesis<span className="text-accent">.</span></span>
          )}
        </div>
        {(!collapsed || isMobile) && (
          <p className="font-code text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/35 font-medium">Turn thought into understanding.</p>
        )}

        <div className={cn("mt-4 flex items-center", collapsed && !isMobile ? "justify-center" : "justify-between")}>
          {(!collapsed || isMobile) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavChange('goals')}
              className="group/goals rounded-full px-3 text-sidebar-foreground/70 hover:bg-white/[0.08] hover:text-white"
            >
              <Target className="mr-2 size-3.5" />
              Goals
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={isMobile ? () => setMobileNavOpen(false) : toggleSidebar}
            className="rounded-full text-sidebar-foreground/55 hover:bg-white/[0.08] hover:text-white"
            title={collapsed && !isMobile ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isMobile ? <ChevronLeft className="size-4" /> : <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />}
          </Button>
        </div>

        {(!collapsed || isMobile) && (
          <div
            onClick={() => handleNavChange('goals')}
            className="mt-4 w-full rounded border border-white/10 bg-white/[0.05] p-3 transition-all hover:border-white/20 hover:bg-white/[0.075] group/goals relative cursor-pointer"
          >
            <div className="mb-3 flex justify-between items-center">
              <span className="font-code text-[9px] uppercase tracking-wider text-sidebar-foreground/60 font-bold">Goals</span>
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
        )}
      </div>

      {(!collapsed || isMobile) && movement && (movement.rawAnnotations + movement.unsupportedPositions + movement.openInquiries + movement.practicesWithoutPosition + movement.positionsWithoutPractice) > 0 && (
        <div className="px-5 pb-4 border-b border-sidebar-border">
          <div className="flex items-center gap-1.5 mb-2 mt-4">
            <AlertTriangle className="size-3 text-amber-400" />
            <span className="font-code text-[8px] uppercase tracking-[0.16em] text-sidebar-foreground/40 font-bold">Needs Attention</span>
          </div>
          <div className="space-y-1.5">
            {movement.rawAnnotations > 0 && (
              <button onClick={() => handleNavChange('annotations')} className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group">
                <span className="font-code text-[9px] text-white/60 group-hover:text-white/85 transition-colors">
                  <span className="text-amber-400 font-bold">{movement.rawAnnotations}</span> raw annotation{movement.rawAnnotations !== 1 ? 's' : ''} unclassified
                </span>
              </button>
            )}
            {movement.openInquiries > 0 && (
              <button onClick={() => handleNavChange('questions')} className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group">
                <span className="font-code text-[9px] text-white/60 group-hover:text-white/85 transition-colors">
                  <span className="text-amber-400 font-bold">{movement.openInquiries}</span> open inquir{movement.openInquiries !== 1 ? 'ies' : 'y'} without answer
                </span>
              </button>
            )}
            {movement.unsupportedPositions > 0 && (
              <button onClick={() => handleNavChange('vault')} className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group">
                <span className="font-code text-[9px] text-white/60 group-hover:text-white/85 transition-colors">
                  <span className="text-amber-400 font-bold">{movement.unsupportedPositions}</span> position{movement.unsupportedPositions !== 1 ? 's' : ''} without evidence
                </span>
              </button>
            )}
            {movement.positionsWithoutPractice > 0 && (
              <button onClick={() => handleNavChange('practices')} className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group">
                <span className="font-code text-[9px] text-white/60 group-hover:text-white/85 transition-colors">
                  <span className="text-amber-400 font-bold">{movement.positionsWithoutPractice}</span> position{movement.positionsWithoutPractice !== 1 ? 's' : ''} not yet tested
                </span>
              </button>
            )}
            {movement.practicesWithoutPosition > 0 && (
              <button onClick={() => handleNavChange('practices')} className="w-full text-left rounded-lg px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group">
                <span className="font-code text-[9px] text-white/60 group-hover:text-white/85 transition-colors">
                  <span className="text-amber-400 font-bold">{movement.practicesWithoutPosition}</span> practice{movement.practicesWithoutPosition !== 1 ? 's' : ''} without a belief
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {['Mind', 'Inputs', 'Outputs'].map((section) => (
          <div key={section} className="mb-5">
            {(!collapsed || isMobile) && (
              <h4 className="px-5 mb-1 font-code text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/22 font-bold">{section}</h4>
            )}
            <ul className="space-y-1">
              {navItems.filter((item) => item.section === section).map((item) => (
                <li key={item.id}>{renderNavButton(item)}</li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-sidebar-border bg-transparent flex items-center", collapsed && !isMobile ? "justify-center p-3" : "justify-between p-4")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn('text-sidebar-foreground/45 hover:text-white transition-colors rounded-full p-2 hover:bg-white/[0.06]', activeView === 'settings' && 'text-white')}
              onClick={() => { onOpenSettings(); setMobileNavOpen(false); }}
              title="Settings"
            >
              <Settings className="size-4" />
            </button>
          </TooltipTrigger>
          {collapsed && !isMobile && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>
        {(!collapsed || isMobile) && <span className="text-[9px] font-code text-sidebar-foreground/20">v1.3.0 cloud</span>}
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={160}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {!isMobile && (
          <aside className={cn(
            "hidden md:flex bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border shadow-2xl z-20 transition-[width] duration-300 ease-out",
            collapsed ? "w-[84px]" : "w-[252px]"
          )}>
            {sidebarContent}
          </aside>
        )}

        {isMobile && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              className="fixed left-4 top-4 z-30 rounded-full border-border/60 bg-card shadow-md md:hidden"
            >
              <Menu className="size-4" />
            </Button>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetContent side="left" className="w-[280px] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col">{sidebarContent}</div>
              </SheetContent>
            </Sheet>
          </>
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden bg-background min-w-0">
        {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
