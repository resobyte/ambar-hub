'use client';

import React from 'react';
import Link from 'next/link';
import { Return, Store } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import {
    Package,
    Eye,
    Filter,
    Search,
} from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface ReturnsTableProps {
    returns: Return[];
    stores: Store[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    filters: {
        status?: string;
        storeId?: string;
        search?: string;
    };
    onFilterChange: (filters: any) => void;
}

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

export function ReturnsTable({
    returns,
    stores,
    isLoading,
    currentPage,
    totalPages,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    filters,
    onFilterChange,
}: ReturnsTableProps) {
    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Filter Section */}
            <Card className="shadow-sm border-muted">
                <CardHeader className="pb-3 border-b bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base font-medium">İade Filtreleri</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Arama */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Ara</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Sipariş no, müşteri ara..."
                                    className="pl-8 h-9"
                                    value={filters.search || ''}
                                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Durum */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Durum</label>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) => onFilterChange({ ...filters, status: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Durum Seç..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tümü</SelectItem>
                                    <SelectItem value="Created">Oluşturuldu</SelectItem>
                                    <SelectItem value="WaitingInAction">Aksiyon Bekliyor</SelectItem>
                                    <SelectItem value="Accepted">Kabul Edildi</SelectItem>
                                    <SelectItem value="PendingShelf">Rafa Ekleme Bekliyor</SelectItem>
                                    <SelectItem value="Completed">Tamamlandı</SelectItem>
                                    <SelectItem value="Rejected">Reddedildi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mağaza */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Mağaza</label>
                            <Combobox
                                options={[
                                    { value: "", label: "Tümü" },
                                    ...stores.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                value={filters.storeId || ""}
                                onValueChange={(val) => onFilterChange({ ...filters, storeId: val })}
                                placeholder="Mağaza Seç..."
                                searchPlaceholder="Mağaza ara..."
                                emptyMessage="Mağaza bulunamadı."
                                className="h-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table Section */}
            <Card className="shadow-sm border-muted">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sipariş No</TableHead>
                                <TableHead>Müşteri</TableHead>
                                <TableHead>Ürünler</TableHead>
                                <TableHead>İade Tarihi</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlem</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Yükleniyor...
                                    </TableCell>
                                </TableRow>
                            ) : returns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        İade bulunamadı
                                    </TableCell>
                                </TableRow>
                            ) : (
                                returns.map((ret) => (
                                    <TableRow
                                        key={ret.id}
                                        className="hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            {ret.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            {ret.customerFirstName} {ret.customerLastName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span>{ret.items?.length || 0} ürün</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(ret.claimDate).toLocaleDateString('tr-TR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[ret.status] || 'bg-gray-500'}>
                                                {statusLabels[ret.status] || ret.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={`/returns/${ret.id}`}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Detay
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="border-t px-4 py-3">
                            <DataTablePagination
                                page={currentPage}
                                totalPages={totalPages}
                                pageSize={pageSize}
                                totalItems={total}
                                onPageChange={onPageChange}
                                onPageSizeChange={onPageSizeChange}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
