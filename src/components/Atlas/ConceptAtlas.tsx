
"use client";

import React, { useState } from 'react';
import { Plus, Maximize2, Minimize2, Search, Filter, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Concept } from '@/lib/types';

interface ConceptAtlasProps {
  concepts: Concept[];
  onAddConcept: () => void;
}

export function ConceptAtlas({ concepts, onAddConcept }: ConceptAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");

  const filteredConcepts = concepts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full h-full bg-[#F0EFED] flex flex-col">
      {/* Toolbars */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
        <div className="flex gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Query concept nodes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9 bg-white/80 backdrop-blur border-border/50 font-body italic"
            />
          </div>
          <Button variant="outline" className="bg-white/80 backdrop-blur border-border/50">
            <Filter className="size-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="flex bg-white/80 backdrop-blur rounded-md border border-border/50 p-1">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}><Minimize2 className="size-4" /></Button>
            <div className="w-12 flex items-center justify-center font-code text-[11px] font-bold text-primary/60">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><Maximize2 className="size-4" /></Button>
          </div>
          <Button onClick={onAddConcept} className="shadow-lg">
            <Plus className="size-4 mr-2" />
            Plot Concept
          </Button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing">
        <div 
          className="w-full h-full relative transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom})`,
            backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.1) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        >
          {filteredConcepts.map((concept, idx) => (
            <div
              key={concept.id}
              className="absolute p-4 min-w-[120px] text-center"
              style={{
                left: `${(concept.x || 20 + (idx * 15))}%`,
                top: `${(concept.y || 20 + (idx * 10))}%`,
              }}
            >
              <Card className="p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border-accent/20 cursor-pointer group">
                <h3 className="font-headline font-semibold text-primary group-hover:text-accent transition-colors">{concept.name}</h3>
                <div className="mt-2 flex justify-center gap-1">
                  <div className="size-1 rounded-full bg-accent" />
                  <div className="size-1 rounded-full bg-accent opacity-50" />
                </div>
              </Card>
              <div className="mt-2 font-code text-[10px] text-muted-foreground uppercase tracking-widest">
                {concept.links.length} Links
              </div>
            </div>
          ))}

          {filteredConcepts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="size-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <MapIcon className="size-8 text-muted-foreground/40" />
                </div>
                <h2 className="text-xl font-headline italic mb-2">Uncharted Mental Territory</h2>
                <p className="text-muted-foreground text-sm">Plot your first philosophical concept to begin mapping your internal landscape.</p>
                <Button variant="outline" className="mt-4" onClick={onAddConcept}>Create Concept</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white/50 backdrop-blur border-t border-border/50 flex justify-between items-center text-[11px] font-code text-muted-foreground uppercase tracking-widest">
        <div>Cartographic Layer: Scholastic Core v1</div>
        <div className="flex gap-4">
          <span>Active Nodes: {filteredConcepts.length}</span>
          <span>Explicit Branches: {concepts.reduce((acc, c) => acc + c.links.length, 0)}</span>
        </div>
      </div>
    </div>
  );
}
