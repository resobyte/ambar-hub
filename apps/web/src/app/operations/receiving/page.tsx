import { Metadata } from 'next';
import { ReceivingClient } from './ReceivingClient';

export const metadata: Metadata = {
  title: 'Mal Kabul',
};

export default function ReceivingPage() {
  return <ReceivingClient />;
}
