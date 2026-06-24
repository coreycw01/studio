
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
import { SourceIndex } from '@/components/Library/SourceIndex';
import { AnnotationsIndex } from '@/components/Library/AnnotationsIndex';
import { BeliefVault } from '@/components/Vault/BeliefVault';
import { Atelier } from '@/components/Writing/Atelier';
import { QuestionsWorkspace } from '@/components/Questions/QuestionsWorkspace';
import { EvolutionTimeline } from '@/components/Evolution/EvolutionTimeline';
import { PracticesWorkspace } from '@/components/Practices/PracticesWorkspace';
import { Toaster } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MEDIA_LABELS, MEDIA_TYPES, allAnnotations, conceptKey, ensureConceptTerms, normalizeConceptTags, today } from '@/lib/readex';
import { DEFAULT_ATLAS_NODE_SETTINGS, DEFAULT_ATLAS_VIEW_SETTINGS, DEFAULT_GOAL_SETTINGS, PROTOTYPE_USER_ID, readexRefs, readexSchemaDoc } from '@/lib/firestore-schema';
import type { Annotation, AtlasMap, Concept, Draft, GoalSettings, Insight, Media, MediaType, Practice, Question, TimelineEvent, VaultEntry, SecurityRuleContext } from '@/lib/types';
import { doc, getDoc, setDoc, updateDoc, writeBatch, deleteDoc, type DocumentData, type DocumentReference } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');
  const [focusedSourceId, setFocusedSourceId] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalSettings>(DEFAULT_GOAL_SETTINGS);
  const effectiveUid = user?.uid || PROTOTYPE_USER_ID;

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
  const goal = { ...DEFAULT_GOAL_SETTINGS, ...(goalDoc || {}) };

  useEffect(() => setGoalDraft(goal), [goalDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const setDefaultIfMissing = async (ref: DocumentReference<DocumentData>, data: DocumentData) => {
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) await setDoc(ref, data);
    };

    const scaffoldFirestore = async () => {
      await setDoc(refs.user, { uid: effectiveUid, app: 'readex', updatedAt: today() }, { merge: true });
      await setDefaultIfMissing(refs.settingsGoal, DEFAULT_GOAL_SETTINGS);
      await setDefaultIfMissing(refs.settingsAtlasView, DEFAULT_ATLAS_VIEW_SETTINGS);
      await setDefaultIfMissing(refs.settingsAtlasNodes, DEFAULT_ATLAS_NODE_SETTINGS);
      await setDoc(refs.settingsSchema, readexSchemaDoc(effectiveUid), { merge: true });
    };

    scaffoldFirestore().catch((error) => {
      console.warn('Unable to scaffold Noesis Firestore settings', error);
    });
  }, [effectiveUid, refs.settingsAtlasNodes, refs.settingsAtlasView, refs.settingsGoal, refs.settingsSchema, refs.user]);

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
      type: data.type || 'essay',
      status: data.status || 'seed',
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
        return <Atelier drafts={drafts} media={media} vault={vault} questions={questions} concepts={concepts} onAddDraft={addDraft} onUpdateDraft={updateDraft} onDeleteDraft={deleteDraft} onAddConcept={addConcept} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline} media={media} />;
      case 'practices':
        return <PracticesWorkspace practices={practices} concepts={concepts} media={media} questions={questions} positions={vault} drafts={drafts} onAddPractice={addPractice} onUpdatePractice={updatePractice} onDeletePractice={deletePractice} onAddConcept={addConcept} />;
      default:
        return null;
    }
  };

  const activeGoalRows = goal.types.map((type) => ({
    type,
    done: goalProgress[type] || 0,
    target: goal.targets[type] || 12
  }));

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
      onEditGoal={() => setGoalOpen(true)}
    >
      {renderContent()}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white font-body">
          <Tabs defaultValue="progress" className="w-full">
            <div className="p-8 pb-4">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-4xl font-headline italic mb-2">Source Goals</DialogTitle>
                <TabsList className="bg-muted/50 w-full justify-start h-9 p-1">
                  <TabsTrigger value="progress" className="text-[10px] font-code uppercase tracking-widest px-6 h-7">Detailed Progress</TabsTrigger>
                  <TabsTrigger value="settings" className="text-[10px] font-code uppercase tracking-widest px-6 h-7">Edit Targets</TabsTrigger>
                </TabsList>
              </DialogHeader>

              <div className="min-h-[400px]">
                <TabsContent value="progress" className="m-0 focus-visible:ring-0">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                      {activeGoalRows.map((row) => (
                        <div key={row.type} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-code text-[11px] font-bold uppercase tracking-widest text-primary/80">{MEDIA_LABELS[row.type]}</span>
                            <span className="font-code text-[12px] font-bold text-accent">{row.done} / {row.target}</span>
                          </div>
                          <Progress value={(row.done / Math.max(1, row.target)) * 100} className="h-2 bg-muted/40" />
                          <p className="text-[10px] text-muted-foreground uppercase font-code tracking-tighter">
                            {row.target - row.done > 0 ? `${row.target - row.done} remaining for ${goalDraft.label}` : 'Goal achieved!'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="m-0 focus-visible:ring-0">
                  <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                      <Label className="readex-kicker uppercase">GOAL LABEL</Label>
                      <Input value={goalDraft.label} onChange={(event) => setGoalDraft((prev) => ({ ...prev, label: event.target.value }))} className="h-12 border-border/60 bg-white shadow-sm font-body text-base" />
                    </div>
                    <Separator className="bg-border/40" />
                    <div className="space-y-4">
                      <Label className="readex-kicker uppercase">TARGETS BY TYPE</Label>
                      <ScrollArea className="h-[240px] pr-4">
                        <div className="space-y-3">
                          {MEDIA_TYPES.map((type) => (
                            <div key={type} className="grid grid-cols-[auto_1fr_90px] gap-4 items-center p-3 rounded-lg border border-border/30 bg-muted/5 transition-colors hover:bg-muted/10">
                              <input
                                type="checkbox"
                                checked={goalDraft.types.includes(type)}
                                onChange={(event) => setGoalDraft((prev) => ({ ...prev, types: event.target.checked ? [...prev.types, type] : prev.types.filter((t) => t !== type) }))}
                                className="accent-accent size-4"
                              />
                              <span className="font-code text-[10px] font-bold uppercase tracking-wider text-primary/70">{MEDIA_LABELS[type]}</span>
                              <Input type="number" min={1} value={goalDraft.targets[type] || 12} onChange={(event) => setGoalDraft((prev) => ({ ...prev, targets: { ...prev.targets, [type]: Math.max(1, Number(event.target.value) || 1) } }))} className="h-8 text-xs font-code text-right" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>

            <div className="p-8 pt-4 bg-muted/10 border-t flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setGoalOpen(false)} className="h-12 px-8 font-code text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent">CLOSE</Button>
              <Button onClick={saveGoal} className="h-12 px-10 bg-accent font-code text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20">SAVE CHANGES</Button>
            </div>
          </Tabs>
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
