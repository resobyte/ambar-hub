import { Metadata } from 'next';
import { PackClient } from './PackClient';

export const metadata: Metadata = {
  title: 'Paketlemeye Başla',
};

export default function PackPage() {
  return <PackClient />;
}
