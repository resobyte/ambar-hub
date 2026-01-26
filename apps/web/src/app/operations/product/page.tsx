import { Metadata } from 'next';
import { ProductQueryClient } from './ProductQueryClient';

export const metadata: Metadata = {
  title: 'Ürün Sorgulama',
};

export default function ProductQueryPage() {
  return <ProductQueryClient />;
}
