
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
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, orderBy } from 'firebase/firestore';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';

function LoginScreen() {
  const { auth } = useFirebase();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="size-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="size-8" />
          </div>
          <CardTitle className="text-3xl font-headline italic">Readex.</CardTitle>
          <p className="text-muted-foreground font-body">Personal Philosophy OS</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Scholastic Identity (Email)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passphrase</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-destructive text-xs font-code">{error}</p>}
            <Button type="submit" className="w-full">
              {isLogin ? <><LogIn className="size-4 mr-2" /> Enter Vault</> : <><UserPlus className="size-4 mr-2" /> Create Identity</>}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="outline" onClick={handleGoogle} className="w-full">
              Sign in with Google
            </Button>
            <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} className="w-full text-xs font-code uppercase">
              {isLogin ? "Need an identity? Create one" : "Already have an identity? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadexApp() {
  const { user } = useUser();
  const { db } = useFirebase();
  const [view, setView] = useState('atlas');

  // Firebase Queries
  const mediaRef = user && db ? collection(db, 'users', user.uid, 'media') : null;
  const vaultRef = user && db ? collection(db, 'users', user.uid, 'vault') : null;
  const conceptsRef = user && db ? collection(db, 'users', user.uid, 'concepts') : null;
  const questionsRef = user && db ? collection(db, 'users', user.uid, 'questions') : null;
  const timelineRef = user && db ? collection(db, 'users', user.uid, 'timeline') : null;
  const draftsRef = user && db ? collection(db, 'users', user.uid, 'drafts') : null;

  const { data: media = [] } = useCollection(mediaRef);
  const { data: vault = [] } = useCollection(vaultRef);
  const { data: concepts = [] } = useCollection(conceptsRef);
  const { data: questions = [] } = useCollection(questionsRef);
  const { data: timeline = [] } = useCollection(timelineRef);
  const { data: drafts = [] } = useCollection(draftsRef);

  if (!user) return <LoginScreen />;

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
