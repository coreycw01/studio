
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  FirebaseClientProvider,
  initializeFirebase,
  isFirebaseConfigComplete,
  missingFirebaseConfigKeys,
  useCollection,
  useDoc,
  useFirebase,
  useUser,
} from '@/firebase';
import { LoginPage } from '@/components/Auth/LoginPage';
import { Shell } from '@/components/Shell';
import { ConceptAtlas } from '@/components/Atlas/ConceptAtlas';
import { ConceptEncyclopedia } from '@/components/Concepts/ConceptEncyclopedia';
import { MediaLibrary } from '@/components/Library/MediaLibrary';
import { SourceIndex } from '@/components/Library/SourceIndex';
import { AnnotationsIndex } from '@/components/Library/AnnotationsIndex';
import { BeliefVault } from '@/components/Vault/BeliefVault';
import { Atelier } from '@/components/Writing/Atelier';
import { QuestionsWorkspace } from '@/components/Questions/QuestionsWorkspace';
import { EvolutionTimeline } from '@/components/Evolution/EvolutionTimeline';
import { PracticesWorkspace } from '@/components/Practices/PracticesWorkspace';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { Toaster } from '@/components/ui/toaster';
import { MEDIA_TYPES, allAnnotations, conceptKey, ensureConceptTerms, normalizeConceptTags, today } from '@/lib/readex';
import { DEFAULT_ATLAS_NODE_SETTINGS, DEFAULT_ATLAS_VIEW_SETTINGS, DEFAULT_GOAL_SETTINGS, DEFAULT_USER_PREFERENCES, DEFAULT_USER_PROFILE, PROTOTYPE_USER_ID, readexRefs, readexSchemaDoc } from '@/lib/firestore-schema';
import type { Annotation, AtlasMap, Concept, Draft, GoalSettings, Insight, Media, MediaType, Practice, Question, TimelineEvent, VaultEntry, SecurityRuleContext, UserPreferences, UserProfile } from '@/lib/types';
import { doc, getDoc, setDoc, updateDoc, writeBatch, deleteDoc, type DocumentData, type DocumentReference } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

type FirebaseInstances = ReturnType<typeof initializeFirebase>;

function ReadexWorkspace({ user, uid }: { user: User | null; uid: string }) {
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');
  const [focusedSourceId, setFocusedSourceId] = useState<string | null>(null);
  const effectiveUid = uid;

  const refs = useMemo(() => readexRefs(db, effectiveUid), [db, effectiveUid]);

  const { data: media = [] } = useCollection<Media>(refs.media as any);
  const { data: vault = [] } = useCollection<VaultEntry>(refs.vault as any);
  const { data: insights = [] } = useCollection<Insight>(refs.insights as any);
  const { data: concepts = [] } = useCollection<Concept>(refs.concepts as any);
  const { data: questions = [] } = useCollection<Question>(refs.questions as any);
  const { data: timeline = [] } = useCollection<TimelineEvent>(refs.timeline as any);
  const { data: drafts = [] } = useCollection<Draft>(refs.drafts as any);
  const { data: practices = [] } = useCollection<Practice>(refs.practices as any);
  const { data: atlasMaps = [] } = useCollection<AtlasMap>(refs.atlasMaps as any);
  const { data: goalDoc } = useDoc<GoalSettings>(refs.settingsGoal as any);
  const { data: preferencesDoc } = useDoc<UserPreferences>(refs.settingsPreferences as any);
  const { data: profileDoc } = useDoc<UserProfile>(refs.settingsProfile as any);
  
  const goal = { ...DEFAULT_GOAL_SETTINGS, ...(goalDoc || {}) };
  const preferences: UserPreferences = {
    ...DEFAULT_USER_PREFERENCES,
    ...(preferencesDoc || {}),
    writingDefaults: {
      ...DEFAULT_USER_PREFERENCES.writingDefaults,
      ...(preferencesDoc?.writingDefaults || {}),
    },
  };
  const profile: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    ...(profileDoc || {}),
    displayName: profileDoc?.displayName || user?.displayName || '',
    email: profileDoc?.email || user?.email || '',
    photoURL: profileDoc?.photoURL || user?.photoURL || '',
  };

  useEffect(() => {
    const setDefaultIfMissing = async (ref: DocumentReference<DocumentData>, data: DocumentData) => {
      try {
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) await setDoc(ref, data);
      } catch (err) {
        console.warn('Silent skip: settings init error', ref.path);
      }
    };

    const scaffoldFirestore = async () => {
      try {
        await setDoc(refs.user, { uid: effectiveUid, app: 'readex', updatedAt: today() }, { merge: true });
        await setDefaultIfMissing(refs.settingsGoal, DEFAULT_GOAL_SETTINGS);
        await setDefaultIfMissing(refs.settingsAtlasView, DEFAULT_ATLAS_VIEW_SETTINGS);
        await setDefaultIfMissing(refs.settingsAtlasNodes, DEFAULT_ATLAS_NODE_SETTINGS);
        await setDefaultIfMissing(refs.settingsPreferences, DEFAULT_USER_PREFERENCES);
        await setDoc(refs.settingsProfile, {
          ...DEFAULT_USER_PROFILE,
          displayName: user?.displayName || '',
          email: user?.email || '',
          photoURL: user?.photoURL || '',
          dateUpdated: today(),
        }, { merge: true });
        await setDoc(refs.settingsSchema, readexSchemaDoc(effectiveUid), { merge: true });
      } catch (err) {
        console.warn('Silent skip: scaffold error', err);
      }
    };

    scaffoldFirestore();
  }, [effectiveUid, refs, user]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = preferences.themeMode === 'dark' || (preferences.themeMode === 'system' && systemDark);
    root.classList.toggle('dark', dark);
    root.dataset.theme = preferences.accentTheme;
    window.localStorage.setItem('noesis:theme', JSON.stringify({
      themeMode: preferences.themeMode,
      accentTheme: preferences.accentTheme,
    }));
  }, [preferences.themeMode, preferences.accentTheme]);

  const emitError = (path: string, operation: SecurityRuleContext['operation'], data?: any) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path,
      operation,
      requestResourceData: data,
    }));
  };

  const createTimelineEvent = (event: Partial<TimelineEvent>) => {
    const eventRef = doc(refs.timeline);
    const data = {
      id: eventRef.id,
      entityId: event.entityId || '',
      entityType: event.entityType || 'unknown',
      entityTitle: event.entityTitle || 'Untitled',
      eventType: event.eventType || 'created',
      reason: event.reason || '',
      influencedBy: event.influencedBy || [],
      date: event.date || today(),
    };
    setDoc(eventRef, data).catch(() => emitError(eventRef.path, 'create', data));
  };

  const ensureConcepts = (tags: string[]) => {
    const missing = ensureConceptTerms(concepts, tags);
    missing.forEach((name) => {
      const conceptRef = doc(refs.concepts);
      const data = {
        id: conceptRef.id,
        name,
        description: '',
        links: [],
        sourceIds: [],
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        createdFrom: name === 'Unsorted Ideas' ? 'fallback' : 'tag',
        dateCreated: today(),
      };
      setDoc(conceptRef, data).catch(() => emitError(conceptRef.path, 'create', data));
    });
  };

  const addConcept = (data: Partial<Concept>) => {
    const conceptRef = doc(refs.concepts);
    const payload = {
      id: conceptRef.id,
      name: conceptKey(data.name),
      description: data.description || '',
      links: data.links || [],
      sourceIds: data.sourceIds || [],
      x: data.x ?? Math.random() * 80 + 10,
      y: data.y ?? Math.random() * 80 + 10,
      createdFrom: data.createdFrom || 'manual',
      dateCreated: today(),
    };
    setDoc(conceptRef, payload).catch(() => emitError(conceptRef.path, 'create', payload));
  };

  const updateConcept = (concept: Concept) => {
    const conceptRef = doc(refs.concepts, concept.id);
    updateDoc(conceptRef, { ...concept, dateUpdated: today() }).catch(() => emitError(conceptRef.path, 'update', concept));
  };

  const deleteConcept = (id: string) => {
    const conceptRef = doc(refs.concepts, id);
    deleteDoc(conceptRef).catch(() => emitError(conceptRef.path, 'delete'));
  };

  const addMedia = (data: Partial<Media>) => {
    const tags = normalizeConceptTags(data.tags);
    ensureConcepts(tags);
    const mediaRef = doc(refs.media);
    const payload = {
      id: mediaRef.id,
      title: data.title || 'Untitled Source',
      creator: data.creator || '',
      type: data.type || 'book',
      status: data.status || 'Want to Read',
      year: data.year || '',
      genre: data.genre || '',
      description: data.description || '',
      url: data.url || '',
      thumbnailUrl: data.thumbnailUrl || '',
      publisher: data.publisher || '',
      isbn: data.isbn || '',
      doi: data.doi || '',
      platform: data.platform || '',
      creators: data.creators || (data.creator ? [data.creator] : []),
      sourceProvider: data.sourceProvider || 'manual',
      externalIds: data.externalIds || {},
      tags,
      annotations: data.annotations || [],
      capture: data.capture || { sessions: [] },
      dateAdded: today(),
      dateUpdated: today(),
    };
    setDoc(mediaRef, payload).catch(() => emitError(mediaRef.path, 'create', payload));
    createTimelineEvent({ entityId: mediaRef.id, entityType: 'media', entityTitle: payload.title, eventType: 'created', reason: 'Source added to Noesis' });
  };

  const updateMedia = (item: Media) => {
    ensureConcepts(item.tags || []);
    const mediaRef = doc(refs.media, item.id);
    updateDoc(mediaRef, { ...item, dateUpdated: today() } as any).catch(() => emitError(mediaRef.path, 'update', item));
  };

  const deleteMedia = (id: string) => {
    const mediaRef = doc(refs.media, id);
    deleteDoc(mediaRef).catch(() => emitError(mediaRef.path, 'delete'));
  };

  const updateAnnotation = (sourceId: string, annotation: Annotation) => {
    const source = media.find((item) => item.id === sourceId);
    if (!source) return;
    const annotations = (source.annotations || []).map((item) => item.id === annotation.id ? annotation : item);
    updateMedia({ ...source, annotations, dateUpdated: today() });
  };

  const deleteAnnotation = (sourceId: string, annotationId: string) => {
    const source = media.find((item) => item.id === sourceId);
    if (!source) return;
    const annotations = (source.annotations || []).filter((item) => item.id !== annotationId);
    updateMedia({ ...source, annotations, dateUpdated: today() });
  };

  const addVaultEntry = (data: Partial<VaultEntry>) => {
    const tags = normalizeConceptTags(data.tags);
    ensureConcepts(tags);
    const vaultRef = doc(refs.vault);
    const payload = {
      id: vaultRef.id,
      title: data.title || 'Untitled Position',
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
    };
    setDoc(vaultRef, payload).catch(() => emitError(vaultRef.path, 'create', payload));
    createTimelineEvent({ entityId: vaultRef.id, entityType: 'vault', entityTitle: payload.title, eventType: 'created', reason: 'Position formed', influencedBy: data.sourceIds });
  };

  const updateVaultEntry = (entry: VaultEntry) => {
    ensureConcepts(entry.tags || []);
    const vaultRef = doc(refs.vault, entry.id);
    updateDoc(vaultRef, { ...entry, dateUpdated: today() } as any).catch(() => emitError(vaultRef.path, 'update', entry));
    createTimelineEvent({ entityId: entry.id, entityType: 'vault', entityTitle: entry.title, eventType: 'refined', reason: 'Position refined', influencedBy: entry.sourceIds });
  };

  const deleteVaultEntry = (id: string) => {
    const vaultRef = doc(refs.vault, id);
    deleteDoc(vaultRef).catch(() => emitError(vaultRef.path, 'delete'));
  };

  const createIdea = (data: { title: string; body: string; tags: string[]; sourceIds: string[] }) => {
    const tags = normalizeConceptTags(data.tags);
    ensureConcepts(tags);
    const insightRef = doc(refs.insights);
    const beliefRef = doc(refs.vault);
    const batch = writeBatch(db);
    batch.set(insightRef, {
      id: insightRef.id,
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
      id: beliefRef.id,
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
    batch.set(eventRef, { id: eventRef.id, entityId: beliefRef.id, entityType: 'vault', entityTitle: data.title, eventType: 'created', reason: 'Idea formed as position', influencedBy: data.sourceIds || [], date: today() });
    batch.commit().catch(() => emitError('batch', 'write', data));
  };

  const addQuestion = (data: Partial<Question>) => {
    const questionRef = doc(refs.questions);
    const payload = {
      id: questionRef.id,
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
    };
    setDoc(questionRef, payload).catch(() => emitError(questionRef.path, 'create', payload));
  };

  const updateQuestion = (question: Question) => {
    const questionRef = doc(refs.questions, question.id);
    updateDoc(questionRef, { ...question, dateUpdated: today() } as any).catch(() => emitError(questionRef.path, 'update', question));
  };

  const addDraft = (data: Partial<Draft>) => {
    const conceptTags = normalizeConceptTags(data.conceptTags);
    ensureConcepts(conceptTags);
    const draftRef = doc(refs.drafts);
    const payload = {
      id: draftRef.id,
      title: data.title || 'Untitled Draft',
      body: data.body || '',
      type: data.type || preferences.writingDefaults.type,
      status: data.status || preferences.writingDefaults.status,
      writingStyle: data.writingStyle || preferences.writingDefaults.writingStyle,
      externalDoc: data.externalDoc || null,
      conceptTags,
      sourceIds: data.sourceIds || [],
      questionIds: data.questionIds || [],
      beliefIds: data.beliefIds || [],
      dateCreated: today(),
      dateUpdated: today(),
    };
    setDoc(draftRef, payload).catch(() => emitError(draftRef.path, 'create', payload));
    createTimelineEvent({ entityId: draftRef.id, entityType: 'draft', entityTitle: payload.title, eventType: 'created', reason: 'Work draft created' });
  };

  const updateDraft = (draft: Draft) => {
    ensureConcepts(draft.conceptTags || []);
    const draftRef = doc(refs.drafts, draft.id);
    updateDoc(draftRef, { ...draft, dateUpdated: today() } as any).catch(() => emitError(draftRef.path, 'update', draft));
  };

  const deleteDraft = (id: string) => {
    const draftRef = doc(refs.drafts, id);
    deleteDoc(draftRef).catch(() => emitError(draftRef.path, 'delete'));
  };

  const addPractice = (data: Partial<Practice>) => {
    const tags = normalizeConceptTags(data.conceptTags);
    ensureConcepts(tags);
    const practiceRef = doc(refs.practices);
    const payload = {
      id: practiceRef.id,
      title: data.title || 'Untitled Practice',
      description: data.description || '',
      type: data.type || 'experiment',
      status: data.status || 'planned',
      durationDays: data.durationDays || 7,
      startDate: data.startDate || today().slice(0, 10),
      endDate: data.endDate || '',
      conceptTags: tags,
      sourceIds: data.sourceIds || [],
      questionIds: data.questionIds || [],
      positionIds: data.positionIds || [],
      draftIds: data.draftIds || [],
      notes: data.notes || '',
      dateCreated: today(),
      dateUpdated: today(),
    };
    setDoc(practiceRef, payload).catch(() => emitError(practiceRef.path, 'create', payload));
    createTimelineEvent({ entityId: practiceRef.id, entityType: 'practice', entityTitle: payload.title, eventType: 'created', reason: 'New practice initiated' });
  };

  const updatePractice = (practice: Practice) => {
    ensureConcepts(practice.conceptTags || []);
    const practiceRef = doc(refs.practices, practice.id);
    updateDoc(practiceRef, { ...practice, dateUpdated: today() } as any).catch(() => emitError(practiceRef.path, 'update', practice));
  };

  const deletePractice = (id: string) => {
    const practiceRef = doc(refs.practices, id);
    deleteDoc(practiceRef).catch(() => emitError(practiceRef.path, 'delete'));
  };

  const addAtlasMap = (data: Partial<AtlasMap>) => {
    const mapRef = doc(refs.atlasMaps);
    const payload = {
      id: mapRef.id,
      title: data.title || 'Untitled Map',
      description: data.description || '',
      nodeNames: data.nodeNames || [],
      nodePositions: data.nodePositions || {},
      manualLinks: data.manualLinks || [],
      autoLinkFilters: data.autoLinkFilters || {
        sharedSources: true,
        sharedPositions: true,
        sharedInquiries: true,
        sharedWorks: true,
        sharedPractices: true,
        conceptLinks: true,
      },
      dateCreated: today(),
      dateUpdated: today(),
    };
    setDoc(mapRef, payload).catch(() => emitError(mapRef.path, 'create', payload));
  };

  const updateAtlasMap = (map: AtlasMap) => {
    const mapRef = doc(refs.atlasMaps, map.id);
    updateDoc(mapRef, { ...map, dateUpdated: today() } as any).catch(() => emitError(mapRef.path, 'update', map));
  };

  const deleteAtlasMap = (id: string) => {
    const mapRef = doc(refs.atlasMaps, id);
    deleteDoc(mapRef).catch(() => emitError(mapRef.path, 'delete'));
  };

  const saveGoal = async (nextGoal: GoalSettings) => {
    await setDoc(refs.settingsGoal, nextGoal, { merge: true });
  };

  const savePreferences = async (nextPreferences: UserPreferences) => {
    const payload = { ...nextPreferences, dateUpdated: today() };
    await setDoc(refs.settingsPreferences, payload, { merge: true });
  };

  const saveProfile = async (nextProfile: UserProfile) => {
    const payload = { ...nextProfile, email: user?.email || nextProfile.email || '', dateUpdated: today() };
    await setDoc(refs.settingsProfile, payload, { merge: true });
  };

  const goalProgress = MEDIA_TYPES.reduce((acc, type) => {
    acc[type] = media.filter((item) => item.type === type && item.status === 'Finished').length;
    return acc;
  }, {} as Record<MediaType, number>);

  const renderContent = () => {
    switch (view) {
      case 'atlas':
        return <ConceptAtlas concepts={concepts} media={media} insights={insights} vault={vault} drafts={drafts} practices={practices} questions={questions} timeline={timeline} atlasMaps={atlasMaps} onAddConcept={addConcept} onUpdateConcept={updateConcept} onAddAtlasMap={addAtlasMap} onUpdateAtlasMap={updateAtlasMap} onDeleteAtlasMap={deleteAtlasMap} />;
      case 'concepts':
        return (
          <ConceptEncyclopedia 
            concepts={concepts} 
            media={media} 
            insights={insights} 
            vault={vault} 
            drafts={drafts} 
            practices={practices}
            questions={questions} 
            timeline={timeline} 
            onAddConcept={addConcept} 
            onUpdateConcept={updateConcept} 
            onDeleteConcept={deleteConcept} 
            onCreateIdea={createIdea}
          />
        );
      case 'library':
        return (
          <MediaLibrary 
            media={media} 
            concepts={concepts} 
            vault={vault} 
            drafts={drafts}
            practices={practices}
            questions={questions}
            timeline={timeline}
            onAddMedia={addMedia} 
            onUpdateMedia={updateMedia} 
            onDeleteMedia={deleteMedia} 
            onAddConcept={addConcept} 
            onCreateIdea={createIdea}
            onDeleteVaultEntry={deleteVaultEntry}
            focusedSourceId={focusedSourceId}
            onFocusedSourceHandled={() => setFocusedSourceId(null)}
          />
        );
      case 'annotations':
        return (
          <AnnotationsIndex
            media={media}
            concepts={concepts}
            onUpdateAnnotation={updateAnnotation}
            onDeleteAnnotation={deleteAnnotation}
            onOpenSource={(sourceId) => {
              setFocusedSourceId(sourceId);
              setView('library');
            }}
            onCreatePosition={createIdea}
            onCreateInquiry={addQuestion}
            onAddConcept={addConcept}
          />
        );
      case 'source-index':
        return <SourceIndex media={media} vault={vault} drafts={drafts} practices={practices} onOpenSource={(sourceId) => { setFocusedSourceId(sourceId); setView('library'); }} />;
      case 'vault':
        return (
          <BeliefVault 
            entries={vault} 
            media={media} 
            drafts={drafts} 
            concepts={concepts} 
            onAddEntry={addVaultEntry} 
            onUpdateEntry={updateVaultEntry} 
            onDeleteEntry={deleteVaultEntry} 
            onAddConcept={addConcept} 
          />
        );
      case 'questions':
        return <QuestionsWorkspace questions={questions} media={media} vault={vault} drafts={drafts} concepts={concepts} onAddQuestion={addQuestion} onUpdateQuestion={updateQuestion} />;
      case 'writing':
        return <Atelier drafts={drafts} media={media} vault={vault} questions={questions} concepts={concepts} writingDefaults={preferences.writingDefaults} onAddDraft={addDraft} onUpdateDraft={updateDraft} onDeleteDraft={deleteDraft} onAddConcept={addConcept} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline} media={media} />;
      case 'practices':
        return <PracticesWorkspace practices={practices} concepts={concepts} media={media} questions={questions} positions={vault} drafts={drafts} onAddPractice={addPractice} onUpdatePractice={updatePractice} onDeletePractice={deletePractice} onAddConcept={addConcept} />;
      case 'settings':
        return (
          <SettingsPage
            user={user}
            profile={profile}
            preferences={preferences}
            goal={goal}
            goalProgress={goalProgress}
            onSaveProfile={saveProfile}
            onSavePreferences={savePreferences}
            onSaveGoal={saveGoal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Shell
      activeView={view}
      onViewChange={setView}
      counts={{ 
        concepts: concepts.length, 
        questions: questions.length, 
        media: media.length, 
        vault: vault.length, 
        drafts: drafts.length, 
        timeline: timeline.length, 
        practices: practices.length,
        annotations: allAnnotations(media).length
      }}
      goal={goal}
      goalProgress={goalProgress}
      onOpenSettings={() => setView('settings')}
    >
      {renderContent()}
      <Toaster />
    </Shell>
  );
}

function ReadexApp() {
  const { user, loading } = useUser();
  const [demoMode, setDemoMode] = useState(false);
  const allowDemo = process.env.NEXT_PUBLIC_ALLOW_PROTOTYPE_MODE === 'true';

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-accent" />
          <div className="font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Syncing Mind</div>
        </div>
      </div>
    );
  }

  if (!user && !demoMode) {
    return (
      <>
        <LoginPage allowDemo={allowDemo} onDemo={() => allowDemo && setDemoMode(true)} />
        <Toaster />
      </>
    );
  }

  return <ReadexWorkspace user={user} uid={user?.uid || PROTOTYPE_USER_ID} />;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [firebaseInstances, setFirebaseInstances] = useState<FirebaseInstances | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isFirebaseConfigComplete) return;
    try {
      setFirebaseInstances(initializeFirebase());
    } catch (error) {
      setInitError(error instanceof Error ? error.message : 'Firebase initialization failed.');
    }
  }, [mounted]);

  if (mounted && !isFirebaseConfigComplete) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-xl rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="font-code text-[10px] uppercase tracking-[0.22em] text-accent">Firebase setup required</div>
          <h1 className="mt-3 font-headline text-3xl font-semibold">Noesis needs your Firebase config.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add these missing variables to `.env.local`, then restart the dev server.
          </p>
          <div className="mt-5 rounded-xl bg-muted/60 p-4 font-code text-xs leading-6 text-muted-foreground">
            {missingFirebaseConfigKeys.map((key) => <div key={key}>{key}</div>)}
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} size="sm" className="mt-6 rounded-full">
            <RefreshCw className="mr-2 size-3.5" /> Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (mounted && initError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="max-w-xl rounded-2xl border border-destructive/30 bg-card p-8 shadow-sm">
          <div className="font-code text-[10px] uppercase tracking-[0.22em] text-destructive">Firebase failed to start</div>
          <h1 className="mt-3 font-headline text-3xl font-semibold">Check your Firebase settings.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{initError}</p>
          <Button variant="outline" onClick={() => window.location.reload()} size="sm" className="mt-6 rounded-full">
            <RefreshCw className="mr-2 size-3.5" /> Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!mounted || !firebaseInstances) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-6">
          <div className="font-code text-[10px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Initializing Noesis...</div>
          <Button variant="outline" onClick={() => window.location.reload()} size="sm" className="rounded-full">
            <RefreshCw className="size-3.5 mr-2" /> Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FirebaseClientProvider firebaseApp={firebaseInstances.firebaseApp} firestore={firebaseInstances.firestore} auth={firebaseInstances.auth}>
      <ReadexApp />
    </FirebaseClientProvider>
  );
}
