
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
import { collection } from 'firebase/firestore';

const PROTOTYPE_USER_ID = "anonymous-scholar";

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');

  // Use the authenticated user's ID if available, otherwise fall back to a prototype ID
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

  const renderContent = () => {
    switch (view) {
      case 'atlas':
        return <ConceptAtlas concepts={concepts as any} onAddConcept={() => {}} />;
      case 'library':
        return <MediaLibrary media={media as any} onAddMedia={() => {}} onSelectMedia={() => {}} />;
      case 'vault':
        return <BeliefVault entries={vault as any} onAddEntry={() => {}} onSelectEntry={() => {}} />;
      case 'questions':
        return <QuestionsWorkspace questions={questions as any} onAddQuestion={() => {}} onSelectQuestion={() => {}} />;
      case 'evolution':
        return <EvolutionTimeline events={timeline as any} />;
      case 'writing':
        return <Atelier drafts={drafts as any} media={media as any} vault={vault as any} onAddDraft={() => {}} />;
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
