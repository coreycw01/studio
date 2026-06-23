"use client";

import React, { useMemo, useState } from 'react';
import { Plus, Check, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Concept } from '@/lib/types';
import { conceptKey, normalizeConceptTags, UNSORTED_CONCEPT } from '@/lib/readex';
import { cn } from '@/lib/utils';

interface ConceptTagPickerProps {
  concepts: Concept[];
  value: string[];
  onChange: (tags: string[]) => void;
  onCreateConcept?: (name: string) => void;
  compact?: boolean;
}

export function ConceptTagPicker({ concepts, value, onChange, onCreateConcept, compact }: ConceptTagPickerProps) {
  const [search, setSearch] = useState('');
  const selected = normalizeConceptTags(value);
  
  const allConceptNames = useMemo(() => {
    const names = [UNSORTED_CONCEPT, ...concepts.map((concept) => concept.name)].map(conceptKey).filter(Boolean);
    return Array.from(new Set(names));
  }, [concepts]);

  const filtered = allConceptNames.filter(name => 
    !search || name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    const key = conceptKey(name);
    const has = selected.includes(key);
    let next = has ? selected.filter((tag) => tag !== key) : [...selected, key];
    
    // Logic for Unsorted Ideas exclusivity
    if (key === UNSORTED_CONCEPT && !has) {
      next = [UNSORTED_CONCEPT];
    } else if (key !== UNSORTED_CONCEPT && next.some((tag) => tag !== UNSORTED_CONCEPT)) {
      next = next.filter((tag) => tag !== UNSORTED_CONCEPT);
    }
    
    onChange(normalizeConceptTags(next));
  };

  const addNew = () => {
    const name = conceptKey(search);
    if (!name || allConceptNames.includes(name)) return;
    if (onCreateConcept) {
      onCreateConcept(name);
    }
    toggle(name);
    setSearch('');
  };

  return (
    <div className={cn('flex flex-wrap gap-2 items-center', compact && 'gap-1.5')}>
      {selected.map((tag) => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="flex items-center gap-1 font-code text-[10px] uppercase tracking-wider py-0.5"
        >
          {tag}
          <button onClick={(e) => { e.preventDefault(); toggle(tag); }} className="hover:text-destructive transition-colors">
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-7 px-2 font-code text-[9px] uppercase tracking-widest border-dashed",
              compact && "h-6 px-1.5"
            )}
          >
            <Plus className="size-3 mr-1" /> Concept
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Find or create concept..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (search && !allConceptNames.includes(conceptKey(search))) {
                      addNew();
                    }
                  }
                }}
                className="h-8 pl-7 text-[11px] font-body"
              />
            </div>
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {filtered.map((name) => {
                const isSelected = selected.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggle(name)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-sm text-left transition-colors hover:bg-muted",
                      isSelected && "text-accent"
                    )}
                  >
                    <span className="font-code text-[10px] uppercase tracking-wider">{name}</span>
                    {isSelected && <Check className="size-3" />}
                  </button>
                );
              })}
              {search && !allConceptNames.includes(conceptKey(search)) && (
                <button
                  onClick={addNew}
                  className="w-full flex items-center gap-2 p-2 rounded-sm text-left hover:bg-accent/10 text-accent transition-colors border-t border-border mt-1"
                >
                  <Plus className="size-3" />
                  <span className="font-code text-[10px] uppercase tracking-wider">Create "{search}"</span>
                </button>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}