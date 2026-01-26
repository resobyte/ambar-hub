'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  PackageCheck,
  ArrowRightLeft,
  Search,
  LayoutGrid,
  Download,
  LogOut,
  ChevronRight,
  Scan,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MenuItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  keywords: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const menuSections: MenuSection[] = [
  {
    title: 'Sipariş İşlemleri',
    items: [
      {
        title: 'Toplama',
        description: 'Rota bazlı ürün toplama işlemi',
        href: '/operations/collect',
        icon: Package,
        color: 'bg-blue-500',
        keywords: ['toplama', 'collect', 'rota', 'picking'],
      },
      {
        title: 'Paketleme',
        description: 'Sipariş paketleme ve etiket basımı',
        href: '/operations/pack',
        icon: PackageCheck,
        color: 'bg-green-500',
        keywords: ['paketleme', 'pack', 'etiket', 'kargo'],
      },
    ],
  },
  {
    title: 'Stok İşlemleri',
    items: [
      {
        title: 'Mal Kabul',
        description: 'Gelen ürünleri raflara yerleştir',
        href: '/operations/receiving',
        icon: Download,
        color: 'bg-orange-500',
        keywords: ['mal', 'kabul', 'receiving', 'gelen'],
      },
      {
        title: 'Raf Transferi',
        description: 'Ürünleri raflar arasında transfer et',
        href: '/operations/transfer',
        icon: ArrowRightLeft,
        color: 'bg-purple-500',
        keywords: ['transfer', 'raf', 'taşı', 'move'],
      },
    ],
  },
  {
    title: 'Sorgulama',
    items: [
      {
        title: 'Ürün Sorgula',
        description: 'Barkod ile ürün stok ve raf bilgisi',
        href: '/operations/product',
        icon: Search,
        color: 'bg-cyan-500',
        keywords: ['ürün', 'product', 'stok', 'barkod'],
      },
      {
        title: 'Raf Sorgula',
        description: 'Raf içeriğini ve stokları görüntüle',
        href: '/operations/shelf',
        icon: LayoutGrid,
        color: 'bg-pink-500',
        keywords: ['raf', 'shelf', 'konum', 'içerik'],
      },
    ],
  },
];

export function OperationsClient() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success !== false) {
          setUser(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/auth/login');
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;

    const query = searchQuery.toLowerCase();
    return menuSections
      .map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.keywords.some(k => k.includes(query))
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Hoşgeldin</p>
            <h1 className="text-2xl font-bold">
              {user ? `${user.firstName} ${user.lastName}` : '...'}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative mb-6">
          <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşlem ara..."
            className="pl-12 h-14 text-lg rounded-xl"
          />
        </div>

        <div className="space-y-6">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h2>
              <div className="grid gap-3">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:bg-accent transition-all group"
                  >
                    <div className={`p-3 rounded-xl ${item.color}`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Sonuç bulunamadı</p>
              <p className="text-sm text-muted-foreground/70">Farklı bir arama deneyin</p>
            </div>
          )}
        </div> 
      </div>
    </div>
  );
}
