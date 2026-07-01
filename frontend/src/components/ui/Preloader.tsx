import { Loader2 } from 'lucide-react';

export function Preloader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 mb-4 animate-pulse-glow flex items-center justify-center relative z-10 shadow-lg shadow-primary/20">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
      <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mt-4">
        PayFlow
      </h2>
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
    </div>
  );
}
