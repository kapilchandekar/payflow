'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import Link from 'next/link';
import { Suspense } from 'react';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    try {
      setError('');
      await api.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to reset password'));
    }
  };

  if (!token) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-xl border border-destructive/20 text-center animate-fade-in-up">
        <h2 className="text-xl font-semibold text-destructive mb-2">Invalid Link</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This password reset link is invalid or missing the required token.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="rounded-xl border-border/60">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PayFlow
          </h1>
        </div>
        <div className="glass-card rounded-2xl p-8 shadow-xl shadow-primary/5 border border-border/50 text-center">
          <h2 className="text-xl font-semibold text-accent mb-2">Password Reset!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your password has been successfully reset.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4 animate-pulse-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          PayFlow
        </h1>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-xl shadow-primary/5 border border-border/50">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Set new password</h2>
          <p className="text-sm text-muted-foreground mt-1">Please enter your new password below.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">New Password</FormLabel>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300">
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-background transition-colors duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300">
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-background transition-colors duration-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="flex justify-center p-8">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
