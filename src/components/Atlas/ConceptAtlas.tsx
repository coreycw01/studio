
"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { GitBranch, Plus, Search, X, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SourceLinker } from '@/components/SourceLinker';
import type { Concept, Draft, Insight, Media, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { conceptKey, conceptRelated, conceptTerms, taggedItemsForConcept } from '@/lib/readex';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';

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
  uid?: string;
}

export function ConceptAtlas({ concepts, media, insights, vault, drafts, questions, timeline, onAddConcept, onUpdateConcept, uid }: ConceptAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [newConcept, setNewConcept] = useState<Partial<Concept>>({ name: '', description: '', sourceIds: [] });
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement | null>(null);

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
        x: draftPositions[conceptKey(name)]?.x ?? concept?.x ?? 50 + Math.cos(angle) * radius,
        y: draftPositions[conceptKey(name)]?.y ?? concept?.y ?? 50 + Math.sin(angle) * radius,
      };
    });
  }, [concepts, drafts, draftPositions, insights, media, search, terms, vault]);

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
    if (!newConcept.name?.trim()) return;
    onAddConcept({ ...newConcept, name: conceptKey(newConcept.name), createdFrom: 'manual' });
    setNewConcept({ name: '', description: '', sourceIds: [] });
    setIsAddOpen(false);
  };

  const toggleNewConceptSource = (id: string) => {
    setNewConcept(prev => {
      const current = prev.sourceIds || [];
      const next = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  const connectBranch = (targetName: string) => {
    if (!selectedConcept) return;
    const links = Array.from(new Set([...(selectedConcept.links || []), targetName].map(conceptKey)));
    onUpdateConcept({ ...selectedConcept, links, dateUpdated: new Date().toISOString() });
    setBranchSearch('');
  };

  const removeBranch = (targetName: string) => {
    if (!selectedConcept) return;
    const links = (selectedConcept.links || []).filter(l => conceptKey(l) !== conceptKey(targetName));
    onUpdateConcept({ ...selectedConcept, links, dateUpdated: new Date().toISOString() });
  };

  const startPanning = (event: React.MouseEvent | React.PointerEvent) => {
    if (draggingName) return;
    setIsPanning(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
    setSelectedName(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isPanning) {
      const dx = event.clientX - lastMousePos.x;
      const dy = event.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const stopPanning = () => {
    setIsPanning(false);
  };

  const moveNode = (name: string, clientX: number, clientY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(94, Math.max(6, ((clientX - rect.left - pan.x) / (rect.width * zoom)) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top - pan.y) / (rect.height * zoom)) * 100));
    setDraftPositions((prev) => ({ ...prev, [conceptKey(name)]: { x, y } }));
  };

  const persistNode = (name: string) => {
    const concept = concepts.find((item) => conceptKey(item.name) === conceptKey(name));
    const position = draftPositions[conceptKey(name)];
    if (concept && position) onUpdateConcept({ ...concept, ...position, dateUpdated: new Date().toISOString() });
    setDraggingName(null);
  };

  const edgePoints = (from: typeof nodes[number], to: typeof nodes[number]) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const horizontalRadius = 7.2;
    const verticalRadius = 4.2;
    const fromRadius = Math.min(Math.abs(horizontalRadius / (ux || 0.001)), Math.abs(verticalRadius / (uy || 0.001)));
    const toRadius = fromRadius;
    return {
      x1: from.x + ux * Math.min(fromRadius, len / 2),
      y1: from.y + uy * Math.min(fromRadius, len / 2),
      x2: to.x - ux * Math.min(toRadius, len / 2),
      y2: to.y - uy * Math.min(toRadius, len / 2),
    };
  };

  const selectedNode = nodes.find((node) => conceptKey(node.name) === conceptKey(selectedName || ''));
  const selectedConcept = selectedNode?.concept;
  const related = selectedName ? conceptRelated(selectedName, { media, insights, vault, drafts, questions, timeline }) : null;

  return (
    <div className="relative w-full h-full bg-background flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <Stat value={nodes.length} label="Nodes" />
          <Stat value={edges.filter((e) => e.type === 'manual').length} label="Manual" />
          <Stat value={edges.filter((e) => e.type === 'shared').length} label="Auto" />
          <Stat value={selectedName || 'None'} label="Active" />
        </div>
      </div>

      <div className="px-6 pb-4 flex justify-end items-start gap-4 z-10">
        <div className="relative pointer-events-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search map..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-64 pl-9 bg-white/80 backdrop-blur border-border/50 font-body italic" />
        </div>
        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="flex bg-white/80 backdrop-blur rounded-md border border-border/50 p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="font-bold text-lg">-</Button>
            <div className="w-12 flex items-center justify-center font-code text-[11px] font-bold text-primary/60">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))} className="font-bold text-lg">+</Button>
            <div className="w-px bg-border mx-1 my-1" />
            <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)}>
              {isFullScreen ? <Maximize className="size-4" /> : <Minimize className="size-4" />}
            </Button>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-lg"><Plus className="size-4 mr-2" /> Concept</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex px-6 pb-6 gap-4">
        <div 
          ref={mapRef}
          className="flex-1 overflow-hidden relative rounded-lg border border-border bg-muted/5 cursor-grab active:cursor-grabbing"
          onMouseDown={startPanning}
          onMouseMove={handleMouseMove}
          onMouseUp={stopPanning}
          onMouseLeave={stopPanning}
        >
          <div
            className="w-full h-full absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(circle at 20% 10%, hsl(var(--accent) / .08), transparent 25%), radial-gradient(circle at 82% 18%, hsl(160 87% 20% / .08), transparent 24%), radial-gradient(hsl(var(--muted-foreground) / 0.12) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((edge, index) => {
                const from = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.from));
                const to = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.to));
                if (!from || !to) return null;
                const points = edgePoints(from, to);
                return (
                  <line
                    key={`${edge.from}-${edge.to}-${index}`}
                    x1={`${points.x1}%`}
                    y1={`${points.y1}%`}
                    x2={`${points.x2}%`}
                    y2={`${points.y2}%`}
                    stroke={edge.type === 'manual' ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground) / .35)'}
                    strokeWidth={edge.type === 'manual' ? 4 : 2}
                    strokeDasharray={edge.type === 'manual' ? '0' : '6 6'}
                    strokeLinecap="round"
                    className="transition-all"
                  />
                );
              })}
            </svg>

            {nodes.map((node) => (
              <button
                key={node.name}
                className="absolute min-w-[140px] -translate-x-1/2 -translate-y-1/2 text-center cursor-grab active:cursor-grabbing transition-none"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelectedName(node.name);
                  setDraggingName(node.name);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (draggingName === node.name) moveNode(node.name, event.clientX, event.clientY);
                }}
                onPointerUp={() => persistNode(node.name)}
                onPointerCancel={() => setDraggingName(null)}
              >
                <Card className={cn('rounded-lg p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border-accent/20 bg-white/95', selectedName === node.name && 'ring-2 ring-accent border-accent shadow-2xl')}>
                  <h3 className="font-headline font-semibold text-primary">{node.name}</h3>
                  <div className="font-code text-[9px] uppercase text-muted-foreground">{node.count} linked</div>
                </Card>
              </button>
            ))}
          </div>
        </div>

        {!isFullScreen && (
          <aside className="w-80 bg-white border border-border rounded-lg shadow-sm z-20 overflow-hidden flex flex-col shrink-0">
            {selectedName ? (
              <>
                <div className="p-5 border-b border-border/50 flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2 font-code text-[9px] uppercase tracking-widest text-accent">Map Node</Badge>
                    <h2 className="text-2xl font-headline font-bold italic">{selectedName}</h2>
                    {selectedConcept?.description && <p className="text-sm text-muted-foreground mt-2">{selectedConcept.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedName(null)}><X className="size-4" /></Button>
                </div>
                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                  <section>
                    <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Manual Branches</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(selectedConcept?.links || []).map((link) => (
                        <Badge key={link} variant="secondary" className="flex items-center gap-1 font-code text-[9px] uppercase tracking-widest bg-accent/10 text-accent border-accent/20 pr-1">
                          {link}
                          <button onClick={() => removeBranch(link)} className="hover:text-destructive transition-colors ml-1">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {!(selectedConcept?.links?.length) && <p className="text-[10px] text-muted-foreground italic">No manual branches established.</p>}
                    </div>
                    
                    <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Connect New Branch</h4>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start font-body text-xs italic text-muted-foreground">
                          <Plus className="size-3 mr-2" /> Select concept...
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2 border-b">
                          <Input 
                            placeholder="Search concepts..." 
                            className="h-8 text-[11px]" 
                            value={branchSearch} 
                            onChange={(e) => setBranchSearch(e.target.value)} 
                          />
                        </div>
                        <ScrollArea className="h-64">
                          <div className="p-1">
                            {concepts
                              .filter(c => conceptKey(c.name) !== conceptKey(selectedName))
                              .filter(c => !branchSearch || c.name.toLowerCase().includes(branchSearch.toLowerCase()))
                              .map(c => (
                                <button 
                                  key={c.id} 
                                  className="w-full text-left p-2 hover:bg-muted rounded-sm font-code text-[10px] uppercase tracking-wider"
                                  onClick={() => connectBranch(c.name)}
                                >
                                  {c.name}
                                </button>
                              ))
                            }
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </section>

                  <section>
                    <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Evidence And Outputs</h4>
                    {related ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-muted/30">{related.sources.length} sources</Badge>
                        <Badge variant="outline" className="bg-muted/30">{related.beliefs.length} claims</Badge>
                        <Badge variant="outline" className="bg-muted/30">{related.drafts.length} drafts</Badge>
                        <Badge variant="outline" className="bg-muted/30">{related.questions.length} questions</Badge>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Gathering connections...</p>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MapIcon className="size-12 mb-4 opacity-10" />
                <h3 className="font-headline text-lg italic mb-2">Mental Atlas</h3>
                <p className="text-sm">Select a concept node on the map to inspect its connections, evidence, and branches.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Plot New Concept</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label>Concept Name</Label>
              <Input value={newConcept.name} onChange={(event) => setNewConcept((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newConcept.description} onChange={(event) => setNewConcept((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[100px]" />
            </div>
            <SourceLinker 
              media={media} 
              selectedIds={newConcept.sourceIds || []} 
              onToggle={toggleNewConceptSource} 
              label="Root Evidence (Sources)"
            />
          </div>
          <DialogFooter className="pt-4"><Button onClick={addConcept}>Anchor Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-border rounded-md px-3 py-1.5 shadow-sm whitespace-nowrap">
      <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/60">{label}</div>
      <div className="font-headline text-lg font-bold italic text-primary truncate max-w-[120px]">{value}</div>
    </div>
  );
}

const MapIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);
