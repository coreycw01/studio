
export type MediaStatus = 'Want to Read' | 'Consuming' | 'Finished' | 'Paused' | 'Abandoned';
export type MediaType = 'book' | 'video' | 'podcast' | 'article' | 'course' | 'paper' | 'other';
export type AnnotationType = 'highlight' | 'thought' | 'question' | 'connection';
export type VaultType = 'belief' | 'principle' | 'mental_model' | 'life_rule' | 'worldview';
export type EventType = 'created' | 'refined' | 'challenged' | 'revised' | 'expanded' | 'abandoned';
export type QuestionStatus = 'open' | 'investigating' | 'answered' | 'archived';

export interface Annotation {
  id: string;
  text: string;
  type: AnnotationType;
  context?: string;
  date: string;
}

export interface SessionLog {
  id: string;
  date: string;
  notes: string;
}

export interface Media {
  id: string;
  title: string;
  creator: string;
  type: MediaType;
  status: MediaStatus;
  year?: string;
  thumbnailUrl?: string;
  tags: string[];
  annotations: Annotation[];
  capture: {
    before?: {
      priorBeliefs?: string;
      expectation?: string;
      openQuestion?: string;
    };
    after?: {
      coreArgument?: string;
      heldUp?: string;
      didntHold?: string;
      lasting?: string;
      beliefChange?: string;
      crossRefs?: string;
    };
    sessions: SessionLog[];
  };
  dateAdded: string;
}

export interface VaultEntry {
  id: string;
  title: string;
  type: VaultType;
  statement: string;
  description: string;
  confidence: number;
  status: 'active' | 'questioning' | 'revised' | 'abandoned';
  tags: string[];
  sourceIds: string[];
  dateCreated: string;
  dateUpdated: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  links: string[];
  dateCreated: string;
  x: number;
  y: number;
}

export interface Question {
  id: string;
  text: string;
  status: QuestionStatus;
  answer?: string;
  evidenceIds: string[];
  conceptIds: string[];
  dateCreated: string;
}

export interface TimelineEvent {
  id: string;
  entityId: string;
  entityType: string;
  entityTitle: string;
  eventType: EventType;
  reason: string;
  date: string;
}

export interface Draft {
  id: string;
  title: string;
  body: string;
  type: 'essay' | 'script' | 'field_note';
  status: 'seed' | 'drafting' | 'revised' | 'final';
  conceptTags: string[];
  sourceIds: string[];
  dateCreated: string;
  dateUpdated: string;
}
