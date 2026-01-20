'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useTableQuery } from '@/hooks/use-table-query';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Loader2,
    Users,
    Building2,
    User,
    Eye,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    FileText,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const API_URL = typeof window === 'undefined'
    ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : '/api';

interface Customer {
    id: string;
    type: 'INDIVIDUAL' | 'COMMERCIAL';
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    city?: string;
    district?: string;
    address?: string;
    tcIdentityNumber?: string;
    company?: string;
    taxOffice?: string;
    taxNumber?: string;
    trendyolCustomerId?: string;
    createdAt: string;
}

const initialFormData = {
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COMMERCIAL',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    address: '',
    tcIdentityNumber: '',
    company: '',
    taxOffice: '',
    taxNumber: '',
};

export default function CustomersClient() {
    // URL-synced table query state (like OrdersClient)
    const { page, pageSize, filters, setPage, setPageSize, setFilter } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 20,
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [saving, setSaving] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const { toast } = useToast();

    // Local search state - only search after 3 chars
    const [localSearch, setLocalSearch] = useState(filters.search || '');

    // Sync local search with URL on mount
    useEffect(() => {
        setLocalSearch(filters.search || '');
    }, [filters.search]);

    // Search only after 3 chars or when cleared
    const handleSearchChange = (value: string) => {
        setLocalSearch(value);
        if (value.length >= 3 || value.length === 0) {
            setFilter('search', value);
        }
    };

    // Derive filter values from URL
    const typeFilter = filters.type || '';

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(pageSize));

            // Add filters from URL
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const res = await fetch(`${API_URL}/customers?${params}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Müşteriler getirilemedi');
            const json = await res.json();
            const responseData = json?.data || json;
            const customerList = Array.isArray(responseData?.customers) ? responseData.customers : [];
            setCustomers(customerList);
            setTotalPages(responseData?.totalPages || 1);
            setTotal(responseData?.total || 0);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Hata', description: err.message });
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters, toast]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleCreate = () => {
        setEditingCustomer(null);
        setFormData(initialFormData);
        setIsDialogOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            type: customer.type,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            email: customer.email,
            phone: customer.phone || '',
            city: customer.city || '',
            district: customer.district || '',
            address: customer.address || '',
            tcIdentityNumber: customer.tcIdentityNumber || '',
            company: customer.company || '',
            taxOffice: customer.taxOffice || '',
            taxNumber: customer.taxNumber || '',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/customers/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Silme başarısız');
            toast({ title: 'Başarılı', description: 'Müşteri silindi' });
            fetchCustomers();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Hata', description: err.message });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingCustomer
                ? `${API_URL}/customers/${editingCustomer.id}`
                : `${API_URL}/customers`;
            const method = editingCustomer ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'İşlem başarısız');
            }

            toast({
                title: 'Başarılı',
                description: editingCustomer ? 'Müşteri güncellendi' : 'Müşteri oluşturuldu',
            });
            setIsDialogOpen(false);
            fetchCustomers();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Hata', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const getCustomerName = (customer: Customer) => {
        if (customer.type === 'COMMERCIAL' && customer.company) {
            return customer.company;
        }
        return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Müşteriler</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Müşteri
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Müşteri ara (isim, e-posta, firma)..."
                                value={localSearch}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(v) => setFilter('type', v === 'ALL' ? '' : v)}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Tip Filtrele" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tümü</SelectItem>
                                <SelectItem value="INDIVIDUAL">Bireysel</SelectItem>
                                <SelectItem value="COMMERCIAL">Ticari</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Müşteri</TableHead>
                                    <TableHead>Tip</TableHead>
                                    <TableHead>E-posta</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Şehir / İlçe</TableHead>
                                    <TableHead>TC / VKN</TableHead>
                                    <TableHead className="text-right">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                Loading...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Users className="w-8 h-8 opacity-20" />
                                                Henüz müşteri bulunmuyor
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {customer.type === 'COMMERCIAL' ? (
                                                        <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-green-500 shrink-0" />
                                                    )}
                                                    <span className="truncate max-w-[200px]">{getCustomerName(customer)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={customer.type === 'COMMERCIAL' ? 'default' : 'secondary'}>
                                                    {customer.type === 'COMMERCIAL' ? 'Ticari' : 'Bireysel'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{customer.email}</TableCell>
                                            <TableCell>{customer.phone || '-'}</TableCell>
                                            <TableCell>
                                                {[customer.city, customer.district].filter(Boolean).join(' / ') || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {customer.type === 'COMMERCIAL'
                                                    ? customer.taxNumber || '-'
                                                    : customer.tcIdentityNumber || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => setViewingCustomer(customer)}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(customer.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>


                    <DataTablePagination
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        totalItems={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        pageSizeOptions={[10, 20, 50, 100]}
                    />
                </CardContent>
            </Card>

            {/* View Detail Dialog */}
            <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {viewingCustomer?.type === 'COMMERCIAL' ? (
                                <Building2 className="w-5 h-5 text-blue-500" />
                            ) : (
                                <User className="w-5 h-5 text-green-500" />
                            )}
                            Müşteri Detayı
                        </DialogTitle>
                    </DialogHeader>
                    {viewingCustomer && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Tip</Label>
                                    <p className="font-medium">
                                        <Badge variant={viewingCustomer.type === 'COMMERCIAL' ? 'default' : 'secondary'}>
                                            {viewingCustomer.type === 'COMMERCIAL' ? 'Ticari' : 'Bireysel'}
                                        </Badge>
                                    </p>
                                </div>
                                {viewingCustomer.type === 'COMMERCIAL' && viewingCustomer.company && (
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground">Firma</Label>
                                        <p className="font-medium">{viewingCustomer.company}</p>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Ad</Label>
                                    <p className="font-medium">{viewingCustomer.firstName || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Soyad</Label>
                                    <p className="font-medium">{viewingCustomer.lastName || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> E-posta
                                    </Label>
                                    <p className="font-medium break-all">{viewingCustomer.email}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Telefon
                                    </Label>
                                    <p className="font-medium">{viewingCustomer.phone || '-'}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Şehir</Label>
                                    <p className="font-medium">{viewingCustomer.city || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">İlçe</Label>
                                    <p className="font-medium">{viewingCustomer.district || '-'}</p>
                                </div>
                            </div>

                            {viewingCustomer.address && (
                                <div className="text-sm">
                                    <Label className="text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Adres
                                    </Label>
                                    <p className="font-medium">{viewingCustomer.address}</p>
                                </div>
                            )}

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {viewingCustomer.type === 'INDIVIDUAL' ? (
                                    <div>
                                        <Label className="text-muted-foreground flex items-center gap-1">
                                            <CreditCard className="w-3 h-3" /> TC Kimlik No
                                        </Label>
                                        <p className="font-medium">{viewingCustomer.tcIdentityNumber || '-'}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <Label className="text-muted-foreground">Vergi Dairesi</Label>
                                            <p className="font-medium">{viewingCustomer.taxOffice || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> VKN
                                            </Label>
                                            <p className="font-medium">{viewingCustomer.taxNumber || '-'}</p>
                                        </div>
                                    </>
                                )}
                                {viewingCustomer.trendyolCustomerId && (
                                    <div>
                                        <Label className="text-muted-foreground">Trendyol ID</Label>
                                        <p className="font-medium">{viewingCustomer.trendyolCustomerId}</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground pt-2">
                                Oluşturulma: {new Date(viewingCustomer.createdAt).toLocaleString('tr-TR')}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingCustomer(null)}>
                            Kapat
                        </Button>
                        <Button onClick={() => { handleEdit(viewingCustomer!); setViewingCustomer(null); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Düzenle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Müşteri Tipi</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v as 'INDIVIDUAL' | 'COMMERCIAL' })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INDIVIDUAL">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" /> Bireysel
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="COMMERCIAL">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Ticari
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'COMMERCIAL' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Firma Adı</Label>
                                    <Input
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Firma adı"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Vergi Dairesi</Label>
                                        <Input
                                            value={formData.taxOffice}
                                            onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                                            placeholder="Vergi dairesi"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>VKN</Label>
                                        <Input
                                            value={formData.taxNumber}
                                            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                                            placeholder="Vergi kimlik no"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ad</Label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Ad"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Soyad</Label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Soyad"
                                />
                            </div>
                        </div>

                        {formData.type === 'INDIVIDUAL' && (
                            <div className="space-y-2">
                                <Label>TC Kimlik No</Label>
                                <Input
                                    value={formData.tcIdentityNumber}
                                    onChange={(e) => setFormData({ ...formData, tcIdentityNumber: e.target.value })}
                                    placeholder="TC kimlik numarası"
                                    maxLength={11}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>E-posta *</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="E-posta adresi"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Telefon numarası"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Şehir</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Şehir"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>İlçe</Label>
                                <Input
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    placeholder="İlçe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Adres</Label>
                            <Textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Açık adres"
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : editingCustomer ? 'Güncelle' : 'Oluştur'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
