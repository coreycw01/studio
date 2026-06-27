"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { MEDIA_LABELS, MEDIA_TYPES } from '@/lib/readex';
import type { GoalSettings, MediaType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GoalsPageProps {
  goal: GoalSettings;
  goalProgress: Partial<Record<MediaType, number>>;
  onSaveGoal: (goal: GoalSettings) => Promise<void>;
}

export function GoalsPage({ goal, goalProgress, onSaveGoal }: GoalsPageProps) {
  const [draft, setDraft] = useState<GoalSettings>(goal);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => setDraft(goal), [goal]);

  const rows = useMemo(() => MEDIA_TYPES.map((type) => {
    const active = draft.types.includes(type);
    const done = goalProgress[type] || 0;
    const target = draft.targets[type] || 12;
    const percent = Math.min(100, (done / Math.max(1, target)) * 100);
    return { type, active, done, target, percent };
  }), [draft, goalProgress]);

  const activeRows = rows.filter((row) => row.active);

  const toggleType = (type: MediaType, active: boolean) => {
    setDraft((prev) => ({
      ...prev,
      types: active ? Array.from(new Set([...prev.types, type])) : prev.types.filter((item) => item !== type),
    }));
  };

  const setTarget = (type: MediaType, target: number) => {
    setDraft((prev) => ({
      ...prev,
      targets: { ...prev.targets, [type]: Math.max(1, target || 1) },
    }));
  };

  const saveGoals = async () => {
    setSaving(true);
    try {
      await onSaveGoal(draft);
      toast({ title: 'Goals saved', description: 'Your source targets are now tracked separately by media type.' });
    } catch {
      toast({ variant: 'destructive', title: 'Goals not saved', description: 'Noesis could not update your goals.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 pt-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-headline font-semibold italic text-foreground/80">Goals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Set separate source targets so books, films, videos, papers, and other inputs are measured by their own rhythm.
            </p>
          </div>
          <Button onClick={saveGoals} disabled={saving} className="rounded-full px-7 font-bold shadow-md shadow-accent/20">
            <Save className="mr-2 size-4" /> {saving ? 'Saving' : 'Save Goals'}
          </Button>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {(activeRows.length ? activeRows : rows.slice(0, 3)).slice(0, 3).map((row) => (
            <Card key={row.type} className="rounded-xl border-accent/20 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active Goal</div>
                  <h2 className="mt-1 font-headline text-2xl font-bold italic">{MEDIA_LABELS[row.type]}</h2>
                </div>
                <Target className="size-5 text-accent" />
              </div>
              <div className="mb-3 flex items-end justify-between">
                <span className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">{row.done} complete</span>
                <span className="font-headline text-3xl font-bold italic">{row.done}/{row.target}</span>
              </div>
              <Progress value={row.percent} className="h-2" />
            </Card>
          ))}
        </section>

        <Card className="rounded-2xl border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <Label className="readex-kicker text-[9px] font-bold uppercase">Goal Label</Label>
            <Input value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} className="mt-2 h-11 max-w-xl rounded-full" />
          </div>

          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                key={row.type}
                className={cn(
                  'grid grid-cols-[auto_1fr_90px_auto] items-center gap-3 rounded-xl border p-3 transition-colors',
                  row.active ? 'border-accent/25 bg-accent/[0.04]' : 'border-border bg-background/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(event) => toggleType(row.type, event.target.checked)}
                  className="size-4 accent-accent"
                />
                <div>
                  <div className="font-code text-[10px] font-bold uppercase tracking-widest">{MEDIA_LABELS[row.type]}</div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${row.percent}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{row.done} finished</span>
                  </div>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={row.target}
                  onChange={(event) => setTarget(row.type, Number(event.target.value))}
                  className="h-9 rounded-full text-right font-code text-xs"
                />
                <Badge variant="outline" className="rounded-full bg-card font-code text-[9px]">{row.done}/{row.target}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
