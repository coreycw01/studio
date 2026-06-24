
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Loader2, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import placeholderData from '@/app/lib/placeholder-images.json';

interface LoginPageProps {
  allowDemo: boolean;
  onDemo: () => void;
}

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'your current domain';

  if (code.includes('auth/invalid-credential')) return 'Email or password was not recognized.';
  if (code.includes('auth/email-already-in-use')) return 'That email already has a Noesis account.';
  if (code.includes('auth/weak-password')) return 'Use at least 6 characters for your password.';
  if (code.includes('auth/popup-closed-by-user')) return 'Google sign-in was closed before it finished.';
  if (code.includes('auth/operation-not-allowed')) return 'This sign-in method is not enabled in Firebase Auth. Please enable it in your Firebase Console.';
  if (code.includes('auth/user-not-found')) return 'No account found with this email.';
  if (code.includes('auth/wrong-password')) return 'Incorrect password.';
  if (code.includes('auth/unauthorized-domain')) {
    return `DOMAIN_ERROR: ${hostname}`;
  }
  return 'Authentication failed. Check your details or Firebase configuration and try again.';
}

export function LoginPage({ allowDemo, onDemo }: LoginPageProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'reset' | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const logoData = placeholderData?.placeholderImages?.find(img => img.id === 'app-logo');

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorStatus(null);
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Input Required', description: 'Please enter both your email and password.' });
      return;
    }
    setBusy('email');
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) await updateProfile(credential.user, { displayName: displayName.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error: any) {
      const msg = authMessage(error);
      setErrorStatus(msg);
      if (!msg.startsWith('DOMAIN_ERROR')) {
        toast({ 
          variant: 'destructive',
          title: mode === 'signup' ? 'Account not created' : 'Sign in failed', 
          description: msg
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const signInGoogle = async () => {
    setErrorStatus(null);
    setBusy('google');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const msg = authMessage(error);
      setErrorStatus(msg);
      if (!msg.startsWith('DOMAIN_ERROR')) {
        toast({ 
          variant: 'destructive',
          title: 'Google sign in failed', 
          description: msg
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async () => {
    setErrorStatus(null);
    if (!email.trim()) {
      toast({ title: 'Email required', description: 'Enter your email first, then request a password reset.' });
      return;
    }
    setBusy('reset');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.' });
    } catch (error) {
      const msg = authMessage(error);
      setErrorStatus(msg);
      if (!msg.startsWith('DOMAIN_ERROR')) {
        toast({ 
          variant: 'destructive',
          title: 'Reset failed', 
          description: msg
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const isDomainError = errorStatus?.startsWith('DOMAIN_ERROR');
  const unauthorizedHostname = isDomainError ? errorStatus?.split(': ')[1] : '';

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[1.05fr_.95fr] overflow-hidden">
      <section className="relative hidden lg:flex flex-col justify-between border-r border-border bg-sidebar p-12 text-sidebar-foreground">
        <div>
          <div className="flex items-center gap-4">
            <div className="relative size-12 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
              {logoData && (
                <Image
                  src={logoData.imageUrl}
                  alt={logoData.description}
                  width={48}
                  height={48}
                  className="object-cover"
                  data-ai-hint={logoData.imageHint}
                />
              )}
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
            <div className="flex items-center gap-4 mb-6">
              <div className="relative size-10 overflow-hidden rounded-lg bg-accent/10">
                {logoData && (
                  <Image
                    src={logoData.imageUrl}
                    alt={logoData.description}
                    width={40}
                    height={40}
                    className="object-cover"
                    data-ai-hint={logoData.imageHint}
                  />
                )}
              </div>
              <h1 className="font-headline text-4xl font-bold">Noesis<span className="text-accent">.</span></h1>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="font-headline text-3xl font-semibold italic">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === 'signup' ? 'Start a private Noesis workspace.' : 'Sign in to continue your research.'}
              </p>
            </div>

            {isDomainError && (
              <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 font-body shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold uppercase font-code text-[10px] tracking-wider">
                  <ShieldAlert className="size-4" /> Action Required
                </div>
                <p className="italic leading-relaxed">
                  Firebase is blocking authentication from this domain. To fix this:
                </p>
                <ol className="mt-3 space-y-2 list-decimal list-inside opacity-90">
                  <li>Go to your <strong>Firebase Console</strong>.</li>
                  <li>Navigate to <strong>Authentication &gt; Settings</strong>.</li>
                  <li>Click <strong>Authorized Domains</strong>.</li>
                  <li>Add this domain: <code className="bg-white/50 px-1.5 py-0.5 rounded font-code text-[11px] select-all">{unauthorizedHostname}</code></li>
                </ol>
              </div>
            )}

            <form onSubmit={submitEmail} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Full Name" className="h-11" />
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
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(event) => setPassword(event.target.value)} 
                    placeholder="********" 
                    className="h-11 pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full rounded-full font-bold shadow-lg shadow-accent/20" disabled={busy !== null}>
                {busy === 'email' && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" onClick={signInGoogle} disabled={busy !== null} className="h-11 w-full rounded-full bg-card font-bold border-border/60 shadow-sm">
              {busy === 'google' && <Loader2 className="mr-2 size-4 animate-spin" />}
              Continue with Google
            </Button>

            <div className="mt-8 flex flex-col gap-3 text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                className="text-muted-foreground hover:text-foreground font-medium"
              >
                {mode === 'signup' ? 'Already have an account? Sign in.' : 'New to Noesis? Create an account.'}
              </button>
              {allowDemo && (
                <button type="button" onClick={onDemo} className="text-xs text-muted-foreground hover:text-accent font-code tracking-widest uppercase mt-2">
                  Demo Prototype
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
