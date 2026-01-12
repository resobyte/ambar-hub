'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { getIntegrations, Integration, syncOrders } from '@/lib/api';
import { X } from 'lucide-react';

interface SyncOrdersDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SyncOrdersDialog({ open, onClose, onSuccess }: SyncOrdersDialogProps) {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingIntegrations, setFetchingIntegrations] = useState(false);

    useEffect(() => {
        if (open) {
            fetchIntegrations();
        }
    }, [open]);

    const fetchIntegrations = async () => {
        setFetchingIntegrations(true);
        try {
            // Fetch all pages if needed, but for now getting first page (assuming < 100 integrations)
            const res = await getIntegrations(1, 100);
            // Filter for supported integrations (Trendyol, Hepsiburada)
            const supportedIntegrations = res.data.filter(i => (i.type === 'TRENDYOL' || i.type === 'HEPSIBURADA' || i.type === 'IKAS') && i.isActive);
            setIntegrations(supportedIntegrations);
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        } finally {
            setFetchingIntegrations(false);
        }
    };

    const handleSync = async () => {
        if (!selectedIntegrationId) return;

        setLoading(true);
        try {
            await syncOrders(selectedIntegrationId);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Sync failed', error);
            alert('Failed to sync orders. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background border border-border rounded-xl shadow-lg p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">Sync Orders</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <Select
                        label="Select Integration"
                        value={selectedIntegrationId}
                        onChange={(e) => setSelectedIntegrationId(e.target.value)}
                        options={integrations.map(i => ({ value: i.id, label: i.name }))}
                        disabled={fetchingIntegrations}
                    />

                    {integrations.length === 0 && !fetchingIntegrations && (
                        <p className="text-sm text-destructive">No active supported integrations found.</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSync}
                            disabled={loading || !selectedIntegrationId}
                        >
                            {loading ? 'Syncing...' : 'Start Sync'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
