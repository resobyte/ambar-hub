'use client';

import { useState, useEffect } from 'react';
import { Table, Column } from '@/components/common/Table';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/ToastContext';

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

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        taxNumber: '',
    });

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/suppliers?page=${page}&limit=10`, { credentials: 'include' });
            const data = await res.json();
            setSuppliers(data.data || []);
            setTotal(data.meta?.total || 0);
        } catch (err) {
            error('Tedarikçiler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSuppliers(); }, [page]);

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
            success(editingSupplier ? 'Tedarikçi güncellendi' : 'Tedarikçi oluşturuldu');
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (err) {
            error('İşlem başarısız');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', credentials: 'include' });
            success('Tedarikçi silindi');
            fetchSuppliers();
        } catch (err) {
            error('Silme başarısız');
        }
    };

    const columns: Column<Supplier>[] = [
        { key: 'name', header: 'Tedarikçi Adı' },
        { key: 'code', header: 'Kod' },
        { key: 'email', header: 'E-posta' },
        { key: 'phone', header: 'Telefon' },
        { key: 'contactPerson', header: 'Yetkili Kişi' },
        {
            key: 'actions',
            header: '',
            align: 'right',
            shrink: true,
            render: (row) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>Düzenle</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>Sil</Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Tedarikçiler</h2>
                    <p className="text-sm text-muted-foreground">Tedarikçi listesini yönetin</p>
                </div>
                <Button onClick={handleCreate}>+ Yeni Tedarikçi</Button>
            </div>

            <Table
                columns={columns}
                data={suppliers}
                keyExtractor={(item) => item.id}
                isLoading={loading}
                pagination={{ page, limit: 10, total, totalPages: Math.ceil(total / 10) }}
                onPageChange={setPage}
                emptyMessage="Henüz tedarikçi eklenmemiş"
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Tedarikçi Adı" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    <Input label="Kod" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="E-posta" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        <Input label="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Yetkili Kişi" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                        <Input label="Vergi No" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
                    </div>
                    <Input label="Adres" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit">{editingSupplier ? 'Güncelle' : 'Oluştur'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
