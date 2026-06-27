import { collection, doc, type Firestore } from 'firebase/firestore';
import type { AtlasViewSettings, GoalSettings, MediaType, UserPreferences, UserProfile } from './types';

export const PROTOTYPE_USER_ID = 'anonymous-scholar';

export const READEX_COLLECTIONS = {
  media: 'media',
  concepts: 'concepts',
  questions: 'questions',
  vault: 'vault',
  drafts: 'drafts',
  practices: 'practices',
  atlasMaps: 'atlasMaps',
  links: 'links',
  suggestions: 'suggestions',
  timeline: 'timeline',
  insights: 'insights',
  settings: 'settings',
} as const;

export const READEX_SETTINGS_DOCS = {
  goal: 'goal',
  atlasView: 'atlasView',
  atlasNodes: 'atlasNodes',
  preferences: 'preferences',
  profile: 'profile',
  schema: 'schema',
} as const;

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  label: '2026 Goals',
  types: ['book', 'movie', 'video', 'documentary', 'article', 'podcast', 'audiobook'],
  targets: { book: 12, movie: 12, video: 12, documentary: 12, article: 12, podcast: 12, audiobook: 12 },
};

export const DEFAULT_ATLAS_VIEW_SETTINGS: AtlasViewSettings = {
  x: 0,
  y: 0,
  scale: 1,
};

export const DEFAULT_ATLAS_NODE_SETTINGS: { positions: Record<string, { x: number; y: number }> } = {
  positions: {},
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'light',
  accentTheme: 'violet',
  writingDefaults: {
    type: 'essay',
    status: 'seed',
    writingStyle: 'blank_paper',
    editorFeel: 'spacious',
  },
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: '',
  email: '',
  photoURL: '',
  bio: '',
};

export function userPath(uid: string) {
  return `users/${uid}`;
}

export function readexRefs(db: Firestore, uid: string) {
  const userDoc = doc(db, 'users', uid);
  const userCollection = (name: keyof typeof READEX_COLLECTIONS) => collection(userDoc, READEX_COLLECTIONS[name]);
  const settingsDoc = (name: keyof typeof READEX_SETTINGS_DOCS) => doc(userDoc, READEX_COLLECTIONS.settings, READEX_SETTINGS_DOCS[name]);

  return {
    user: userDoc,
    media: userCollection('media'),
    concepts: userCollection('concepts'),
    questions: userCollection('questions'),
    vault: userCollection('vault'),
    drafts: userCollection('drafts'),
    practices: userCollection('practices'),
    atlasMaps: userCollection('atlasMaps'),
    links: userCollection('links'),
    suggestions: userCollection('suggestions'),
    timeline: userCollection('timeline'),
    insights: userCollection('insights'),
    settingsGoal: settingsDoc('goal'),
    settingsAtlasView: settingsDoc('atlasView'),
    settingsAtlasNodes: settingsDoc('atlasNodes'),
    settingsPreferences: settingsDoc('preferences'),
    settingsProfile: settingsDoc('profile'),
    settingsSchema: settingsDoc('schema'),
  };
}

export function readexSchemaDoc(uid: string) {
  return {
    uid,
    version: 2,
    root: userPath(uid),
    collections: {
      media: `${userPath(uid)}/media`,
      concepts: `${userPath(uid)}/concepts`,
      questions: `${userPath(uid)}/questions`,
      vault: `${userPath(uid)}/vault`,
      drafts: `${userPath(uid)}/drafts`,
      practices: `${userPath(uid)}/practices`,
      atlasMaps: `${userPath(uid)}/atlasMaps`,
      links: `${userPath(uid)}/links`,
      suggestions: `${userPath(uid)}/suggestions`,
      timeline: `${userPath(uid)}/timeline`,
      insights: `${userPath(uid)}/insights`,
      settings: `${userPath(uid)}/settings`,
    },
    settingsDocs: {
      goal: `${userPath(uid)}/settings/goal`,
      atlasView: `${userPath(uid)}/settings/atlasView`,
      atlasNodes: `${userPath(uid)}/settings/atlasNodes`,
      preferences: `${userPath(uid)}/settings/preferences`,
      profile: `${userPath(uid)}/settings/profile`,
      schema: `${userPath(uid)}/settings/schema`,
    },
    mediaTypes: DEFAULT_GOAL_SETTINGS.types as MediaType[],
    updatedAt: new Date().toISOString(),
  };
}
