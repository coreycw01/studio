"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  FirebaseClientProvider,
  initializeFirebase,
  useCollection,
  useDoc,
  useFirebase,
  useUser,
} from '@/firebase';
import { Shell } from '@/components/Shell';
import { ConceptAtlas } from '@/components/Atlas/ConceptAtlas';
import { ConceptEncyclopedia } from '@/components/Concepts/ConceptEncyclopedia';
import { MediaLibrary } from '@/components/Library/MediaLibrary';
import { BeliefVault } from '@/components/Vault/BeliefVault';
import { Atelier } from '@/components/Writing/Atelier';
import { QuestionsWorkspace } from '@/components/Questions/QuestionsWorkspace';
import { EvolutionTimeline } from '@/components/Evolution/EvolutionTimeline';
import { Toaster } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MEDIA_LABELS, MEDIA_TYPES, conceptKey, ensureConceptTerms, normalizeConceptTags, today } from '@/lib/readex';
import type { Concept, Draft, GoalSettings, Insight, Media, MediaType, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const PROTOTYPE_USER_ID = 'anonymous-scholar';

const defaultGoal: GoalSettings = {
  label: '2026 Source Goals',
  types: ['book', 'movie', 'video', 'documentary', 'article', 'podcast', 'audiobook'],
  targets: { book: 12, movie: 12, video: 12, documentary: 12, article: 12, podcast: 12, audiobook: 12 },
};

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalSettings>(defaultGoal);
  const effectiveUid = user?.uid || PROTOTYPE_USER_ID;

  const refs = useMemo(() => ({
    media: collection(db, 'users', effectiveUid, 'media'),
    vault: collection(db, 'users', effectiveUid, 'vault'),
    insights: collection(db, 'users', effectiveUid, 'insights'),
    concepts: collection(db, 'users', effectiveUid, 'concepts'),
    questions: collection(db, 'users', effectiveUid, 'questions'),
    timeline: collection(db, 'users', effectiveUid, 'timeline'),
    drafts: collection(db, 'users', effectiveUid, 'drafts'),
    settingsGoal: doc(db, 'users', effectiveUid, 'settings', 'goal'),
  }), [db, effectiveUid]);

  const { data: media = [] } = useCollection<Media>(refs.media as any);
  const { data: vault = [] } = useCollection<VaultEntry>(refs.vault as any);
  const { data: insights = [] } = useCollection<Insight>(refs.insights as any);
  const { data: concepts = [] } = useCollection<Concept>(refs.concepts as any);
  const { data: questions = [] } = useCollection<Question>(refs.questions as any);
  const { data: timeline = [] } = useCollection<TimelineEvent>(refs.timeline as any);
  const { data: drafts = [] } = useCollection<Draft>(refs.drafts as any);
  const { data: goalDoc } = useDoc<GoalSettings>(refs.settingsGoal as any);
  const goal = { ...defaultGoal, ...(goalDoc || {}) };

  useEffect(() => setGoalDraft(goal), [goalDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const createTimelineEvent = (event: Partial<TimelineEvent>) => addDoc(refs.timeline, {
    entityId: event.entityId || '',
    entityType: event.entityType || 'unknown',
    entityTitle: event.entityTitle || 'Untitled',
    eventType: event.eventType || 'created',
    reason: event.reason || '',
    influencedBy: event.influencedBy || [],
    date: event.date || today(),
  });

  const ensureConcepts = async (tags: string[]) => {
    const missing = ensureConceptTerms(concepts, tags);
    await Promise.all(missing.map((name) => addDoc(refs.concepts, {
      name,
      description: '',
      links: [],
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      createdFrom: name === 'Unsorted Ideas' ? 'fallback' : 'tag',
      dateCreated: today(),
    })));
  };

  const addConcept = (data: Partial<Concept>) => addDoc(refs.concepts, {
    name: conceptKey(data.name),
    description: data.description || '',
    links: data.links || [],
    x: data.x ?? Math.random() * 80 + 10,
    y: data.y ?? Math.random() * 80 + 10,
    createdFrom: data.createdFrom || 'manual',
    dateCreated: today(),
  });
  const updateConcept = (concept: Concept) => updateDoc(doc(refs.concepts, concept.id), { ...concept, dateUpdated: today() });
  const deleteConcept = (id: string) => deleteDoc(doc(refs.concepts, id));

  const addMedia = async (data: Partial<Media>) => {
    const tags = normalizeConceptTags(data.tags);
    await ensureConcepts(tags);
    const created = await addDoc(refs.media, {
      title: data.title || 'Untitled Source',
      creator: data.creator || '',
      type: data.type || 'book',
      status: data.status || 'Want to Read',
      year: data.year || '',
      genre: data.genre || '',
      description: data.description || '',
      url: data.url || '',
      thumbnailUrl: data.thumbnailUrl || '',
      tags,
      annotations: data.annotations || [],
      capture: data.capture || { sessions: [] },
      dateAdded: today(),
      dateUpdated: today(),
    });
    await createTimelineEvent({ entityId: created.id, entityType: 'media', entityTitle: data.title, eventType: 'created', reason: 'Source added to Library' });
  };
  const updateMedia = async (item: Media) => {
    await ensureConcepts(item.tags || []);
    await updateDoc(doc(refs.media, item.id), item as any);
  };
  const deleteMedia = (id: string) => deleteDoc(doc(refs.media, id));

  const addVaultEntry = async (data: Partial<VaultEntry>) => {
    const tags = normalizeConceptTags(data.tags);
    await ensureConcepts(tags);
    const created = await addDoc(refs.vault, {
      title: data.title || 'Untitled Belief',
      type: data.type || 'belief',
      statement: data.statement || data.description || '',
      description: data.description || data.statement || '',
      confidence: data.confidence || 3,
      status: data.status || 'active',
      tags,
      sourceIds: data.sourceIds || [],
      evidenceFor: data.evidenceFor || [],
      evidenceAgainst: data.evidenceAgainst || [],
      versionHistory: data.versionHistory || [],
      createdFrom: data.createdFrom || 'manual',
      dateCreated: today(),
      dateUpdated: today(),
    });
    await createTimelineEvent({ entityId: created.id, entityType: 'vault', entityTitle: data.title, eventType: 'created', reason: 'Belief added to Vault', influencedBy: data.sourceIds });
  };
  const updateVaultEntry = async (entry: VaultEntry) => {
    await ensureConcepts(entry.tags || []);
    await updateDoc(doc(refs.vault, entry.id), entry as any);
    await createTimelineEvent({ entityId: entry.id, entityType: 'vault', entityTitle: entry.title, eventType: 'refined', reason: 'Belief updated', influencedBy: entry.sourceIds });
  };
  const deleteVaultEntry = (id: string) => deleteDoc(doc(refs.vault, id));

  const createIdea = async (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => {
    const tags = normalizeConceptTags(data.tags);
    await ensureConcepts(tags);
    const insightRef = doc(refs.insights);
    const beliefRef = doc(refs.vault);
    const batch = writeBatch(db);
    batch.set(insightRef, {
      title: data.title,
      body: data.body,
      sourceIds: data.sourceIds || [],
      tags,
      categories: [],
      connections: [beliefRef.id],
      beliefId: beliefRef.id,
      dateCreated: today(),
      dateUpdated: today(),
    });
    batch.set(beliefRef, {
      title: data.title,
      type: 'belief',
      statement: data.title,
      description: data.body,
      confidence: 3,
      status: 'active',
      tags,
      sourceIds: data.sourceIds || [],
      insightIds: [insightRef.id],
      evidenceFor: [],
      evidenceAgainst: [],
      versionHistory: [],
      createdFrom: 'idea',
      dateCreated: today(),
      dateUpdated: today(),
    });
    const eventRef = doc(refs.timeline);
    batch.set(eventRef, { entityId: beliefRef.id, entityType: 'vault', entityTitle: data.title, eventType: 'created', reason: 'Idea saved to Beliefs', influencedBy: data.sourceIds || [], date: today() });
    await batch.commit();
    setView('vault');
  };

  const addQuestion = (data: Partial<Question>) => addDoc(refs.questions, {
    text: data.text || '',
    status: data.status || 'open',
    answer: data.answer || '',
    evidenceIds: data.evidenceIds || [],
    conceptIds: data.conceptIds || [],
    sourceIds: data.sourceIds || [],
    beliefIds: data.beliefIds || [],
    draftIds: data.draftIds || [],
    type: data.type || 'manual',
    dateCreated: today(),
    dateUpdated: today(),
  });
  const updateQuestion = (question: Question) => updateDoc(doc(refs.questions, question.id), { ...question, dateUpdated: today() } as any);

  const addDraft = async (data: Partial<Draft>) => {
    const conceptTags = normalizeConceptTags(data.conceptTags);
    await ensureConcepts(conceptTags);
    const created = await addDoc(refs.drafts, {
      title: data.title || 'Untitled Draft',
      body: data.body || '',
      type: data.type || 'essay',
      status: data.status || 'seed',
      conceptTags,
      sourceIds: data.sourceIds || [],
      questionIds: data.questionIds || [],
      beliefIds: data.beliefIds || [],
      dateCreated: today(),
      dateUpdated: today(),
    });
    await createTimelineEvent({ entityId: created.id, entityType: 'draft', entityTitle: data.title, eventType: 'created', reason: 'Writing draft created' });
  };
  const updateDraft = async (draft: Draft) => {
    await ensureConcepts(draft.conceptTags || []);
    await updateDoc(doc(refs.drafts, draft.id), draft as any);
  };
  const deleteDraft = (id: string) => deleteDoc(doc(refs.drafts, id));

  const saveGoal = async () => {
    await setDoc(refs.settingsGoal, goalDraft, { merge: true });
    setGoalOpen(false);
  };

  const goalProgress = MEDIA_TYPES.reduce((acc, type) => {
    acc[type] = media.filter((item) => item.type === type && item.status === 'Finished').length;
    return acc;
  }, {} as Record<MediaType, number>);

  const renderContent = () => {
    switch (view) {
      case 'atlas':
        return <ConceptAtlas concepts={concepts} media={media} insights={insights} vault={vault} drafts={drafts} questions={questions} timeline={timeline} onAddConcept={addConcept} onUpdateConcept={updateConcept} />;
      case 'concepts':
        return <ConceptEncyclopedia concepts={concepts} media={media} insights={insights} vault={vault} drafts={drafts} questions={questions} timeline={timeline} onAddConcept={addConcept} onUpdateConcept={updateConcept} onDeleteConcept={deleteConcept} />;
      case 'library':
        return <MediaLibrary media={media} concepts={concepts} vault={vault} onAddMedia={addMedia} onUpdateMedia={updateMedia} onDeleteMedia={deleteMedia} onAddConcept={addConcept} />;
      case 'vault':
        return <BeliefVault entries={vault} media={media} drafts={drafts} concepts={concepts} onAddEntry={addVaultEntry} onUpdateEntry={updateVaultEntry} onDeleteEntry={deleteVaultEntry} onCreateIdea={createIdea} onAddConcept={addConcept} />;
      case 'questions':
        return <QuestionsWorkspace questions={questions} media={media} vault={vault} drafts={drafts} concepts={concepts} onAddQuestion={addQuestion} onUpdateQuestion={updateQuestion} />;
      case 'writing':
        return <Atelier drafts={drafts} media={media} vault={vault} questions={questions} concepts={concepts} onAddDraft={addDraft} onUpdateDraft={updateDraft} onDeleteDraft={deleteDraft} onAddConcept={addConcept} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline} />;
      default:
        return null;
    }
  };

  return (
    <Shell
      activeView={view}
      onViewChange={setView}
      counts={{ concepts: concepts.length, questions: questions.length, media: media.length, vault: vault.length, drafts: drafts.length, timeline: timeline.length }}
      goal={goal}
      goalProgress={goalProgress}
      onEditGoal={() => setGoalOpen(true)}
    >
      {renderContent()}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-2xl italic">Edit Goals</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Goal Label</Label><Input value={goalDraft.label} onChange={(event) => setGoalDraft((prev) => ({ ...prev, label: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Separate Targets By Media Type</Label>
              <div className="space-y-2">
                {MEDIA_TYPES.map((type) => (
                  <label key={type} className="grid grid-cols-[auto_1fr_90px] gap-2 items-center text-sm">
                    <input
                      type="checkbox"
                      checked={goalDraft.types.includes(type)}
                      onChange={(event) => setGoalDraft((prev) => ({ ...prev, types: event.target.checked ? [...prev.types, type] : prev.types.filter((t) => t !== type) }))}
                    />
                    <span>{MEDIA_LABELS[type]}</span>
                    <Input type="number" min={1} value={goalDraft.targets[type] || 12} onChange={(event) => setGoalDraft((prev) => ({ ...prev, targets: { ...prev.targets, [type]: Math.max(1, Number(event.target.value) || 1) } }))} />
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveGoal}>Save Goals</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </Shell>
  );
}

export default function Home() {
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);

  useEffect(() => {
    const config = initializeFirebase();
    setFirebaseConfig(config);
  }, []);

  if (!firebaseConfig) return null;

  return (
    <FirebaseClientProvider firebaseApp={firebaseConfig.firebaseApp} firestore={firebaseConfig.firestore} auth={firebaseConfig.auth}>
      <ReadexApp />
    </FirebaseClientProvider>
  );
}
