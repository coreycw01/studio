import { collection, doc, type Firestore } from 'firebase/firestore';
import type { AtlasViewSettings, GoalSettings, MediaType } from './types';

export const PROTOTYPE_USER_ID = 'anonymous-scholar';

export const READEX_COLLECTIONS = {
  media: 'media',
  concepts: 'concepts',
  questions: 'questions',
  vault: 'vault',
  drafts: 'drafts',
  practices: 'practices',
  timeline: 'timeline',
  insights: 'insights',
  settings: 'settings',
} as const;

export const READEX_SETTINGS_DOCS = {
  goal: 'goal',
  atlasView: 'atlasView',
  atlasNodes: 'atlasNodes',
  schema: 'schema',
} as const;

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  label: '2026 Source Goals',
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
    timeline: userCollection('timeline'),
    insights: userCollection('insights'),
    settingsGoal: settingsDoc('goal'),
    settingsAtlasView: settingsDoc('atlasView'),
    settingsAtlasNodes: settingsDoc('atlasNodes'),
    settingsSchema: settingsDoc('schema'),
  };
}

export function readexSchemaDoc(uid: string) {
  return {
    uid,
    version: 1,
    root: userPath(uid),
    collections: {
      media: `${userPath(uid)}/media`,
      concepts: `${userPath(uid)}/concepts`,
      questions: `${userPath(uid)}/questions`,
      vault: `${userPath(uid)}/vault`,
      drafts: `${userPath(uid)}/drafts`,
      practices: `${userPath(uid)}/practices`,
      timeline: `${userPath(uid)}/timeline`,
      insights: `${userPath(uid)}/insights`,
      settings: `${userPath(uid)}/settings`,
    },
    settingsDocs: {
      goal: `${userPath(uid)}/settings/goal`,
      atlasView: `${userPath(uid)}/settings/atlasView`,
      atlasNodes: `${userPath(uid)}/settings/atlasNodes`,
      schema: `${userPath(uid)}/settings/schema`,
    },
    mediaTypes: DEFAULT_GOAL_SETTINGS.types as MediaType[],
    updatedAt: new Date().toISOString(),
  };
}
