'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// Use env var or fallback to a Stripe test publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function CheckoutForm({ amount, onSuccess }: { amount: number, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'An error occurred');
        setIsProcessing(false);
        return;
      }

      // First confirm payment with Stripe
      const { paymentIntent, error: confirmError } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Then tell our backend to confirm and add balance
        await api.post('/payment/confirm', {
          paymentIntentId: paymentIntent.id,
          amount: amount,
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <div className="text-sm font-medium text-destructive">{error}</div>}
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full h-12 text-lg rounded-xl"
      >
        {isProcessing ? 'Processing...' : `Pay ₹${amount}`}
      </Button>
    </form>
  );
}

export default function AddMoneyPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsLoading(true);
    try {
      const res = await api.post('/payment/create-intent', { amount: numAmount });
      setClientSecret(res.data.clientSecret);
    } catch (err: any) {
      console.error('Failed to create intent', err);
      alert(err.response?.data?.error?.message || 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Add Money</h2>
        <p className="text-muted-foreground mt-1">
          Top up your wallet balance.
        </p>
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle>Deposit Details</CardTitle>
          <CardDescription>Enter amount to add via credit or debit card.</CardDescription>
        </CardHeader>
        <CardContent>
          {!clientSecret ? (
            <form onSubmit={handleCreateIntent} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input 
                    id="amount"
                    type="number" 
                    min="1"
                    max="1000000"
                    placeholder="1000"
                    className="pl-8 h-14 text-lg rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !amount} className="w-full h-12 text-lg rounded-xl">
                {isLoading ? 'Preparing...' : 'Continue to Payment'}
              </Button>
            </form>
          ) : (
            <div className="animate-fade-in">
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm 
                  amount={Number(amount)} 
                  onSuccess={() => {
                    alert('Money added successfully!');
                    router.push('/dashboard');
                  }} 
                />
              </Elements>
              <Button 
                variant="ghost" 
                className="w-full mt-4" 
                onClick={() => setClientSecret(null)}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
