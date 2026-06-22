
"use client";

import React, { useState, useEffect } from 'react';
import { 
  useFirebase, 
  useUser, 
  useCollection, 
  FirebaseClientProvider,
  initializeFirebase 
} from '@/firebase';
import { Shell } from '@/components/Shell';
import { ConceptAtlas } from '@/components/Atlas/ConceptAtlas';
import { MediaLibrary } from '@/components/Library/MediaLibrary';
import { BeliefVault } from '@/components/Vault/BeliefVault';
import { Atelier } from '@/components/Writing/Atelier';
import { QuestionsWorkspace } from '@/components/Questions/QuestionsWorkspace';
import { EvolutionTimeline } from '@/components/Evolution/EvolutionTimeline';
import { collection, addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PROTOTYPE_USER_ID = "anonymous-scholar";

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [view, setView] = useState('atlas');

  const effectiveUid = user?.uid || PROTOTYPE_USER_ID;

  // Firebase Queries
  const mediaRef = db ? collection(db, 'users', effectiveUid, 'media') : null;
  const vaultRef = db ? collection(db, 'users', effectiveUid, 'vault') : null;
  const conceptsRef = db ? collection(db, 'users', effectiveUid, 'concepts') : null;
  const questionsRef = db ? collection(db, 'users', effectiveUid, 'questions') : null;
  const timelineRef = db ? collection(db, 'users', effectiveUid, 'timeline') : null;
  const draftsRef = db ? collection(db, 'users', effectiveUid, 'drafts') : null;

  const { data: media = [] } = useCollection(mediaRef);
  const { data: vault = [] } = useCollection(vaultRef);
  const { data: concepts = [] } = useCollection(conceptsRef);
  const { data: questions = [] } = useCollection(questionsRef);
  const { data: timeline = [] } = useCollection(timelineRef);
  const { data: drafts = [] } = useCollection(draftsRef);

  const handleAddMedia = (data: any) => {
    if (!mediaRef) return;
    addDoc(mediaRef, {
      ...data,
      annotations: [],
      tags: [],
      status: 'Want to Read',
      capture: { sessions: [] },
      dateAdded: new Date().toISOString()
    }).catch(async (err) => {
      const permsError = new FirestorePermissionError({ path: mediaRef.path, operation: 'create', requestResourceData: data });
      errorEmitter.emit('permission-error', permsError);
    });
  };

  const handleAddVaultEntry = (data: any) => {
    if (!vaultRef) return;
    addDoc(vaultRef, {
      ...data,
      status: 'active',
      confidence: 3,
      tags: [],
      sourceIds: [],
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString()
    });
  };

  const handleAddConcept = (data: any) => {
    if (!conceptsRef) return;
    addDoc(conceptsRef, {
      ...data,
      links: [],
      dateCreated: new Date().toISOString(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    });
  };

  const handleAddQuestion = (data: any) => {
    if (!questionsRef) return;
    addDoc(questionsRef, {
      ...data,
      status: 'open',
      evidenceIds: [],
      conceptIds: [],
      dateCreated: new Date().toISOString()
    });
  };

  const handleAddDraft = (data: any) => {
    if (!draftsRef) return;
    addDoc(draftsRef, {
      ...data,
      body: '',
      status: 'seed',
      conceptTags: [],
      sourceIds: [],
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString()
    });
  };

  const renderContent = () => {
    switch (view) {
      case 'atlas':
        return <ConceptAtlas concepts={concepts as any} onAddConcept={handleAddConcept} />;
      case 'library':
        return <MediaLibrary media={media as any} onAddMedia={handleAddMedia} onSelectMedia={() => {}} />;
      case 'vault':
        return <BeliefVault entries={vault as any} onAddEntry={handleAddVaultEntry} onSelectEntry={() => {}} />;
      case 'questions':
        return <QuestionsWorkspace questions={questions as any} onAddQuestion={handleAddQuestion} onSelectQuestion={() => {}} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline as any} />;
      case 'writing':
        return <Atelier drafts={drafts as any} media={media as any} vault={vault as any} onAddDraft={handleAddDraft} />;
      default:
        return <div className="p-20 text-center font-headline italic text-2xl">Restoring archival section...</div>;
    }
  };

  return (
    <Shell 
      activeView={view} 
      onViewChange={setView} 
      mediaCount={media.filter(m => (m as any).status === 'Finished').length}
    >
      {renderContent()}
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
    <FirebaseClientProvider 
      firebaseApp={firebaseConfig.firebaseApp}
      firestore={firebaseConfig.firestore}
      auth={firebaseConfig.auth}
    >
      <ReadexApp />
    </FirebaseClientProvider>
  );
}
