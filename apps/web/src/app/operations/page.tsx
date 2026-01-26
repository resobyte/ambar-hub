import { Metadata } from 'next';
import { OperationsClient } from './OperationsClient';

export const metadata: Metadata = {
  title: 'Operasyon',
};

export default function OperationsPage() {
  return <OperationsClient />;
}
