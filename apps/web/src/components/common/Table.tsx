'use client';

import { ReactNode } from 'react';
import { PaginationMeta, SortConfig } from '@/types';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  shrink?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  pagination?: PaginationMeta;
  sortConfig?: SortConfig;
  onSort?: (sortBy: string) => void;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T extends object>({
  columns,
  data,
  keyExtractor,
  pagination,
  sortConfig,
  onSort,
  onPageChange,
  isLoading = false,
  emptyMessage = 'Veri bulunamadı',
}: TableProps<T>) {
  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.sortBy !== columnKey) {
      return null;
    }

    return sortConfig.sortOrder === 'ASC' ? (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {columns.map((column) => {
                const alignClass = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                const widthClass = column.width || '';
                const shrinkClass = column.shrink ? 'w-px whitespace-nowrap' : '';
                return (
                  <th
                    key={String(column.key)}
                    className={`px-4 sm:px-6 py-3 ${alignClass} ${widthClass} ${shrinkClass} ${column.sortable ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
                      }`}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className={`flex items-center space-x-1 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                      <span>{column.header}</span>
                      {column.sortable && renderSortIcon(String(column.key))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-muted/20 transition-colors group">
                  {columns.map((column) => {
                    const alignClass = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                    const shrinkClass = column.shrink ? 'w-px whitespace-nowrap' : '';
                    return (
                      <td key={String(column.key)} className={`px-4 sm:px-6 py-4 text-sm ${alignClass} ${shrinkClass}`}>
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[String(column.key)] ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
          <div className="text-sm text-muted-foreground">
            Toplam {pagination.total} sonuçtan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Önceki
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
