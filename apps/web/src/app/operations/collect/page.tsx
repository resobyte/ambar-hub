import { Metadata } from 'next';
import { CollectClient } from './CollectClient';

export const metadata: Metadata = {
  title: 'Toplamaya Başla',
};

export default function CollectPage() {
  return <CollectClient />;
}
