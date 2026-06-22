
"use client";

import React, { useState } from 'react';
import { Plus, Search, Book, Video, Mic, FileText, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Media, MediaType } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MediaLibraryProps {
  media: Media[];
  onAddMedia: (data: Partial<Media>) => void;
  onSelectMedia: (m: Media) => void;
}

const mediaIcons: Record<MediaType, any> = {
  book: Book,
  video: Video,
  podcast: Mic,
  article: FileText,
  course: Book,
  paper: FileText,
  other: MoreHorizontal,
};

export function MediaLibrary({ media, onAddMedia, onSelectMedia }: MediaLibraryProps) {
  const [filter, setFilter] = useState<MediaType | 'all'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMedia, setNewMedia] = useState({ title: '', creator: '', type: 'book' as MediaType });

  const filtered = filter === 'all' ? media : media.filter(m => m.type === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedia.title) return;
    onAddMedia(newMedia);
    setIsAddOpen(false);
    setNewMedia({ title: '', creator: '', type: 'book' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2 italic">Scholastic Library</h1>
          <p className="text-muted-foreground font-body text-lg">A chronicle of intellectual consumption and captured annotations.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 shadow-xl">
          <Plus className="size-4 mr-2" /> Add Media
        </Button>
      </header>

      <div className="flex gap-6 mb-10 overflow-x-auto pb-2 scrollbar-hide border-b border-border/50">
        <button 
          onClick={() => setFilter('all')}
          className={cn(
            "pb-3 px-1 text-sm font-code uppercase tracking-widest transition-all relative whitespace-nowrap",
            filter === 'all' ? "text-primary font-bold" : "text-muted-foreground"
          )}
        >
          All Sources
          {filter === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        {(['book', 'video', 'podcast', 'article', 'paper'] as const).map(t => (
          <button 
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "pb-3 px-1 text-sm font-code uppercase tracking-widest transition-all relative whitespace-nowrap",
              filter === t ? "text-primary font-bold" : "text-muted-foreground"
            )}
          >
            {t}s
            {filter === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filtered.map((item) => {
          const Icon = mediaIcons[item.type];
          return (
            <Card 
              key={item.id} 
              className="group cursor-pointer border-none shadow-none bg-transparent hover:-translate-y-2 transition-transform duration-300"
              onClick={() => onSelectMedia(item)}
            >
              <div className="relative aspect-[2/3] w-full rounded-sm overflow-hidden shadow-lg mb-4 bg-muted">
                {item.thumbnailUrl ? (
                  <Image 
                    src={item.thumbnailUrl} 
                    alt={item.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <Icon className="size-12 text-muted-foreground/30 mb-4" />
                    <span className="font-headline text-lg text-muted-foreground/40 italic">{item.title}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Badge className="bg-white/90 text-primary font-code text-[9px] backdrop-blur border-none uppercase shadow-sm">{item.status}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-base leading-tight group-hover:text-accent transition-colors line-clamp-2">{item.title}</h3>
                <p className="font-code text-[10px] text-muted-foreground uppercase tracking-widest">{item.creator}</p>
              </div>
            </Card>
          );
        })}

        <div 
          onClick={() => setIsAddOpen(true)}
          className="aspect-[2/3] w-full rounded-sm border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all text-muted-foreground/40 hover:text-accent group"
        >
          <Plus className="size-10 mb-2 transition-transform group-hover:rotate-90" />
          <span className="font-code text-[10px] uppercase tracking-[0.2em]">New Source</span>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] font-body">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Catalog New Source</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-code text-[10px] uppercase tracking-widest">Media Title</Label>
              <Input id="title" value={newMedia.title} onChange={e => setNewMedia(p => ({ ...p, title: e.target.value }))} className="font-body italic" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator" className="font-code text-[10px] uppercase tracking-widest">Creator / Author</Label>
              <Input id="creator" value={newMedia.creator} onChange={e => setNewMedia(p => ({ ...p, creator: e.target.value }))} className="font-body italic" />
            </div>
            <div className="space-y-2">
              <Label className="font-code text-[10px] uppercase tracking-widest">Type</Label>
              <Select value={newMedia.type} onValueChange={v => setNewMedia(p => ({ ...p, type: v as MediaType }))}>
                <SelectTrigger className="font-body italic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="paper">Academic Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-code uppercase tracking-widest text-xs">Commit to Library</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
