'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Pencil, Trash2, Plus, Users, Search, X } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Supplier {
    id: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    contactPerson: string;
    taxNumber: string;
    isActive: boolean;
}

export function SuppliersList() {

    // URL-synced table query state
    const { page, pageSize, filters, setPage, setPageSize, setFilter, clearFilters: clearUrlFilters } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 10,
    });

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filters from URL
    const name = filters.name || '';
    const taxNumber = filters.taxNumber || '';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        taxNumber: '',
    });

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(pageSize));
            if (name) params.append('name', name);
            if (taxNumber) params.append('taxNumber', taxNumber);

            const res = await fetch(`${API_URL}/suppliers?${params}`, { credentials: 'include' });
            const data = await res.json();
            setSuppliers(data.data || []);
            setTotal(data.meta?.total || 0);
            setTotalPages(Math.ceil((data.meta?.total || 0) / pageSize));
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Tedarikçiler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, name, taxNumber, toast]);

    useEffect(() => {
        // Debounce fetching if filters change (except page/size which usually don't need debounce but here we fetch on any change)
        // With useTableQuery, URL updates, triggering this effect. 
        // We can add a simple debounce if typing is fast, but let's stick to simple effect for now or add debounce logic.
        // Actually, let's debounce just like other tables effectively do via keypress -> URL -> effect. 
        // To be safe for text inputs, usually we debounce strict state updates, but here state comes from URL.
        const timer = setTimeout(() => {
            fetchSuppliers();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchSuppliers]);

    const handleClearFilters = () => {
        clearUrlFilters();
    };

    const handleCreate = () => {
        setEditingSupplier(null);
        setFormData({ name: '', code: '', email: '', phone: '', address: '', contactPerson: '', taxNumber: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            code: supplier.code || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            contactPerson: supplier.contactPerson || '',
            taxNumber: supplier.taxNumber || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingSupplier ? `${API_URL}/suppliers/${editingSupplier.id}` : `${API_URL}/suppliers`;
            const method = editingSupplier ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed');
            toast({ title: 'Başarılı', variant: 'success', description: editingSupplier ? 'Tedarikçi güncellendi' : 'Tedarikçi oluşturuldu' });
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız' });
        }
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingId) return;
        try {
            await fetch(`${API_URL}/suppliers/${deletingId}`, { method: 'DELETE', credentials: 'include' });
            toast({ title: 'Başarılı', variant: 'success', description: 'Tedarikçi silindi' });
            setIsDeleteModalOpen(false);
            fetchSuppliers();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Silme başarısız' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Tedarikçiler</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Tedarikçi
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtrele</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Tedarikçi Adı</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tedarikçi adı ara..."
                                    className="pl-8"
                                    value={name}
                                    onChange={(e) => setFilter('name', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Vergi No</Label>
                            <Input
                                placeholder="Vergi numarası..."
                                value={taxNumber}
                                onChange={(e) => setFilter('taxNumber', e.target.value)}
                            />
                        </div>
                        <div className="flex items-end md:col-span-2">
                            <Button variant="outline" onClick={handleClearFilters} className="ml-auto">
                                <X className="w-4 h-4 mr-2" /> Filtreleri Temizle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tedarikçi Adı</TableHead>
                                <TableHead>Kod</TableHead>
                                <TableHead>E-posta</TableHead>
                                <TableHead>Telefon</TableHead>
                                <TableHead>Yetkili Kişi</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Henüz tedarikçi eklenmemiş
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{supplier.code || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{supplier.email || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{supplier.phone || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{supplier.contactPerson || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEdit(supplier)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(supplier.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tedarikçi Adı</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Kod</Label>
                            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>E-posta</Label>
                                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefon</Label>
                                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Yetkili Kişi</Label>
                                <Input value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Vergi No</Label>
                                <Input value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Adres</Label>
                            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                            <Button type="submit">{editingSupplier ? 'Güncelle' : 'Oluştur'}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tedarikçi Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu tedarikçiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
