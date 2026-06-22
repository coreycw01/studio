
"use client";

import React, { useState, useMemo } from 'react';
import { Plus, Maximize2, Minimize2, Search, Filter, Map as MapIcon, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Concept } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConceptAtlasProps {
  concepts: Concept[];
  onAddConcept: (data: Partial<Concept>) => void;
  onSelectConcept?: (c: Concept) => void;
}

export function ConceptAtlas({ concepts, onAddConcept, onSelectConcept }: ConceptAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newConcept, setNewConcept] = useState({ name: '', description: '' });

  const filteredConcepts = concepts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConcept = useMemo(() => 
    concepts.find(c => c.id === selectedId),
    [concepts, selectedId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.name) return;
    onAddConcept(newConcept);
    setIsAddOpen(false);
    setNewConcept({ name: '', description: '' });
  };

  return (
    <div className="relative w-full h-full bg-[#F0EFED] flex overflow-hidden">
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
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="flex bg-white/80 backdrop-blur rounded-md border border-border/50 p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}><Minimize2 className="size-4" /></Button>
            <div className="w-12 flex items-center justify-center font-code text-[11px] font-bold text-primary/60">{Math.round(zoom * 100)}%</div>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><Maximize2 className="size-4" /></Button>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="shadow-lg">
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
          {filteredConcepts.map((concept) => (
            <div
              key={concept.id}
              className="absolute p-4 min-w-[140px] text-center"
              style={{
                left: `${concept.x}%`,
                top: `${concept.y}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(concept.id);
              }}
            >
              <Card className={cn(
                "p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border-accent/20 cursor-pointer group relative overflow-hidden",
                selectedId === concept.id ? "ring-2 ring-accent border-accent" : ""
              )}>
                <h3 className="font-headline font-semibold text-primary group-hover:text-accent transition-colors">{concept.name}</h3>
                <div className="mt-2 flex justify-center gap-1">
                   {concept.links?.length > 0 && <div className="size-1 rounded-full bg-accent" />}
                   {concept.links?.length > 3 && <div className="size-1 rounded-full bg-accent opacity-50" />}
                </div>
              </Card>
              <div className="mt-2 font-code text-[10px] text-muted-foreground uppercase tracking-widest">
                {concept.links?.length || 0} Explicit Links
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
                <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>Create Concept</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Node Panel */}
      {selectedConcept && (
        <div className="w-80 bg-white border-l border-border/50 shadow-2xl z-20 animate-in slide-in-from-right duration-300">
           <div className="p-6 border-b border-border/50 flex justify-between items-start">
             <div>
                <Badge variant="outline" className="mb-2 font-code text-[9px] uppercase tracking-widest">Concept Node</Badge>
                <h2 className="text-2xl font-headline font-bold italic">{selectedConcept.name}</h2>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}><X className="size-4" /></Button>
           </div>
           
           <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
             <section>
                <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Philosophical Scope</h4>
                <p className="font-body text-sm leading-relaxed italic text-primary/80">
                  {selectedConcept.description || "Description pending cognitive refinement."}
                </p>
             </section>

             <section>
                <h4 className="font-code text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Branches ({selectedConcept.links?.length || 0})</h4>
                <div className="space-y-2">
                   {selectedConcept.links?.map(link => (
                     <div key={link} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border/20 text-xs font-body group cursor-pointer hover:bg-accent/5 transition-colors">
                        <span>{link}</span>
                        <ChevronRight className="size-3 text-muted-foreground group-hover:text-accent transition-colors" />
                     </div>
                   ))}
                   <Button variant="outline" size="sm" className="w-full text-[10px] font-code uppercase tracking-tighter mt-2">
                     <Plus className="size-3 mr-2" /> Branch Concept
                   </Button>
                </div>
             </section>
           </div>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] font-body">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Plot New Concept</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-code text-[10px] uppercase tracking-widest">Concept Name</Label>
              <Input id="name" placeholder="e.g. Stoicism" value={newConcept.name} onChange={e => setNewConcept(p => ({ ...p, name: e.target.value }))} className="font-body italic" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="font-code text-[10px] uppercase tracking-widest">Brief Description</Label>
              <Textarea id="desc" placeholder="Initial cognitive framing..." value={newConcept.description} onChange={e => setNewConcept(p => ({ ...p, description: e.target.value }))} className="font-body italic" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-code uppercase tracking-widest text-xs">Anchor Node</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
