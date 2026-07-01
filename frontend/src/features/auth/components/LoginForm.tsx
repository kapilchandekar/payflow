'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setError('');
      const response = await api.post('/auth/login', values);
      const { user, token } = response.data.data || response.data;
      login(user, token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Invalid credentials. Please try again.'));
    }
  };

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
          <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
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
                <FormItem className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors duration-200"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="input-glow rounded-xl transition-all duration-300 relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-background transition-colors duration-200 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
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
                  Signing in...
                </span>
              ) : (
                'Sign In'
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
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground/70 animate-fade-in delay-500" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Secured with 256-bit encryption</span>
      </div>
    </div>
  );
}
