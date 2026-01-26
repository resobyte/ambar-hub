import { Metadata } from 'next';
import { ShelfQueryClient } from './ShelfQueryClient';

export const metadata: Metadata = {
  title: 'Raf Sorgulama',
};

export default function ShelfQueryPage() {
  return <ShelfQueryClient />;
}
