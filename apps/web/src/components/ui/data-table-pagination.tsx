'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DataTablePaginationProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export function DataTablePagination({
    page,
    pageSize,
    totalPages,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
    const [jumpPage, setJumpPage] = useState('');

    const handleJumpToPage = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const pageNum = parseInt(jumpPage, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                onPageChange(pageNum);
                setJumpPage('');
            }
        }
    };

    return (
        <div className="flex items-center justify-between mt-4 px-2">
            {/* Left side - Page size selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Sayfa başına:</span>
                <Select
                    value={String(pageSize)}
                    onValueChange={(v) => onPageSizeChange(parseInt(v, 10))}
                >
                    <SelectTrigger className="w-[70px] h-8">
                        <SelectValue placeholder={String(pageSize)} />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {totalItems !== undefined && (
                    <span className="text-sm text-muted-foreground">
                        ({totalItems} kayıt)
                    </span>
                )}
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-4">
                {/* Page jumper */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Sayfaya git:</span>
                    <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={handleJumpToPage}
                        placeholder={String(page)}
                        className="w-16 h-8 text-center"
                    />
                </div>

                {/* Current page indicator */}
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Sayfa {page} / {totalPages || 1}
                </span>

                {/* Navigation buttons */}
                <div className="flex gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="h-8 px-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="h-8 px-2"
                    >
                        Sonraki <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
