
export type MediaStatus = 'Want to Read' | 'Consuming' | 'Finished' | 'Paused' | 'Abandoned';
export type MediaType = 'book' | 'audiobook' | 'podcast' | 'video' | 'movie' | 'article' | 'course' | 'lecture' | 'documentary' | 'interview' | 'conversation' | 'paper' | 'other';
export type AnnotationType = 'highlight' | 'thought' | 'question' | 'connection';
export type VaultType = 'belief' | 'principle' | 'mental_model' | 'life_rule' | 'worldview';
export type EventType = 'created' | 'refined' | 'challenged' | 'revised' | 'expanded' | 'abandoned';
export type QuestionStatus = 'open' | 'investigating' | 'answered' | 'archived';
export type DraftType = 'essay' | 'script' | 'field_note';
export type DraftStatus = 'seed' | 'drafting' | 'revised' | 'final';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentTheme = 'violet' | 'sage' | 'blue' | 'amber' | 'rose' | 'mono';
export type WritingStyle = 'blank_paper' | 'ruled_notebook' | 'manuscript' | 'cornell_notes' | 'two_column_debate' | 'dialectic' | 'belief_audit' | 'source_analysis' | 'mind_map' | 'timeline';
export type ExternalDocProvider = 'google_docs' | 'notion' | 'dropbox_paper' | 'microsoft_word' | 'markdown' | 'other';
export type ExternalDocSyncStatus = 'connected' | 'syncing' | 'synced' | 'error';
export type PracticeType = 'habit' | 'experiment' | 'discipline' | 'reflection_prompt' | 'commitment' | 'observation' | 'rule' | 'challenge';
export type PracticeStatus = 'planned' | 'active' | 'completed' | 'paused' | 'abandoned';
export type AtlasMapLinkType = 'supports' | 'challenges' | 'examples' | 'causes' | 'questions' | 'practices' | 'relates' | 'custom';
export type SourceProvider = 'google_books' | 'open_library' | 'openalex' | 'tmdb' | 'url_metadata' | 'manual';

export interface SecurityRuleContext {
  operation: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
}

export interface Annotation {
  id: string;
  text: string;
  type: AnnotationType;
  context?: string;
  date: string;
  answer?: string;
  conceptTags?: string[];
}

export interface SessionLog {
  id: string;
  date: string;
  notes: string;
}

export interface MediaCapture {
  before?: {
    priorBeliefs?: string;
    expectation?: string;
    openQuestion?: string;
    openAnswer?: string;
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
}

export interface Media {
  id: string;
  title: string;
  creator: string;
  creators?: string[];
  type: MediaType;
  status: MediaStatus;
  year?: string;
  genre?: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  publisher?: string;
  isbn?: string;
  doi?: string;
  platform?: string;
  sourceProvider?: SourceProvider;
  externalIds?: {
    googleBooksId?: string;
    openLibraryId?: string;
    openAlexId?: string;
    tmdbId?: string;
    isbn?: string;
    doi?: string;
    url?: string;
  };
  tags: string[];
  annotations: Annotation[];
  capture: MediaCapture;
  dateAdded: string;
  dateUpdated?: string;
}

export interface VaultVersion {
  description: string;
  reason?: string;
  eventType?: EventType;
  date: string;
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
  insightIds?: string[];
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  versionHistory?: VaultVersion[];
  createdFrom?: 'manual' | 'idea';
  dateCreated: string;
  dateUpdated: string;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  sourceIds: string[];
  tags: string[];
  categories?: string[];
  connections?: string[];
  beliefId?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  links: string[];
  sourceIds: string[];
  dateCreated: string;
  dateUpdated?: string;
  x: number;
  y: number;
  createdFrom?: 'manual' | 'tag' | 'idea' | 'fallback';
}

export interface Question {
  id: string;
  text: string;
  status: QuestionStatus;
  answer?: string;
  evidenceIds: string[];
  conceptIds: string[];
  sourceIds?: string[];
  beliefIds?: string[];
  draftIds?: string[];
  type?: 'open' | 'annotation' | 'manual';
  dateCreated: string;
  dateUpdated?: string;
}

export interface TimelineEvent {
  id: string;
  entityId: string;
  entityType: 'media' | 'vault' | 'concept' | 'question' | 'draft' | 'insight' | string;
  entityTitle: string;
  eventType: EventType;
  reason: string;
  influencedBy?: string[];
  date: string;
}

export interface Draft {
  id: string;
  title: string;
  body: string;
  type: DraftType;
  status: DraftStatus;
  writingStyle?: WritingStyle;
  externalDoc?: ExternalDraftDocument;
  conceptTags: string[];
  sourceIds: string[];
  questionIds: string[];
  beliefIds: string[];
  dateCreated: string;
  dateUpdated: string;
}

export interface ExternalDraftDocument {
  provider: ExternalDocProvider;
  title: string;
  url: string;
  documentId?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  syncStatus: ExternalDocSyncStatus;
  syncError?: string;
}

export interface Practice {
  id: string;
  title: string;
  description: string;
  type: PracticeType;
  status: PracticeStatus;
  durationDays: number;
  startDate: string;
  endDate: string;
  conceptTags: string[];
  sourceIds: string[];
  questionIds: string[];
  positionIds: string[];
  draftIds: string[];
  notes: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface GoalSettings {
  id?: string;
  label: string;
  types: MediaType[];
  targets: Partial<Record<MediaType, number>>;
}

export interface WritingDefaults {
  type: DraftType;
  status: DraftStatus;
  writingStyle: WritingStyle;
  editorFeel: 'focused' | 'spacious' | 'dense';
}

export interface UserPreferences {
  id?: string;
  themeMode: ThemeMode;
  accentTheme: AccentTheme;
  writingDefaults: WritingDefaults;
  dateUpdated?: string;
}

export interface UserProfile {
  id?: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  dateUpdated?: string;
}

export interface AtlasViewSettings {
  id?: string;
  x: number;
  y: number;
  scale: number;
}

export interface AtlasNodePosition {
  id?: string;
  name: string;
  x: number;
  y: number;
}

export interface AtlasMapNodePosition {
  x: number;
  y: number;
}

export interface AtlasAutoLinkFilters {
  sharedSources: boolean;
  sharedPositions: boolean;
  sharedInquiries: boolean;
  sharedWorks: boolean;
  sharedPractices: boolean;
  conceptLinks: boolean;
}

export interface AtlasMapLink {
  id: string;
  from: string;
  to: string;
  type: AtlasMapLinkType;
  label: string;
  note?: string;
  dateCreated: string;
}

export interface AtlasMap {
  id: string;
  title: string;
  description: string;
  nodeNames: string[];
  nodePositions: Record<string, AtlasMapNodePosition>;
  manualLinks: AtlasMapLink[];
  autoLinkFilters: AtlasAutoLinkFilters;
  dateCreated: string;
  dateUpdated: string;
}
