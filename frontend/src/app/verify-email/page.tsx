'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/utils';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token. Please check your email link.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (err: any) {
        setErrorMessage(extractErrorMessage(err, 'Verification failed. The link may have expired.'));
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in-up">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-muted-foreground font-medium">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="animate-fade-in-up text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 shadow-inner shadow-green-500/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Your account has been successfully verified. You can now access all features of PayFlow.
        </p>
        <Link href="/login">
          <Button className="w-full max-w-[200px] h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30">
            Continue to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4 shadow-inner shadow-red-500/20">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {errorMessage}
      </p>
      <Link href="/login">
        <Button variant="outline" className="w-full max-w-[200px] h-11 rounded-xl border-border/60">
          Back to Login
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-xl shadow-primary/5 border border-border/50">
          <Suspense fallback={
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
