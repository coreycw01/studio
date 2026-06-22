
"use client";

import React, { useState } from 'react';
import { PenTool, Library, HelpCircle, ShieldCheck, ChevronRight, Save, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Draft, Media, VaultEntry, Annotation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AtelierProps {
  drafts: Draft[];
  media: Media[];
  vault: VaultEntry[];
  onAddDraft: (data: Partial<Draft>) => void;
}

export function Atelier({ drafts, media, vault, onAddDraft }: AtelierProps) {
  const { db } = useFirebase();
  const [activeDraft, setActiveDraft] = useState<Draft | null>(drafts[0] || null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: '', type: 'essay' as Draft['type'] });

  const handleSave = async () => {
    if (!activeDraft || !db) return;
    const draftRef = doc(db, 'users', 'anonymous-scholar', 'drafts', activeDraft.id);
    await updateDoc(draftRef, {
      body: activeDraft.body,
      title: activeDraft.title,
      dateUpdated: new Date().toISOString()
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraft.title) return;
    onAddDraft(newDraft);
    setIsAddOpen(false);
    setNewDraft({ title: '', type: 'essay' });
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Draft List (Left) */}
      <div className="w-72 border-r border-border/50 flex flex-col bg-white/30 backdrop-blur-sm">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h2 className="font-headline font-bold text-xl italic">Manuscripts</h2>
          <Button size="icon" variant="ghost" onClick={() => setIsAddOpen(true)}><Plus className="size-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {drafts.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveDraft(d)}
                className={cn(
                  "w-full text-left p-4 rounded-md transition-all group",
                  activeDraft?.id === d.id ? "bg-white shadow-sm ring-1 ring-border" : "hover:bg-white/50"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                   <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">{d.type}</span>
                   <span className={cn(
                     "font-code text-[8px] uppercase px-1.5 py-0.5 rounded",
                     d.status === 'final' ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                   )}>{d.status}</span>
                </div>
                <h3 className="font-headline font-semibold text-sm group-hover:text-accent transition-colors line-clamp-1">{d.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1 font-body mt-1">Updated {new Date(d.dateUpdated).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor (Center) */}
      <div className="flex-1 flex flex-col bg-white">
        {activeDraft ? (
          <>
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-[#FAFAF9]">
              <div className="flex-1">
                <input 
                  className="w-full bg-transparent border-none text-3xl font-headline font-bold focus:outline-none placeholder:text-muted-foreground/30 italic"
                  value={activeDraft.title}
                  onChange={e => setActiveDraft(p => p ? { ...p, title: e.target.value } : null)}
                  placeholder="Untitled Manuscript..."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSave} className="font-code text-[10px] uppercase tracking-wider"><Save className="size-3 mr-2" /> Commit</Button>
                <Button size="sm" className="font-code text-[10px] uppercase tracking-wider"><Send className="size-3 mr-2" /> Publish</Button>
              </div>
            </div>
            <div className="flex-1 p-12 max-w-4xl mx-auto w-full overflow-y-auto font-body">
              <Textarea 
                className="w-full h-full min-h-[70vh] border-none shadow-none text-xl leading-relaxed font-body focus-visible:ring-0 placeholder:text-muted-foreground/20 italic resize-none"
                placeholder="Begin your inquiry..."
                value={activeDraft.body}
                onChange={e => setActiveDraft(p => p ? { ...p, body: e.target.value } : null)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-12">
            <div className="max-w-sm">
              <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <PenTool className="size-8 text-muted-foreground/40" />
              </div>
              <h2 className="text-2xl font-headline italic mb-2">No Active Inquiry</h2>
              <p className="text-muted-foreground font-body">Select a manuscript or create a new draft to begin weaving your philosophy.</p>
              <Button variant="outline" className="mt-6" onClick={() => setIsAddOpen(true)}>New Draft</Button>
            </div>
          </div>
        )}
      </div>

      {/* Context Sidebar (Right) */}
      <div className="w-80 border-l border-border/50 bg-[#FAFAF9] flex flex-col">
        <div className="p-6 border-b border-border/50">
          <h2 className="font-headline font-bold text-lg italic flex items-center gap-2">
            <Library className="size-4 text-accent" /> Evidence
          </h2>
          <p className="text-[11px] font-code text-muted-foreground uppercase tracking-widest mt-1">Contextual References</p>
        </div>
        
        <Tabs defaultValue="vault" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b bg-transparent h-12">
            <TabsTrigger value="vault" className="flex-1 font-code text-[10px] uppercase tracking-widest">Vault</TabsTrigger>
            <TabsTrigger value="library" className="flex-1 font-code text-[10px] uppercase tracking-widest">Library</TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1 font-code text-[10px] uppercase tracking-widest">Quotes</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            <TabsContent value="vault" className="p-4 m-0">
               {vault.length > 0 ? (
                 <div className="space-y-4">
                   {vault.map(e => (
                     <Card key={e.id} className="p-4 text-left border-border/30 shadow-none hover:bg-white transition-colors cursor-pointer group">
                        <span className="font-code text-[9px] text-accent uppercase tracking-widest block mb-1">{e.type.replace('_', ' ')}</span>
                        <h4 className="font-headline text-sm font-semibold mb-2 group-hover:text-accent transition-colors">{e.title}</h4>
                        <p className="text-[11px] text-muted-foreground italic font-body">"{e.statement}"</p>
                     </Card>
                   ))}
                 </div>
               ) : (
                 <p className="text-center text-[11px] font-code text-muted-foreground uppercase py-10">No Vaulted Beliefs</p>
               )}
            </TabsContent>
            
            <TabsContent value="library" className="p-4 m-0">
              {media.length > 0 ? (
                <div className="space-y-3">
                  {media.map(m => (
                    <div key={m.id} className="flex gap-3 items-center p-3 hover:bg-white rounded transition-colors group cursor-pointer border-b border-border/10">
                      <div className="size-8 bg-muted rounded flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
                        <ChevronRight className="size-3 text-muted-foreground group-hover:text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-[13px] font-headline font-semibold truncate group-hover:text-accent transition-colors">{m.title}</h5>
                        <p className="text-[10px] font-code text-muted-foreground truncate uppercase">{m.creator}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[11px] font-code text-muted-foreground uppercase py-10">Library is empty</p>
              )}
            </TabsContent>

            <TabsContent value="quotes" className="p-4 m-0">
               {media.flatMap(m => m.annotations?.filter(a => a.type === 'highlight') || []).length > 0 ? (
                 <div className="space-y-4">
                   {media.flatMap(m => (m.annotations?.filter(a => a.type === 'highlight') || []).map(a => ({ ...a, source: m.title }))).map((q, i) => (
                     <div key={i} className="p-4 bg-white border border-border/20 rounded shadow-sm italic text-sm font-body text-primary/80">
                        "{q.text}"
                        <div className="mt-2 flex items-center justify-between opacity-50">
                          <span className="font-code text-[9px] uppercase tracking-tighter">Source: {q.source}</span>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-center text-[11px] font-code text-muted-foreground uppercase py-10">No Highlights found</p>
               )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] font-body">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Seed Manuscript</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-code text-[10px] uppercase tracking-widest">Draft Title</Label>
              <Input id="title" placeholder="Working Title..." value={newDraft.title} onChange={e => setNewDraft(p => ({ ...p, title: e.target.value }))} className="font-body italic" />
            </div>
            <div className="space-y-2">
              <Label className="font-code text-[10px] uppercase tracking-widest">Draft Type</Label>
              <Select value={newDraft.type} onValueChange={v => setNewDraft(p => ({ ...p, type: v as Draft['type'] }))}>
                <SelectTrigger className="font-body italic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="script">Script</SelectItem>
                  <SelectItem value="field_note">Field Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-code uppercase tracking-widest text-xs">Initialize Draft</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
