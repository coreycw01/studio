"use client";

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const [newTag, setNewTag] = useState('');
  const selected = normalizeConceptTags(value);
  const conceptNames = useMemo(() => {
    const names = [UNSORTED_CONCEPT, ...concepts.map((concept) => concept.name)].map(conceptKey).filter(Boolean);
    return Array.from(new Set(names));
  }, [concepts]);

  const toggle = (name: string) => {
    const key = conceptKey(name);
    const has = selected.includes(key);
    let next = has ? selected.filter((tag) => tag !== key) : [...selected, key];
    if (key === UNSORTED_CONCEPT && !has) next = [UNSORTED_CONCEPT];
    if (key !== UNSORTED_CONCEPT && next.some((tag) => tag !== UNSORTED_CONCEPT)) {
      next = next.filter((tag) => tag !== UNSORTED_CONCEPT);
    }
    onChange(normalizeConceptTags(next));
  };

  const add = () => {
    const name = conceptKey(newTag);
    if (!name) return;
    onCreateConcept?.(name);
    onChange(normalizeConceptTags([...selected, name]));
    setNewTag('');
  };

  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      <div className="flex flex-wrap gap-2">
        {conceptNames.map((name) => (
          <Badge
            key={name}
            role="button"
            variant={selected.includes(name) ? 'default' : 'outline'}
            className="cursor-pointer font-code text-[10px] uppercase tracking-wider"
            onClick={() => toggle(name)}
          >
            {name}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder="New concept tag..."
          className="h-8 font-code text-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
