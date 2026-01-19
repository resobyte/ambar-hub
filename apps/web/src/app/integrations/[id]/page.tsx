import { Suspense } from 'react';
import { IntegrationDetail } from './IntegrationDetail';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function IntegrationDetailPage({ params }: Props) {
    const { id } = await params;

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64">Yükleniyor...</div>}>
            <IntegrationDetail integrationId={id} />
        </Suspense>
    );
}
