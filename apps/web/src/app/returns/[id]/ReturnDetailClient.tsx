'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Check, X, AlertTriangle, Box, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import {
    getReturn,
    approveReturn,
    rejectReturn,
    processReturn,
    getReturnRejectReasons,
    getShelves,
    Return,
    Shelf,
} from '@/lib/api';

const statusLabels: Record<string, string> = {
    Created: 'Oluşturuldu',
    WaitingInAction: 'Aksiyon Bekliyor',
    WaitingFraudCheck: 'Fraud Kontrol',
    Accepted: 'Kabul Edildi',
    Rejected: 'Reddedildi',
    Cancelled: 'İptal',
    Unresolved: 'İhtilaflı',
    InAnalysis: 'Analizde',
    PendingShelf: 'Rafa Ekleme Bekliyor',
    Completed: 'Tamamlandı',
};

const statusColors: Record<string, string> = {
    Created: 'bg-blue-500',
    WaitingInAction: 'bg-yellow-500',
    WaitingFraudCheck: 'bg-orange-500',
    Accepted: 'bg-green-500',
    Rejected: 'bg-red-500',
    Cancelled: 'bg-gray-500',
    Unresolved: 'bg-purple-500',
    InAnalysis: 'bg-indigo-500',
    PendingShelf: 'bg-amber-500',
    Completed: 'bg-emerald-600',
};

interface Props {
    id: string;
    userId: string;
}

export function ReturnDetailClient({ id, userId }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const [returnData, setReturnData] = useState<Return | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [rejectReasons, setRejectReasons] = useState<Array<{ id: string; name: string }>>([]);

    // Dialogs
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showProcessDialog, setShowProcessDialog] = useState(false);

    // Reject form
    const [rejectReasonId, setRejectReasonId] = useState('');
    const [rejectDescription, setRejectDescription] = useState('');

    // Process form - her item için shelfId ve shelfType
    const [itemProcessData, setItemProcessData] = useState<Record<string, {
        shelfId: string;
        shelfType: 'NORMAL' | 'DAMAGED';
        quantity: number;
    }>>({});

    const fetchReturn = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getReturn(id);
            setReturnData(res.data);

            // Initialize item process data
            const initialData: Record<string, { shelfId: string; shelfType: 'NORMAL' | 'DAMAGED'; quantity: number }> = {};
            res.data.items?.forEach(item => {
                initialData[item.id] = {
                    shelfId: '',
                    shelfType: 'NORMAL',
                    quantity: item.quantity || 1,
                };
            });
            setItemProcessData(initialData);
        } catch (error) {
            console.error('Failed to fetch return:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchShelves = useCallback(async () => {
        try {
            // Sadece RETURN ve RETURN_DAMAGED tipindeki rafları getir
            const returnShelves: Shelf[] = [];
            
            // RETURN tipindeki rafları getir
            const returnRes = await getShelves(1, 1000, 'RETURN');
            if (returnRes.data) {
                returnShelves.push(...returnRes.data);
            }
            
            // RETURN_DAMAGED tipindeki rafları getir
            const returnDamagedRes = await getShelves(1, 1000, 'RETURN_DAMAGED');
            if (returnDamagedRes.data) {
                returnShelves.push(...returnDamagedRes.data);
            }
            
            setShelves(returnShelves);
        } catch (error) {
            console.error('Failed to fetch shelves:', error);
            toast({
                title: 'Hata',
                description: 'Raflar yüklenemedi',
                variant: 'destructive',
            });
        }
    }, [toast]);

    const fetchRejectReasons = useCallback(async () => {
        try {
            const res = await getReturnRejectReasons();
            setRejectReasons(res.data || []);
        } catch (error) {
            console.error('Failed to fetch reject reasons:', error);
        }
    }, []);

    useEffect(() => {
        fetchReturn();
        fetchShelves();
        fetchRejectReasons();
    }, [fetchReturn, fetchShelves, fetchRejectReasons]);

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await approveReturn(id);
            toast({
                title: 'Başarılı',
                description: 'İade Trendyol\'da onaylandı',
            });
            fetchReturn();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'İade onaylanamadı',
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReasonId || !rejectDescription) {
            toast({
                title: 'Hata',
                description: 'Red sebebi ve açıklama zorunludur',
                variant: 'destructive',
            });
            return;
        }

        setProcessing(true);
        try {
            await rejectReturn(id, {
                reasonId: rejectReasonId,
                description: rejectDescription,
            });
            toast({
                title: 'Başarılı',
                description: 'İade ret talebi oluşturuldu',
            });
            setShowRejectDialog(false);
            fetchReturn();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'İade reddedilemedi',
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleProcess = async () => {
        // Validate
        const items = Object.entries(itemProcessData).map(([returnItemId, data]) => ({
            returnItemId,
            shelfId: data.shelfId,
            shelfType: data.shelfType,
            quantity: data.quantity,
        }));

        const invalidItems = items.filter(i => !i.shelfId);
        if (invalidItems.length > 0) {
            toast({
                title: 'Hata',
                description: 'Tüm ürünler için raf seçilmelidir',
                variant: 'destructive',
            });
            return;
        }

        setProcessing(true);
        try {
            await processReturn(id, {
                items,
                userId,
            });
            toast({
                title: 'Başarılı',
                description: 'İade işlendi ve stok eklendi',
            });
            setShowProcessDialog(false);
            fetchReturn();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'İade işlenemedi',
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Yükleniyor...</p>
            </div>
        );
    }

    if (!returnData) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">İade bulunamadı</p>
            </div>
        );
    }

    const canApproveOrReject = returnData.integrationStatus === 'WaitingInAction' || returnData.integrationStatus === 'Created';
    const canProcess = returnData.status === 'PendingShelf' || returnData.status === 'Accepted' || returnData.status === 'Rejected';

    // Tüm item'lardaki müşteri notlarını topla
    const customerNotes = returnData.items?.filter(item => item.customerNote).map(item => ({
        productName: item.productName,
        note: item.customerNote,
    })) || [];

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/returns">İadeler</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>İade #{returnData.orderNumber}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">İade #{returnData.orderNumber}</h1>
                    <p className="text-muted-foreground">
                        {returnData.customerFirstName} {returnData.customerLastName}
                    </p>
                </div>
                <Badge className={`${statusColors[returnData.status]} text-lg px-4 py-1`}>
                    {statusLabels[returnData.status] || returnData.status}
                </Badge>
            </div>

            {/* Action Buttons */}
            {(canApproveOrReject || canProcess) && (
                <div className="border border-border rounded-xl bg-card p-4">
                    <div className="flex gap-4">
                        {canApproveOrReject && (
                            <>
                                <Button
                                    onClick={handleApprove}
                                    disabled={processing}
                                    className="bg-green-600 hover:bg-green-700"
                                    size="lg"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Kabul Et
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowRejectDialog(true)}
                                    disabled={processing}
                                    size="lg"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Reddet
                                </Button>
                            </>
                        )}
                        {canProcess && (
                            <Button
                                onClick={() => setShowProcessDialog(true)}
                                disabled={processing}
                                className="bg-amber-600 hover:bg-amber-700"
                                size="lg"
                            >
                                <Box className="h-4 w-4 mr-2" />
                                Rafa Ekle & Stok Girişi
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Claim Info */}
                <div className="border border-border rounded-xl bg-card p-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        İade Bilgileri
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Claim ID</p>
                            <p className="font-mono text-sm">{returnData.claimId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">İade Tarihi</p>
                            <p className="font-medium">
                                {new Date(returnData.claimDate).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                            <p className="font-medium">
                                {returnData.orderDate
                                    ? new Date(returnData.orderDate).toLocaleDateString('tr-TR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                      })
                                    : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Trendyol Durumu</p>
                            <p className="font-medium">{returnData.integrationStatus}</p>
                        </div>
                    </div>
                </div>

                {/* Process Info */}
                {returnData.processedAt && (
                    <div className="border border-border rounded-xl bg-card p-4">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            İşlem Bilgileri
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">İşlem Tarihi</p>
                                <p className="font-medium">
                                    {new Date(returnData.processedAt).toLocaleDateString('tr-TR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Müşteri Notları */}
            {customerNotes.length > 0 && (
                <div className="border border-border rounded-xl bg-card p-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Müşteri Notları
                    </h2>
                    <div className="space-y-4">
                        {customerNotes.map((note, index) => (
                            <div key={index} className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">{note.productName}</p>
                                <p className="text-sm bg-muted p-3 rounded-md">{note.note}</p>
                                {index < customerNotes.length - 1 && <Separator />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="border border-border rounded-xl bg-card p-4">
                <h2 className="text-lg font-semibold mb-4">İade Ürünleri</h2>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ürün</TableHead>
                                <TableHead>Barkod</TableHead>
                                <TableHead>Renk / Beden</TableHead>
                                <TableHead>Fiyat</TableHead>
                                <TableHead>İade Sebebi</TableHead>
                                <TableHead>Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnData.items?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium max-w-xs truncate">
                                        {item.productName}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {item.barcode}
                                    </TableCell>
                                    <TableCell>
                                        {item.productColor} / {item.productSize}
                                    </TableCell>
                                    <TableCell>
                                        {item.price?.toLocaleString('tr-TR', {
                                            style: 'currency',
                                            currency: 'TRY',
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{item.customerReasonName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline">{item.claimItemStatus}</Badge>
                                            {item.shelfType && (
                                                <Badge className={item.shelfType === 'DAMAGED' ? 'bg-red-500' : 'bg-green-500'}>
                                                    {item.shelfType === 'DAMAGED' ? 'Hasarlı' : 'Normal'}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            İade Ret Talebi
                        </DialogTitle>
                        <DialogDescription>
                            Trendyol&apos;da bu iade için ret talebi oluşturulacak.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Red Sebebi</Label>
                            <Select value={rejectReasonId} onValueChange={setRejectReasonId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sebep seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rejectReasons.map(reason => (
                                        <SelectItem key={reason.id} value={reason.id}>
                                            {reason.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Açıklama</Label>
                            <Textarea
                                value={rejectDescription}
                                onChange={(e) => setRejectDescription(e.target.value)}
                                placeholder="Red sebebini açıklayın..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={processing}
                        >
                            Ret Talebi Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Process Dialog */}
            <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Box className="h-5 w-5" />
                            İade Ürünlerini Rafa Ekle
                        </DialogTitle>
                        <DialogDescription>
                            Her ürün için yerleştirileceği rafı ve iade tipini seçin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {returnData.items?.map((item) => (
                            <Card key={item.id}>
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.barcode} | {item.productColor} / {item.productSize}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-32">
                                                <Label className="text-xs">Adet</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={itemProcessData[item.id]?.quantity || 1}
                                                    onChange={(e) => setItemProcessData(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            quantity: parseInt(e.target.value) || 1,
                                                        },
                                                    }))}
                                                />
                                            </div>
                                            <div className="w-48">
                                                <Label className="text-xs">Raf</Label>
                                                <Select
                                                    value={itemProcessData[item.id]?.shelfId || ''}
                                                    onValueChange={(value) => setItemProcessData(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            shelfId: value,
                                                        },
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Raf seç" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {shelves.map(shelf => (
                                                            <SelectItem key={shelf.id} value={shelf.id}>
                                                                {shelf.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-36">
                                                <Label className="text-xs">İade Tipi</Label>
                                                <Select
                                                    value={itemProcessData[item.id]?.shelfType || 'NORMAL'}
                                                    onValueChange={(value: 'NORMAL' | 'DAMAGED') => setItemProcessData(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            shelfType: value,
                                                        },
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NORMAL">Normal İade</SelectItem>
                                                        <SelectItem value="DAMAGED">Hasarlı İade</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                            İptal
                        </Button>
                        <Button
                            onClick={handleProcess}
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Stok Girişi Yap
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
