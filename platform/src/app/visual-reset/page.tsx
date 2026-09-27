import type { Metadata } from 'next';
import VisualProof from './proof';

export const metadata: Metadata = {
  title: 'Varathans25 · Visual direction / private review',
  description: 'An isolated visual proof. No transactions or live services.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VisualProof />;
}
