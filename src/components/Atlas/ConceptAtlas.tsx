"use client";

import React, { useMemo, useState } from 'react';
import { GitBranch, Maximize2, Minimize2, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Concept, Draft, Insight, Media, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { conceptKey, conceptRelated, conceptTerms, taggedItemsForConcept } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface ConceptAtlasProps {
  concepts: Concept[];
  media: Media[];
  insights: Insight[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
  onAddConcept: (data: Partial<Concept>) => void;
  onUpdateConcept: (concept: Concept) => void;
}

export function ConceptAtlas({ concepts, media, insights, vault, drafts, questions, timeline, onAddConcept, onUpdateConcept }: ConceptAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [branchTarget, setBranchTarget] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newConcept, setNewConcept] = useState({ name: '', description: '' });

  const terms = useMemo(() => conceptTerms(concepts, media, insights, vault, drafts), [concepts, media, insights, vault, drafts]);
  const nodes = useMemo(() => {
    const filtered = terms.filter((name) => !search || name.toLowerCase().includes(search.toLowerCase()));
    return filtered.map((name, index) => {
      const concept = concepts.find((c) => conceptKey(c.name) === conceptKey(name));
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, filtered.length);
      const radius = filtered.length <= 2 ? 22 : 34 + (index % 2) * 7;
      const count = taggedItemsForConcept(name, media, insights, vault, drafts).length;
      return {
        name,
        concept,
        count,
        x: concept?.x ?? 50 + Math.cos(angle) * radius,
        y: concept?.y ?? 50 + Math.sin(angle) * radius,
      };
    });
  }, [concepts, drafts, insights, media, search, terms, vault]);

  const selected = nodes.find((node) => conceptKey(node.name) === conceptKey(selectedName || '')) || nodes[0];
  const selectedConcept = selected?.concept;
  const related = selected ? conceptRelated(selected.name, { media, insights, vault, drafts, questions, timeline }) : null;

  const edges = useMemo(() => {
    const result: { from: string; to: string; type: 'manual' | 'shared'; label: string }[] = [];
    concepts.forEach((concept) => (concept.links || []).forEach((link) => {
      if (terms.includes(conceptKey(concept.name)) && terms.includes(conceptKey(link))) {
        result.push({ from: conceptKey(concept.name), to: conceptKey(link), type: 'manual', label: 'manual branch' });
      }
    }));
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = taggedItemsForConcept(nodes[i].name, media, insights, vault, drafts).map((item) => item.item.id);
        const shared = taggedItemsForConcept(nodes[j].name, media, insights, vault, drafts).filter((item) => a.includes(item.item.id)).length;
        if (shared) result.push({ from: nodes[i].name, to: nodes[j].name, type: 'shared', label: `${shared} shared` });
      }
    }
    return result;
  }, [concepts, drafts, insights, media, nodes, terms, vault]);

  const addConcept = () => {
    if (!newConcept.name.trim()) return;
    onAddConcept({ ...newConcept, name: conceptKey(newConcept.name), createdFrom: 'manual' });
    setNewConcept({ name: '', description: '' });
    setIsAddOpen(false);
  };

  const connectBranch = () => {
    if (!selectedConcept || !branchTarget) return;
    const links = Array.from(new Set([...(selectedConcept.links || []), branchTarget].map(conceptKey)));
    onUpdateConcept({ ...selectedConcept, links, dateUpdated: new Date().toISOString() });
    setBranchTarget('');
  };

  return (
    <div className="relative w-full h-full bg-[#F0EFED] flex overflow-hidden">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
        <div className="relative pointer-events-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search map..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-64 pl-9 bg-white/80 backdrop-blur border-border/50 font-body italic" />
        </div>
        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="flex bg-white/80 backdrop-blur rounded-md border border-border/50 p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.55, z - 0.1))}><Minimize2 className="size-4" /></Button>
            <div className="w-12 flex items-center justify-center font-code text-[11px] font-bold text-primary/60">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}><Maximize2 className="size-4" /></Button>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-lg"><Plus className="size-4 mr-2" /> Concept</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="w-full h-full relative transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
            backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.12) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge, index) => {
              const from = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.from));
              const to = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.to));
              if (!from || !to) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}-${index}`}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke={edge.type === 'manual' ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground) / .35)'}
                  strokeWidth={edge.type === 'manual' ? 2.5 : 1.5}
                  strokeDasharray={edge.type === 'manual' ? '0' : '6 6'}
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <button
              key={node.name}
              className="absolute min-w-[140px] -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setSelectedName(node.name)}
            >
              <Card className={cn('p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border-accent/20 bg-white/95', selected?.name === node.name && 'ring-2 ring-accent border-accent')}>
                <h3 className="font-headline font-semibold text-primary">{node.name}</h3>
                <div className="mt-1 font-code text-[9px] uppercase text-muted-foreground">{node.count} linked</div>
              </Card>
            </button>
          ))}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="max-w-sm">
                <h2 className="text-xl font-headline italic mb-2">Empty Atlas</h2>
                <p className="text-muted-foreground text-sm">Create a concept or tag a source, belief, idea, or draft to begin mapping your system.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>Create Concept</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && related && (
        <aside className="w-80 bg-white border-l border-border/50 shadow-2xl z-20">
          <div className="p-6 border-b border-border/50 flex justify-between items-start">
            <div>
              <Badge variant="outline" className="mb-2 font-code text-[9px] uppercase tracking-widest">Map Node</Badge>
              <h2 className="text-2xl font-headline font-bold italic">{selected.name}</h2>
              {selectedConcept?.description && <p className="text-sm text-muted-foreground mt-2">{selectedConcept.description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedName(null)}><X className="size-4" /></Button>
          </div>
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]">
            <section>
              <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Branch This Concept</h4>
              <div className="flex gap-2">
                <select className="h-9 flex-1 rounded-md border bg-background px-2 text-sm" value={branchTarget} onChange={(event) => setBranchTarget(event.target.value)}>
                  <option value="">Select concept...</option>
                  {concepts.filter((concept) => conceptKey(concept.name) !== conceptKey(selected.name)).map((concept) => (
                    <option key={concept.id} value={concept.name}>{concept.name}</option>
                  ))}
                </select>
                <Button size="sm" onClick={connectBranch}><GitBranch className="size-3 mr-1" /> Connect</Button>
              </div>
            </section>

            <section>
              <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Why Lines Exist</h4>
              <p className="text-sm text-muted-foreground">{edges.filter((edge) => edge.type === 'manual').length} manual branches and {edges.filter((edge) => edge.type === 'shared').length} shared-evidence links.</p>
            </section>

            <section>
              <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Evidence And Outputs</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{related.sources.length} sources</Badge>
                <Badge variant="outline">{related.ideas.length} ideas</Badge>
                <Badge variant="outline">{related.beliefs.length} beliefs</Badge>
                <Badge variant="outline">{related.drafts.length} drafts</Badge>
                <Badge variant="outline">{related.questions.length} questions</Badge>
              </div>
            </section>
          </div>
        </aside>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Plot New Concept</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Concept Name</Label>
              <Input value={newConcept.name} onChange={(event) => setNewConcept((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newConcept.description} onChange={(event) => setNewConcept((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={addConcept}>Anchor Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
