import type { Concept, Draft, Insight, Media, MediaType, Question, QuestionStatus, TimelineEvent, VaultEntry } from './types';
import { Book, Headphones, Mic, Play, Film, FileText, GraduationCap, School, Clapperboard, MessageSquare, Users, File, Paperclip } from 'lucide-react';

export const UNSORTED_CONCEPT = 'Unsorted Ideas';

export const MEDIA_TYPES: MediaType[] = ['book','audiobook','podcast','video','movie','article','course','lecture','documentary','interview','conversation','paper','other'];

export const MEDIA_LABELS: Record<MediaType, string> = {
  book: 'Book',
  audiobook: 'Audiobook',
  podcast: 'Podcast',
  video: 'Video',
  movie: 'Movie',
  article: 'Article',
  course: 'Course',
  lecture: 'Lecture',
  documentary: 'Documentary',
  interview: 'Interview',
  conversation: 'Conversation',
  paper: 'Paper',
  other: 'Other',
};

export const MEDIA_ICONS_COMP: Record<MediaType, any> = {
  book: Book,
  audiobook: Headphones,
  podcast: Mic,
  video: Play,
  movie: Film,
  article: FileText,
  course: GraduationCap,
  lecture: School,
  documentary: Clapperboard,
  interview: MessageSquare,
  conversation: Users,
  paper: File,
  other: Paperclip,
};

export const DRAFT_LABELS = {
  essay: 'Essay',
  script: 'Script',
  field_note: 'Field Note',
};

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function today() {
  return new Date().toISOString();
}

export function titleCase(value?: string) {
  return (value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()).trim();
}

export function conceptKey(value?: string) {
  return titleCase(value);
}

export function normalizeConceptTags(tags?: string[]) {
  let cleaned = Array.from(new Set((tags || []).map(conceptKey).filter(Boolean)));
  if (cleaned.length > 1) cleaned = cleaned.filter((tag) => tag !== UNSORTED_CONCEPT);
  if (!cleaned.length) cleaned = [UNSORTED_CONCEPT];
  return cleaned;
}

export function ensureConceptTerms(concepts: Concept[], ...tagSets: (string[] | undefined)[]) {
  const seen = new Set(concepts.map((c) => conceptKey(c.name)));
  const inferred = tagSets.flat().map(conceptKey).filter(Boolean);
  return Array.from(new Set(inferred)).filter((tag) => !seen.has(tag));
}

export function allAnnotations(media: Media[]) {
  return media.flatMap((source) => (source.annotations || []).map((annotation) => ({ ...annotation, source })));
}

export function allQuestions(media: Media[], questions: Question[]) {
  const captureQuestions: Question[] = media
    .map((source) => ({
      id: `open:${source.id}`,
      text: source.capture?.before?.openQuestion || '',
      answer: source.capture?.before?.openAnswer || '',
      sourceIds: [source.id],
      evidenceIds: [source.id],
      conceptIds: source.tags || [],
      status: (source.capture?.before?.openAnswer ? 'answered' : 'open') as QuestionStatus,
      type: 'open' as const,
      dateCreated: source.dateAdded,
    }))
    .filter((q) => q.text);

  const annotationQuestions: Question[] = allAnnotations(media)
    .filter((annotation) => annotation.type === 'question')
    .map((annotation) => ({
      id: `annotation:${annotation.source.id}:${annotation.id}`,
      text: annotation.text,
      answer: annotation.answer || '',
      sourceIds: [annotation.source.id],
      evidenceIds: [annotation.source.id],
      conceptIds: annotation.conceptTags || annotation.source.tags || [],
      status: (annotation.answer ? 'answered' : 'open') as QuestionStatus,
      type: 'annotation' as const,
      dateCreated: annotation.date,
    }));

  return [...questions, ...captureQuestions, ...annotationQuestions];
}

export function conceptTerms(concepts: Concept[], media: Media[], insights: Insight[], vault: VaultEntry[], drafts: Draft[]) {
  const terms = [
    ...concepts.map((concept) => concept.name),
    ...media.flatMap((item) => item.tags || []),
    ...insights.flatMap((item) => item.tags || []),
    ...vault.flatMap((item) => item.tags || []),
    ...drafts.flatMap((item) => item.conceptTags || []),
  ].map(conceptKey).filter(Boolean);
  return Array.from(new Set(terms));
}

export function taggedItemsForConcept(name: string, media: Media[], insights: Insight[], vault: VaultEntry[], drafts: Draft[]) {
  const key = conceptKey(name);
  const hasTag = (tags?: string[]) => (tags || []).map(conceptKey).includes(key);
  return [
    ...media.filter((item) => hasTag(item.tags)).map((item) => ({ type: 'source', item })),
    ...insights.filter((item) => hasTag(item.tags)).map((item) => ({ type: 'idea', item })),
    ...vault.filter((item) => hasTag(item.tags)).map((item) => ({ type: 'belief', item })),
    ...drafts.filter((item) => hasTag(item.conceptTags)).map((item) => ({ type: 'draft', item })),
  ];
}

export function conceptRelated(name: string, data: {
  media: Media[];
  insights: Insight[];
  vault: VaultEntry[];
  drafts: Draft[];
  questions: Question[];
  timeline: TimelineEvent[];
}) {
  const key = conceptKey(name);
  const sourceIds = new Set<string>();
  const directSources = data.media.filter((item) => (item.tags || []).map(conceptKey).includes(key));
  directSources.forEach((item) => sourceIds.add(item.id));

  const ideas = data.insights.filter((item) => (item.tags || []).map(conceptKey).includes(key) || (item.sourceIds || []).some((id) => sourceIds.has(id)));
  ideas.flatMap((item) => item.sourceIds || []).forEach((id) => sourceIds.add(id));

  const beliefs = data.vault.filter((item) => (item.tags || []).map(conceptKey).includes(key) || (item.sourceIds || []).some((id) => sourceIds.has(id)));
  beliefs.flatMap((item) => item.sourceIds || []).forEach((id) => sourceIds.add(id));

  const drafts = data.drafts.filter((item) => (item.conceptTags || []).map(conceptKey).includes(key) || (item.sourceIds || []).some((id) => sourceIds.has(id)));
  drafts.flatMap((item) => item.sourceIds || []).forEach((id) => sourceIds.add(id));

  const sources = data.media.filter((item) => sourceIds.has(item.id) || (item.tags || []).map(conceptKey).includes(key));
  const annotations = allAnnotations(data.media).filter((annotation) => sourceIds.has(annotation.source.id) || (annotation.conceptTags || []).map(conceptKey).includes(key));
  const questions = allQuestions(data.media, data.questions).filter((question) => (question.conceptIds || []).map(conceptKey).includes(key) || (question.sourceIds || []).some((id) => sourceIds.has(id)));
  const relatedIds = new Set([...sources.map((x) => x.id), ...ideas.map((x) => x.id), ...beliefs.map((x) => x.id), ...drafts.map((x) => x.id)]);
  const events = data.timeline.filter((event) => relatedIds.has(event.entityId) || (event.influencedBy || []).some((id) => relatedIds.has(id)));

  return { sources, annotations, questions, ideas, beliefs, drafts, events };
}
