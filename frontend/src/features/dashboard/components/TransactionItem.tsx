import { format } from 'date-fns';
import { Transaction } from '@/store/useWalletStore';

interface TransactionItemProps {
  transaction: Transaction;
  currentUserId?: string;
  delay?: number;
}

export function TransactionItem({ transaction, currentUserId, delay = 0 }: TransactionItemProps) {
  const isCredit = 
    transaction.type === 'deposit' || 
    transaction.type === 'received' || 
    transaction.type === 'stripe_charge';
    
  const isDebit = !isCredit;
  
  const amountPrefix = isCredit ? '+' : '-';
  const amountColor = isCredit ? 'text-emerald-500' : 'text-foreground';
  
  // Format description based on type
  let title = transaction.description || transaction.type;
  if (transaction.type === 'sent') {
    title = `Transfer to ${transaction.toEmail}`;
  } else if (transaction.type === 'received') {
    title = `Received from ${transaction.fromEmail}`;
  } else if (transaction.type === 'deposit') {
    title = 'Wallet Deposit';
  }

  return (
    <div 
      className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
          {isCredit ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.timestamp || transaction.createdAt || new Date()), 'MMM d, yyyy h:mm a')}
            </p>
            {transaction.aiCategory && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {transaction.aiCategory}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={`font-semibold ${amountColor}`}>
        {amountPrefix}₹{Number(transaction.amount).toFixed(2)}
      </div>
    </div>
  );
}
