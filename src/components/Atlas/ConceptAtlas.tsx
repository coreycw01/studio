
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Maximize, Minimize, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceLinker } from '@/components/SourceLinker';
import type {
  AtlasAutoLinkFilters,
  AtlasMap,
  AtlasMapLink,
  AtlasMapLinkType,
  Concept,
  Draft,
  Insight,
  Media,
  Practice,
  Question,
  TimelineEvent,
  VaultEntry,
} from '@/lib/types';
import { conceptKey, conceptRelated, conceptTerms, taggedItemsForConcept, today, uid as makeId } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface ConceptAtlasProps {
  concepts: Concept[];
  media: Media[];
  insights: Insight[];
  vault: VaultEntry[];
  drafts: Draft[];
  practices: Practice[];
  questions: Question[];
  timeline: TimelineEvent[];
  atlasMaps: AtlasMap[];
  onAddConcept: (data: Partial<Concept>) => void;
  onUpdateConcept: (concept: Concept) => void;
  onAddAtlasMap: (data: Partial<AtlasMap>) => void;
  onUpdateAtlasMap: (map: AtlasMap) => void;
  onDeleteAtlasMap: (id: string) => void;
  uid?: string;
}

type MapNode = {
  name: string;
  concept?: Concept;
  count: number;
  x: number;
  y: number;
};

type MapEdge = {
  from: string;
  to: string;
  type: 'user' | 'concept' | 'shared';
  label: string;
  linkType?: AtlasMapLinkType;
  id?: string;
};

const defaultAutoLinkFilters: AtlasAutoLinkFilters = {
  sharedSources: true,
  sharedPositions: true,
  sharedInquiries: true,
  sharedWorks: true,
  sharedPractices: true,
  conceptLinks: true,
};

const linkTypes: AtlasMapLinkType[] = ['supports', 'challenges', 'examples', 'causes', 'questions', 'practices', 'relates', 'custom'];

export function ConceptAtlas({
  concepts,
  media,
  insights,
  vault,
  drafts,
  practices,
  questions,
  timeline,
  atlasMaps,
  onAddConcept,
  onUpdateConcept,
  onAddAtlasMap,
  onUpdateAtlasMap,
  onDeleteAtlasMap,
}: ConceptAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [activeMapId, setActiveMapId] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isNodeOpen, setIsNodeOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [newConcept, setNewConcept] = useState<Partial<Concept>>({ name: '', description: '', sourceIds: [] });
  const [newMap, setNewMap] = useState({ title: '', description: '' });
  const [linkDraft, setLinkDraft] = useState<{ to: string; type: AtlasMapLinkType; label: string; note: string }>({ to: '', type: 'relates', label: '', note: '' });
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement | null>(null);

  const terms = useMemo(() => conceptTerms(concepts, media, insights, vault, drafts, practices), [concepts, media, insights, vault, drafts, practices]);
  const activeMap = atlasMaps.find((map) => map.id === activeMapId) || atlasMaps[0] || null;
  const selectedConcept = concepts.find((item) => conceptKey(item.name) === conceptKey(selectedName || ''));
  const related = selectedName ? conceptRelated(selectedName, { media, insights, vault, drafts, practices, questions, timeline }) : null;

  useEffect(() => {
    if (!activeMapId && atlasMaps[0]) setActiveMapId(atlasMaps[0].id);
    if (activeMapId && !atlasMaps.some((map) => map.id === activeMapId)) setActiveMapId(atlasMaps[0]?.id || '');
  }, [activeMapId, atlasMaps]);

  const visibleTerms = useMemo(() => {
    if (mode === 'custom') return activeMap ? activeMap.nodeNames.map(conceptKey) : [];
    return terms;
  }, [activeMap, mode, terms]);

  const nodes = useMemo<MapNode[]>(() => {
    const filtered = visibleTerms.filter((name) => !search || name.toLowerCase().includes(search.toLowerCase()));
    return filtered.map((name, index) => {
      const concept = concepts.find((c) => conceptKey(c.name) === conceptKey(name));
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, filtered.length);
      const radius = filtered.length <= 2 ? 22 : 34 + (index % 2) * 7;
      const count = taggedItemsForConcept(name, media, insights, vault, drafts, practices).length;
      const customPosition = activeMap?.nodePositions?.[conceptKey(name)];
      return {
        name,
        concept,
        count,
        x: draftPositions[conceptKey(name)]?.x ?? customPosition?.x ?? concept?.x ?? 50 + Math.cos(angle) * radius,
        y: draftPositions[conceptKey(name)]?.y ?? customPosition?.y ?? concept?.y ?? 50 + Math.sin(angle) * radius,
      };
    });
  }, [activeMap, concepts, drafts, draftPositions, insights, media, practices, search, vault, visibleTerms]);

  const edges = useMemo<MapEdge[]>(() => {
    const result: MapEdge[] = [];
    const nodeNames = new Set(nodes.map((node) => conceptKey(node.name)));
    const filters = mode === 'custom' ? (activeMap?.autoLinkFilters || defaultAutoLinkFilters) : defaultAutoLinkFilters;

    if (mode === 'custom' && activeMap) {
      (activeMap.manualLinks || []).forEach((link) => {
        if (nodeNames.has(conceptKey(link.from)) && nodeNames.has(conceptKey(link.to))) {
          result.push({ from: conceptKey(link.from), to: conceptKey(link.to), type: 'user', label: link.label || link.type, linkType: link.type, id: link.id });
        }
      });
    }

    if (mode === 'auto' || filters.conceptLinks) {
      concepts.forEach((concept) => (concept.links || []).forEach((link) => {
        if (nodeNames.has(conceptKey(concept.name)) && nodeNames.has(conceptKey(link))) {
          result.push({ from: conceptKey(concept.name), to: conceptKey(link), type: 'concept', label: 'saved concept link' });
        }
      }));
    }

    const autoFiltersEnabled = mode === 'auto' || filters.sharedSources || filters.sharedPositions || filters.sharedInquiries || filters.sharedWorks || filters.sharedPractices;
    if (autoFiltersEnabled) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const left = conceptRelated(nodes[i].name, { media, insights, vault, drafts, practices, questions, timeline });
          const right = conceptRelated(nodes[j].name, { media, insights, vault, drafts, practices, questions, timeline });
          const sharedSources = left.sources.filter((item) => right.sources.some((other) => other.id === item.id)).length;
          const sharedPositions = left.beliefs.filter((item) => right.beliefs.some((other) => other.id === item.id)).length;
          const sharedInquiries = left.questions.filter((item) => right.questions.some((other) => other.id === item.id)).length;
          const sharedWorks = left.drafts.filter((item) => right.drafts.some((other) => other.id === item.id)).length;
          const sharedPractices = left.practices.filter((item) => right.practices.some((other) => other.id === item.id)).length;
          const shared =
            (mode === 'auto' || filters.sharedSources ? sharedSources : 0) +
            (mode === 'auto' || filters.sharedPositions ? sharedPositions : 0) +
            (mode === 'auto' || filters.sharedInquiries ? sharedInquiries : 0) +
            (mode === 'auto' || filters.sharedWorks ? sharedWorks : 0) +
            (mode === 'auto' || filters.sharedPractices ? sharedPractices : 0);
          if (shared) result.push({ from: nodes[i].name, to: nodes[j].name, type: 'shared', label: `${shared} shared` });
        }
      }
    }
    return result;
  }, [activeMap, concepts, drafts, insights, media, mode, nodes, practices, questions, timeline, vault]);

  const uniqueFamilies = useMemo(() => {
    const families = new Set();
    edges.forEach(edge => {
      const pair = [conceptKey(edge.from), conceptKey(edge.to)].sort().join('::');
      families.add(pair);
    });
    return families.size;
  }, [edges]);

  const availableNodeTerms = useMemo(() => {
    const existingNames = new Set(nodes.map(n => conceptKey(n.name)));
    return terms.filter(t => !existingNames.has(conceptKey(t)));
  }, [nodes, terms]);

  const selectedMapLinks = useMemo(() => {
    if (!selectedName || mode !== 'custom' || !activeMap) return [];
    const key = conceptKey(selectedName);
    return (activeMap.manualLinks || []).filter(l => conceptKey(l.from) === key || conceptKey(l.to) === key);
  }, [selectedName, mode, activeMap]);

  const linkTargets = useMemo(() => {
    if (!selectedName) return [];
    const key = conceptKey(selectedName);
    return visibleTerms.filter(t => conceptKey(t) !== key);
  }, [selectedName, visibleTerms]);

  const addConcept = () => {
    if (!newConcept.name?.trim()) return;
    onAddConcept({ ...newConcept, name: conceptKey(newConcept.name), createdFrom: 'manual' });
    setNewConcept({ name: '', description: '', sourceIds: [] });
    setIsAddOpen(false);
  };

  const toggleNewConceptSource = (id: string) => {
    setNewConcept((prev) => {
      const current = prev.sourceIds || [];
      const next = current.includes(id) ? current.filter((sourceId) => sourceId !== id) : [...current, id];
      return { ...prev, sourceIds: next };
    });
  };

  const createCustomMap = () => {
    if (!newMap.title.trim()) return;
    onAddAtlasMap({
      title: newMap.title.trim(),
      description: newMap.description.trim(),
      nodeNames: selectedName ? [conceptKey(selectedName)] : [],
      nodePositions: selectedName ? { [conceptKey(selectedName)]: { x: 50, y: 50 } } : {},
      manualLinks: [],
      autoLinkFilters: defaultAutoLinkFilters,
    });
    setNewMap({ title: '', description: '' });
    setMode('custom');
    setIsMapOpen(false);
  };

  const updateActiveMap = (patch: Partial<AtlasMap>) => {
    if (!activeMap) return;
    onUpdateAtlasMap({ ...activeMap, ...patch, dateUpdated: today() });
  };

  const addNodeToMap = (name: string) => {
    if (!activeMap) return;
    const key = conceptKey(name);
    const nodeNames = Array.from(new Set([...(activeMap.nodeNames || []).map(conceptKey), key]));
    const angle = -Math.PI / 2 + (Math.PI * 2 * nodeNames.length) / Math.max(1, nodeNames.length + 1);
    updateActiveMap({
      nodeNames,
      nodePositions: {
        ...(activeMap.nodePositions || {}),
        [key]: activeMap.nodePositions?.[key] || { x: 50 + Math.cos(angle) * 28, y: 50 + Math.sin(angle) * 28 },
      },
    });
    setSelectedName(key);
    setIsNodeOpen(false);
  };

  const removeNodeFromMap = (name: string) => {
    if (!activeMap) return;
    const key = conceptKey(name);
    const nextPositions = { ...(activeMap.nodePositions || {}) };
    delete nextPositions[key];
    updateActiveMap({
      nodeNames: (activeMap.nodeNames || []).filter((nodeName) => conceptKey(nodeName) !== key),
      nodePositions: nextPositions,
      manualLinks: (activeMap.manualLinks || []).filter((link) => conceptKey(link.from) !== key && conceptKey(link.to) !== key),
    });
    setSelectedName(null);
  };

  const createLink = () => {
    if (!selectedName || !linkDraft.to.trim()) return;

    if (mode === 'custom' && activeMap) {
      const link: AtlasMapLink = {
        id: makeId(),
        from: conceptKey(selectedName),
        to: conceptKey(linkDraft.to),
        type: linkDraft.type,
        label: linkDraft.label.trim() || linkDraft.type,
        note: linkDraft.note.trim(),
        dateCreated: today(),
      };
      updateActiveMap({ manualLinks: [...(activeMap.manualLinks || []), link] });
    } else if (selectedConcept) {
      const links = Array.from(new Set([...(selectedConcept.links || []), conceptKey(linkDraft.to)]));
      onUpdateConcept({ ...selectedConcept, links, dateUpdated: today() });
    }

    setLinkDraft({ to: '', type: 'relates', label: '', note: '' });
    setLinkSearch('');
    setIsLinkOpen(false);
  };

  const removeUserLink = (id: string) => {
    if (!activeMap) return;
    updateActiveMap({ manualLinks: (activeMap.manualLinks || []).filter((link) => link.id !== id) });
  };

  const removeConceptLink = (targetName: string) => {
    if (!selectedConcept) return;
    const links = (selectedConcept.links || []).filter((link) => conceptKey(link) !== conceptKey(targetName));
    onUpdateConcept({ ...selectedConcept, links, dateUpdated: today() });
  };

  const startPanning = (event: React.MouseEvent | React.PointerEvent) => {
    if (draggingName) return;
    setIsPanning(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
    setSelectedName(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = event.clientX - lastMousePos.x;
    const dy = event.clientY - lastMousePos.y;
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const moveNode = (name: string, clientX: number, clientY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(94, Math.max(6, ((clientX - rect.left - pan.x) / (rect.width * zoom)) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top - pan.y) / (rect.height * zoom)) * 100));
    setDraftPositions((prev) => ({ ...prev, [conceptKey(name)]: { x, y } }));
  };

  const persistNode = (name: string) => {
    const position = draftPositions[conceptKey(name)];
    const concept = concepts.find((item) => conceptKey(item.name) === conceptKey(name));
    if (position && mode === 'custom' && activeMap) {
      updateActiveMap({
        nodePositions: {
          ...(activeMap.nodePositions || {}),
          [conceptKey(name)]: position,
        },
      });
    } else if (concept && position) {
      onUpdateConcept({ ...concept, ...position, dateUpdated: today() });
    }
    setDraggingName(null);
  };

  const edgePoints = (from: MapNode, to: MapNode) => {
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

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="z-20 mb-6 flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-headline text-[28px] font-semibold italic">Atlas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Map the relationships between concepts, sources, inquiries, positions, works, and practices.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search map..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-64 pl-9 rounded-full" />
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-accent hover:bg-accent/90 rounded-full">
            <Plus className="mr-1.5 size-4" /> New Concept
          </Button>
        </div>
      </header>

      <div className="z-10 space-y-3 px-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-white p-1 shadow-sm">
            <Button variant={mode === 'auto' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('auto')} className="h-8 rounded-full">Auto Map</Button>
            <Button variant={mode === 'custom' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('custom')} className="h-8 rounded-full">Custom Maps</Button>
          </div>

          {mode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeMap?.id || ''}
                onChange={(event) => setActiveMapId(event.target.value)}
                className="h-9 rounded-full border border-input bg-background px-4 font-code text-[11px] uppercase tracking-wider shadow-sm appearance-none cursor-pointer"
              >
                {!atlasMaps.length && <option value="">No custom maps</option>}
                {atlasMaps.map((map) => <option key={map.id} value={map.id}>{map.title}</option>)}
              </select>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setIsMapOpen(true)}><Plus className="mr-1.5 size-4" /> Custom Map</Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setIsNodeOpen(true)} disabled={!activeMap}><Plus className="mr-1.5 size-4" /> Add Node</Button>
              {activeMap && (
                <Button variant="ghost" size="sm" onClick={() => onDeleteAtlasMap(activeMap.id)} className="text-destructive hover:text-destructive rounded-full">Delete Map</Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <Stat value={nodes.length} label="Nodes" />
          <Stat value={edges.length} label="Connections" />
          <Stat value={uniqueFamilies} label="Link Families" />
          <Stat value={selectedName || 'None'} label="Active" />
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden px-8 pb-8">
        <div
          ref={mapRef}
          className="relative flex-1 cursor-grab overflow-hidden rounded-xl border border-border bg-muted/5 active:cursor-grabbing shadow-inner"
          onMouseDown={startPanning}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          <div className="absolute right-4 top-4 z-30 flex h-9 rounded-full border border-border/50 bg-white/90 p-1 shadow-md backdrop-blur">
            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.1)); }} className="h-7 w-7 rounded-full font-bold">-</Button>
            <div className="flex w-10 items-center justify-center font-code text-[10px] font-bold text-primary/60">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setZoom((z) => Math.min(2, z + 0.1)); }} className="h-7 w-7 rounded-full font-bold">+</Button>
            <div className="mx-1 my-1 w-px bg-border" />
            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setIsFullScreen(!isFullScreen); }} className="h-7 w-7 rounded-full">
              {isFullScreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
            </Button>
          </div>

          {mode === 'custom' && !activeMap && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
              <Card className="max-w-sm rounded-2xl p-8 text-center shadow-2xl border-none">
                <h3 className="font-headline text-2xl font-semibold italic">Create Your First Custom Map</h3>
                <p className="mt-2 text-sm text-muted-foreground font-body">Custom maps let you choose the nodes, draw your own links, then layer auto-connections with filters.</p>
                <Button onClick={() => setIsMapOpen(true)} className="mt-6 rounded-full px-8"><Plus className="mr-1.5 size-4" /> Custom Map</Button>
              </Card>
            </div>
          )}

          <div
            className="absolute inset-0 h-full w-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundImage: 'radial-gradient(circle at 20% 10%, hsl(var(--accent) / .08), transparent 25%), radial-gradient(circle at 82% 18%, hsl(160 87% 20% / .08), transparent 24%), radial-gradient(hsl(var(--muted-foreground) / 0.12) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {edges.map((edge, index) => {
                const from = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.from));
                const to = nodes.find((node) => conceptKey(node.name) === conceptKey(edge.to));
                if (!from || !to) return null;
                const points = edgePoints(from, to);
                const user = edge.type === 'user';
                const concept = edge.type === 'concept';
                return (
                  <line
                    key={`${edge.from}-${edge.to}-${edge.id || index}`}
                    x1={`${points.x1}%`}
                    y1={`${points.y1}%`}
                    x2={`${points.x2}%`}
                    y2={`${points.y2}%`}
                    stroke={user ? 'hsl(var(--accent))' : concept ? 'hsl(var(--primary) / .55)' : 'hsl(var(--muted-foreground) / .35)'}
                    strokeWidth={user ? 4 : concept ? 2.5 : 2}
                    strokeDasharray={user || concept ? '0' : '6 6'}
                    strokeLinecap="round"
                    className="transition-all"
                  />
                );
              })}
            </svg>

            {nodes.map((node) => (
              <button
                key={node.name}
                className="absolute min-w-[140px] -translate-x-1/2 -translate-y-1/2 cursor-grab text-center transition-none active:cursor-grabbing"
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
                <Card className={cn('rounded-xl border-accent/20 bg-white/95 p-3 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl', selectedName === node.name && 'border-accent shadow-2xl ring-2 ring-accent')}>
                  <h3 className="font-headline font-semibold text-primary">{node.name}</h3>
                  <div className="font-code text-[9px] uppercase text-muted-foreground">{node.count} linked</div>
                </Card>
              </button>
            ))}
          </div>
        </div>

        {!isFullScreen && (
          <aside className="z-20 flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {selectedName ? (
              <>
                <div className="flex items-start justify-between border-b border-border/50 p-5">
                  <div>
                    <Badge variant="outline" className="mb-2 font-code text-[9px] uppercase tracking-widest text-accent rounded-full">Map Node</Badge>
                    <h2 className="font-headline text-2xl font-bold italic">{selectedName}</h2>
                    {selectedConcept?.description && <p className="mt-2 text-sm text-muted-foreground font-body">{selectedConcept.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedName(null)}><X className="size-4" /></Button>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">Links</h4>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setIsLinkOpen(true)}>
                        <Link2 className="mr-1 size-3.5" /> Link This Idea
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedMapLinks.map((link) => (
                        <Badge key={link.id} variant="secondary" className="flex items-center gap-1 border-accent/20 bg-accent/10 pr-1 font-code text-[9px] uppercase tracking-widest text-accent rounded-full">
                          {conceptKey(link.from) === conceptKey(selectedName) ? link.to : link.from} · {link.label || link.type}
                          <button onClick={() => removeUserLink(link.id)} className="ml-1 transition-colors hover:text-destructive">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}

                      {(selectedConcept?.links || []).map((link) => (
                        <Badge key={link} variant="outline" className="flex items-center gap-1 pr-1 font-code text-[9px] uppercase tracking-widest rounded-full">
                          {link}
                          <button onClick={() => removeConceptLink(link)} className="ml-1 transition-colors hover:text-destructive">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}

                      {!selectedMapLinks.length && !(selectedConcept?.links?.length) && <p className="text-[10px] italic text-muted-foreground font-body">No links yet.</p>}
                    </div>
                  </section>

                  {mode === 'custom' && activeMap && (
                    <section>
                      <Button variant="ghost" size="sm" onClick={() => removeNodeFromMap(selectedName)} className="h-8 px-0 text-destructive hover:text-destructive rounded-none">
                        Remove from this map
                      </Button>
                    </section>
                  )}

                  <section>
                    <h4 className="mb-3 font-code text-[10px] uppercase tracking-widest text-muted-foreground">Evidence And Outputs</h4>
                    {related ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-muted/30 rounded-full">{related.sources.length} sources</Badge>
                        <Badge variant="outline" className="bg-muted/30 rounded-full">{related.beliefs.length} positions</Badge>
                        <Badge variant="outline" className="bg-muted/30 rounded-full">{related.drafts.length} works</Badge>
                        <Badge variant="outline" className="bg-muted/30 rounded-full">{related.practices.length} practices</Badge>
                        <Badge variant="outline" className="bg-muted/30 rounded-full">{related.questions.length} inquiries</Badge>
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground font-body">Gathering links...</p>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MapIcon className="mb-4 size-12 opacity-10" />
                <h3 className="mb-2 font-headline text-lg italic">Mental Atlas</h3>
                <p className="text-sm font-body">Select a concept node to inspect its links, evidence, and outputs.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Plot New Concept</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="readex-kicker">Concept Name</Label>
              <Input value={newConcept.name} onChange={(event) => setNewConcept((prev) => ({ ...prev, name: event.target.value }))} className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Description</Label>
              <Textarea value={newConcept.description} onChange={(event) => setNewConcept((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[100px]" />
            </div>
            <SourceLinker media={media} selectedIds={newConcept.sourceIds || []} onToggle={toggleNewConceptSource} label="Root Evidence (Sources)" />
          </div>
          <DialogFooter className="pt-4"><Button onClick={addConcept} className="rounded-full px-8">Anchor Node</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">New Custom Map</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="readex-kicker">Map Name</Label>
              <Input value={newMap.title} onChange={(event) => setNewMap((prev) => ({ ...prev, title: event.target.value }))} placeholder="Discipline and Avoidance" className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Purpose</Label>
              <Textarea value={newMap.description} onChange={(event) => setNewMap((prev) => ({ ...prev, description: event.target.value }))} placeholder="What this map is trying to understand..." />
            </div>
          </div>
          <DialogFooter className="pt-4"><Button onClick={createCustomMap} className="rounded-full px-8">Create Map</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNodeOpen} onOpenChange={setIsNodeOpen}>
        <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Add Node To Map</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} placeholder="Search concepts..." className="rounded-full" />
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {availableNodeTerms
                .filter((name) => !linkSearch || name.toLowerCase().includes(linkSearch.toLowerCase()))
                .map((name) => (
                  <button key={name} onClick={() => addNodeToMap(name)} className="w-full rounded-lg p-3 text-left font-code text-[10px] uppercase tracking-wider hover:bg-muted transition-colors">
                    {name}
                  </button>
                ))}
              {!availableNodeTerms.length && <p className="p-4 text-sm text-muted-foreground italic font-body">Every concept is already on this custom map.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Link This Idea</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="readex-kicker">From</Label>
              <Input value={selectedName || ''} disabled className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">To</Label>
              <select
                value={linkDraft.to}
                onChange={(event) => setLinkDraft((prev) => ({ ...prev, to: event.target.value }))}
                className="h-10 w-full rounded-full border border-border/60 bg-white px-4 text-sm font-body shadow-sm appearance-none"
              >
                <option value="">Choose a concept...</option>
                {linkTargets.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="readex-kicker">Link Type</Label>
                <select
                  value={linkDraft.type}
                  onChange={(event) => setLinkDraft((prev) => ({ ...prev, type: event.target.value as AtlasMapLinkType }))}
                  className="h-10 w-full rounded-full border border-border/60 bg-white px-4 text-sm font-body shadow-sm appearance-none"
                >
                  {linkTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="readex-kicker">Label</Label>
                <Input value={linkDraft.label} onChange={(event) => setLinkDraft((prev) => ({ ...prev, label: event.target.value }))} placeholder="tests, explains, challenges..." className="rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="readex-kicker">Note</Label>
              <Textarea value={linkDraft.note} onChange={(event) => setLinkDraft((prev) => ({ ...prev, note: event.target.value }))} placeholder="Why do these belong together?" />
            </div>
          </div>
          <DialogFooter className="pt-4"><Button onClick={createLink} disabled={!linkDraft.to} className="rounded-full px-8">Save Link</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-border bg-white px-5 py-2 shadow-sm">
      <div className="font-code text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">{label}</div>
      <div className="max-w-[120px] truncate font-headline text-lg font-bold italic text-primary">{value}</div>
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
