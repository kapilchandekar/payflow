'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import Link from 'next/link';

const registerSchema = z.object({
  firstName: z.string().min(2, { message: 'First name must be at least 2 characters' }),
  lastName: z.string().min(2, { message: 'Last name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),

});

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      setError('');
      await api.post('/auth/register', {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        password: values.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

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
          <h2 className="text-xl font-semibold text-accent mb-2">Registration Successful!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ve sent a verification email to your inbox. Please verify your account before signing in.
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
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4 animate-pulse-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          PayFlow
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Intelligent Finance Platform</p>
      </div>

      {/* Card */}
      <div className="glass-card rounded-2xl p-8 shadow-xl shadow-primary/5 border border-border/50">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Start managing your finances with AI</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">First Name</FormLabel>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300">
                      <Input
                        placeholder="John"
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
              name="lastName"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">Last Name</FormLabel>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300">
                      <Input
                        placeholder="Doe"
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
              name="email"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">Email Address</FormLabel>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300">
                      <Input
                        placeholder="you@example.com"
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
              name="password"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-300" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
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
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground/70 animate-fade-in delay-500" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>Your data is protected with bank-grade security</span>
      </div>
    </div>
  );
}
