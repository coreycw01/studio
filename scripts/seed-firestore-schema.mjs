import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const schema = JSON.parse(readFileSync(join(rootDir, 'docs', 'firestore.schema.json'), 'utf8'));
const uid = process.argv[2] || process.env.NOESIS_UID || schema.prototypeUid || 'anonymous-scholar';
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
const now = new Date().toISOString();

if (!admin.apps.length) {
  admin.initializeApp(projectId ? { projectId } : undefined);
}

const db = admin.firestore();
const userRef = db.collection('users').doc(uid);

const collectionPlaceholders = {
  media: {
    title: 'Schema Placeholder Source',
    creator: 'Noesis',
    type: 'other',
    status: 'Want to Read',
    year: '',
    genre: '',
    description: 'Placeholder document used to create the media collection shape.',
    url: '',
    thumbnailUrl: '',
    tags: ['Unsorted Ideas'],
    annotations: [],
    capture: { sessions: [] },
    dateAdded: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  concepts: {
    name: 'Unsorted Ideas',
    description: 'Fallback concept for untagged ideas and captured material.',
    links: [],
    sourceIds: [],
    x: 50,
    y: 50,
    createdFrom: 'fallback',
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  questions: {
    text: 'What question belongs here?',
    status: 'open',
    answer: '',
    evidenceIds: [],
    conceptIds: ['Unsorted Ideas'],
    sourceIds: [],
    beliefIds: [],
    draftIds: [],
    type: 'manual',
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  vault: {
    title: 'Placeholder Position',
    type: 'belief',
    statement: 'A clear position will live here.',
    description: 'Placeholder document used to create the positions collection shape.',
    confidence: 3,
    status: 'active',
    tags: ['Unsorted Ideas'],
    sourceIds: [],
    insightIds: [],
    evidenceFor: [],
    evidenceAgainst: [],
    versionHistory: [],
    createdFrom: 'manual',
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  drafts: {
    title: 'Placeholder Work',
    body: '',
    type: 'essay',
    status: 'seed',
    conceptTags: ['Unsorted Ideas'],
    sourceIds: [],
    questionIds: [],
    beliefIds: [],
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  practices: {
    title: 'Placeholder Practice',
    description: 'A lived test, habit, commitment, or experiment will live here.',
    type: 'experiment',
    status: 'planned',
    durationDays: 7,
    startDate: '',
    endDate: '',
    conceptTags: ['Unsorted Ideas'],
    sourceIds: [],
    questionIds: [],
    positionIds: [],
    draftIds: [],
    notes: '',
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  atlasMaps: {
    title: 'Placeholder Custom Map',
    description: 'Saved Atlas maps let users choose nodes, create typed links, and layer auto-connections with filters.',
    nodeNames: ['Unsorted Ideas'],
    nodePositions: { 'Unsorted Ideas': { x: 50, y: 50 } },
    manualLinks: [],
    autoLinkFilters: {
      sharedSources: true,
      sharedPositions: true,
      sharedInquiries: true,
      sharedWorks: true,
      sharedPractices: true,
      conceptLinks: true
    },
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  },
  timeline: {
    entityId: '_schema',
    entityType: 'schema',
    entityTitle: 'Noesis schema initialized',
    eventType: 'created',
    reason: 'Firestore collection schema was scaffolded.',
    influencedBy: [],
    date: now,
    _schemaPlaceholder: true
  },
  insights: {
    title: 'Placeholder Insight',
    body: 'Mirrored idea records will live here.',
    sourceIds: [],
    tags: ['Unsorted Ideas'],
    categories: [],
    connections: [],
    beliefId: '',
    dateCreated: now,
    dateUpdated: now,
    _schemaPlaceholder: true
  }
};

async function setIfMissing(ref, data) {
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(data);
    return 'created';
  }
  return 'exists';
}

async function main() {
  const batch = db.batch();

  batch.set(userRef, { uid, app: 'noesis', updatedAt: now }, { merge: true });
  batch.set(userRef.collection('settings').doc('goal'), {
    label: '2026 Source Goals',
    types: ['book', 'movie', 'video', 'documentary', 'article', 'podcast', 'audiobook'],
    targets: { book: 12, movie: 12, video: 12, documentary: 12, article: 12, podcast: 12, audiobook: 12 }
  }, { merge: true });
  batch.set(userRef.collection('settings').doc('atlasView'), { x: 0, y: 0, scale: 1 }, { merge: true });
  batch.set(userRef.collection('settings').doc('atlasNodes'), { positions: {} }, { merge: true });
  batch.set(userRef.collection('settings').doc('schema'), {
    ...schema,
    uid,
    root: `/users/${uid}`,
    updatedAt: now
  }, { merge: true });

  await batch.commit();

  const results = [];
  for (const [collectionName, placeholder] of Object.entries(collectionPlaceholders)) {
    const result = await setIfMissing(userRef.collection(collectionName).doc('_schema'), placeholder);
    results.push(`${collectionName}: ${result}`);
  }

  console.log(`Noesis Firestore schema scaffolded for /users/${uid}`);
  console.log(results.join('\n'));
  console.log('You can delete _schema placeholder docs later after real data exists.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
