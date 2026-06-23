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
import { PracticesWorkspace } from '@/components/Practices/PracticesWorkspace';
import { Toaster } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MEDIA_LABELS, MEDIA_TYPES, conceptKey, ensureConceptTerms, normalizeConceptTags, today } from '@/lib/readex';
import { DEFAULT_ATLAS_NODE_SETTINGS, DEFAULT_ATLAS_VIEW_SETTINGS, DEFAULT_GOAL_SETTINGS, PROTOTYPE_USER_ID, readexRefs, readexSchemaDoc } from '@/lib/firestore-schema';
import type { Concept, Draft, GoalSettings, Insight, Media, MediaType, Practice, Question, TimelineEvent, VaultEntry } from '@/lib/types';
import { addDoc, deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch, type DocumentData, type DocumentReference } from 'firebase/firestore';

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');
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
      sourceIds: [],
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
    sourceIds: data.sourceIds || [],
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
    await createTimelineEvent({ entityId: created.id, entityType: 'media', entityTitle: data.title, eventType: 'created', reason: 'Source added to Noesis' });
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
    });
    await createTimelineEvent({ entityId: created.id, entityType: 'vault', entityTitle: data.title, eventType: 'created', reason: 'Position formed', influencedBy: data.sourceIds });
  };
  const updateVaultEntry = async (entry: VaultEntry) => {
    await ensureConcepts(entry.tags || []);
    await updateDoc(doc(refs.vault, entry.id), entry as any);
    await createTimelineEvent({ entityId: entry.id, entityType: 'vault', entityTitle: entry.title, eventType: 'refined', reason: 'Position refined', influencedBy: entry.sourceIds });
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
    batch.set(eventRef, { entityId: beliefRef.id, entityType: 'vault', entityTitle: data.title, eventType: 'created', reason: 'Idea formed as position', influencedBy: data.sourceIds || [], date: today() });
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
    await createTimelineEvent({ entityId: created.id, entityType: 'draft', entityTitle: data.title, eventType: 'created', reason: 'Work draft created' });
  };
  const updateDraft = async (draft: Draft) => {
    await ensureConcepts(draft.conceptTags || []);
    await updateDoc(doc(refs.drafts, draft.id), draft as any);
  };
  const deleteDraft = (id: string) => deleteDoc(doc(refs.drafts, id));

  const addPractice = async (data: Partial<Practice>) => {
    const conceptTags = normalizeConceptTags(data.conceptTags);
    await ensureConcepts(conceptTags);
    const created = await addDoc(refs.practices, {
      title: data.title || 'Untitled Practice',
      description: data.description || '',
      type: data.type || 'experiment',
      status: data.status || 'planned',
      durationDays: data.durationDays || 7,
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      conceptTags,
      sourceIds: data.sourceIds || [],
      questionIds: data.questionIds || [],
      positionIds: data.positionIds || [],
      draftIds: data.draftIds || [],
      notes: data.notes || '',
      dateCreated: today(),
      dateUpdated: today(),
    });
    await createTimelineEvent({ entityId: created.id, entityType: 'practice', entityTitle: data.title, eventType: 'created', reason: 'Practice created', influencedBy: [...(data.sourceIds || []), ...(data.positionIds || []), ...(data.draftIds || [])] });
  };

  const updatePractice = async (practice: Practice) => {
    await ensureConcepts(practice.conceptTags || []);
    await updateDoc(doc(refs.practices, practice.id), { ...practice, dateUpdated: today() } as any);
    await createTimelineEvent({ entityId: practice.id, entityType: 'practice', entityTitle: practice.title, eventType: practice.status === 'completed' ? 'revised' : 'refined', reason: 'Practice updated', influencedBy: [...(practice.sourceIds || []), ...(practice.positionIds || []), ...(practice.draftIds || [])] });
  };

  const deletePractice = (id: string) => deleteDoc(doc(refs.practices, id));

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
        return <ConceptAtlas concepts={concepts} media={media} insights={insights} vault={vault} drafts={drafts} practices={practices} questions={questions} timeline={timeline} onAddConcept={addConcept} onUpdateConcept={updateConcept} />;
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
        return <MediaLibrary media={media} concepts={concepts} vault={vault} onAddMedia={addMedia} onUpdateMedia={updateMedia} onDeleteMedia={deleteMedia} onAddConcept={addConcept} />;
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
      case 'practices':
        return <PracticesWorkspace practices={practices} media={media} questions={questions} positions={vault} drafts={drafts} concepts={concepts} onAddPractice={addPractice} onUpdatePractice={updatePractice} onDeletePractice={deletePractice} onAddConcept={(data) => addConcept(data)} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline} media={media} />;
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
      counts={{ concepts: concepts.length, questions: questions.length, media: media.length, vault: vault.length, drafts: drafts.length, practices: practices.length, timeline: timeline.length }}
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
              <Button variant="ghost" onClick={() => setGoalOpen(false)} className="h-12 px-8 font-code text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent">CLOSE</Button>
              <Button onClick={saveGoal} className="h-12 px-10 bg-accent font-code text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20">SAVE CHANGES</Button>
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
