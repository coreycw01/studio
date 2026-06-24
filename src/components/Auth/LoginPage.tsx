"use client";

import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LoginPageProps {
  allowDemo: boolean;
  onDemo: () => void;
}

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  if (code.includes('auth/invalid-credential')) return 'Email or password was not recognized.';
  if (code.includes('auth/email-already-in-use')) return 'That email already has a Noesis account.';
  if (code.includes('auth/weak-password')) return 'Use at least 6 characters for your password.';
  if (code.includes('auth/popup-closed-by-user')) return 'Google sign-in was closed before it finished.';
  if (code.includes('auth/operation-not-allowed')) return 'This sign-in method is not enabled in Firebase Auth yet.';
  return 'Authentication failed. Check your details and try again.';
}

export function LoginPage({ allowDemo, onDemo }: LoginPageProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | 'reset' | null>(null);

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setBusy('email');
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) await updateProfile(credential.user, { displayName: displayName.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      toast({ title: mode === 'signup' ? 'Account not created' : 'Sign in failed', description: authMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const signInGoogle = async () => {
    setBusy('google');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      toast({ title: 'Google sign in failed', description: authMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      toast({ title: 'Email required', description: 'Enter your email first, then request a password reset.' });
      return;
    }
    setBusy('reset');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Reset email sent', description: 'Check your inbox for the password reset link.' });
    } catch (error) {
      toast({ title: 'Reset failed', description: authMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[1.05fr_.95fr] overflow-hidden">
      <section className="relative hidden lg:flex flex-col justify-between border-r border-border bg-sidebar p-12 text-sidebar-foreground">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
              <BookOpen className="size-5 text-accent" />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-bold text-white">Noesis<span className="text-accent">.</span></h1>
              <p className="font-code text-[10px] uppercase tracking-[0.18em] text-white/35">Turn thought into understanding.</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="font-headline text-5xl italic leading-tight text-white/90">
            Build a workspace where study, belief, and growth become a living philosophy.
          </p>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/45">
            Sign in to keep your library, inquiries, writing, and personal atlas connected to your private workspace.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 font-code text-[9px] uppercase tracking-widest text-white/35">
          <span>Atlas</span>
          <span>Positions</span>
          <span>Works</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <h1 className="font-headline text-4xl font-bold">Noesis<span className="text-accent">.</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">Turn thought into understanding.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="font-headline text-3xl font-semibold italic">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === 'signup' ? 'Start a private Noesis workspace backed by Firebase.' : 'Sign in to continue testing your Noesis workspace.'}
              </p>
            </div>

            <form onSubmit={submitEmail} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Corey" className="h-11" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  {mode === 'signin' && (
                    <button type="button" onClick={resetPassword} className="text-xs text-muted-foreground hover:text-accent">
                      Reset
                    </button>
                  )}
                </div>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" className="h-11" />
              </div>

              <Button type="submit" className="h-11 w-full rounded-full font-bold" disabled={busy !== null}>
                {busy === 'email' && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" onClick={signInGoogle} disabled={busy !== null} className="h-11 w-full rounded-full bg-card font-bold">
              {busy === 'google' && <Loader2 className="mr-2 size-4 animate-spin" />}
              Continue with Google
            </Button>

            <div className="mt-7 flex flex-col gap-3 text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                className="text-muted-foreground hover:text-foreground"
              >
                {mode === 'signup' ? 'Already have an account? Sign in.' : 'New to Noesis? Create an account.'}
              </button>
              {allowDemo && (
                <button type="button" onClick={onDemo} className="text-xs text-muted-foreground hover:text-accent">
                  Continue in prototype demo mode
                </button>
              )}
            </div>
          </div>

          <p className={cn('mt-6 text-center text-xs leading-5 text-muted-foreground', !allowDemo && 'opacity-70')}>
            Enable Email/Password and Google providers in Firebase Auth before production testing.
          </p>
        </div>
      </section>
    </div>
  );
}