'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/store/useWalletStore';
import api from '@/lib/api';

export default function TransferPage() {
  const router = useRouter();
  const { balance } = useWalletStore();
  const [toEmail, setToEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    
    if (!toEmail || !numAmount || numAmount <= 0) return;

    if (numAmount > Number(balance)) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await api.post('/transfer/send', { 
        toEmail, 
        amount: numAmount,
        description: note 
      });
      alert('Money sent successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Failed to send money', err);
      setError(err.response?.data?.error?.message || 'Failed to send money');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Send Money</h2>
        <p className="text-muted-foreground mt-1">
          Transfer funds instantly to anyone on PayFlow.
        </p>
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transfer Details</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">
              Balance: ₹{Number(balance).toFixed(2)}
            </span>
          </div>
          <CardDescription>Enter recipient details and amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTransfer} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="toEmail">Recipient Email</Label>
              <Input 
                id="toEmail"
                type="email" 
                placeholder="friend@example.com"
                className="h-12 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                <Input 
                  id="amount"
                  type="number" 
                  min="1"
                  max="1000000"
                  placeholder="500"
                  className="pl-8 h-12 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Input 
                id="note"
                type="text" 
                placeholder="Dinner split"
                className="h-12 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <div className="text-sm font-medium text-destructive mt-2">{error}</div>}
            
            <Button type="submit" disabled={isLoading || !amount || !toEmail} className="w-full h-12 text-lg rounded-xl mt-4">
              {isLoading ? 'Sending...' : 'Send Money'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
