import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to login since landing page is out of scope for auth phase
  redirect('/login');
}
