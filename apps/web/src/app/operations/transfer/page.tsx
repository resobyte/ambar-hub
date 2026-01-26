import { Metadata } from 'next';
import { TransferClient } from './TransferClient';

export const metadata: Metadata = {
  title: 'Raf Transferi',
};

export default function TransferPage() {
  return <TransferClient />;
}
