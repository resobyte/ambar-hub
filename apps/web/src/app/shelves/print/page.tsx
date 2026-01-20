'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import JsBarcode from 'jsbarcode';

interface ShelfData {
    id: string;
    name: string;
    barcode: string;
    globalSlot: number | null;
}

export default function PrintBarcodesPage() {
    const searchParams = useSearchParams();
    const [shelves, setShelves] = useState<ShelfData[]>([]);
    const barcodeRefs = useRef<{ [key: string]: SVGSVGElement | null }>({});

    useEffect(() => {
        // Get shelf data from query params
        const data = searchParams.get('data');
        if (data) {
            try {
                const parsed = JSON.parse(decodeURIComponent(data)) as ShelfData[];
                setShelves(parsed);
            } catch (e) {
                console.error('Failed to parse shelf data', e);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        shelves.forEach(shelf => {
            const ref = barcodeRefs.current[shelf.id];
            if (ref) {
                const barcodeValue = shelf.barcode
                    .replace(/\s*>\s*/g, '-')
                    .replace(/[^a-zA-Z0-9-]/g, '')
                    .toUpperCase() || shelf.id.slice(0, 8);
                JsBarcode(ref, barcodeValue, {
                    format: 'CODE128',
                    width: 1,
                    height: 35,
                    margin: 0,
                    displayValue: false,
                });
            }
        });
    }, [shelves]);

    if (shelves.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg text-gray-500">Yazdırılacak raf bulunamadı</p>
            </div>
        );
    }

    return (
        <div className="print-container">
            <style jsx global>{`
                @page {
                    size: 57mm 39mm;
                    margin: 0;
                }
                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 57mm;
                        height: 39mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        padding: 0;
                        margin: 0;
                    }
                    .label-container {
                        page-break-after: always;
                        page-break-inside: avoid;
                        margin: 0;
                        padding: 0;
                        width: 57mm !important;
                        height: 39mm !important;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-sizing: border-box;
                    }
                    .label-container:last-child {
                        page-break-after: auto;
                    }
                    .label-content {
                        text-align: center;
                    }
                }
                @media screen {
                    .print-container {
                        padding: 20px;
                        background: #f5f5f5;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 20px;
                    }
                    .label-container {
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border-radius: 4px;
                    }
                }
            `}</style>

            <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
                >
                    Yazdır
                </button>
                <button
                    onClick={() => window.close()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-lg"
                >
                    Kapat
                </button>
            </div>

            {shelves.map(shelf => (
                <div
                    key={shelf.id}
                    className="label-container bg-white"
                    style={{
                        width: '57mm',
                        height: '39mm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3mm',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: '100%',
                        maxWidth: '51mm',
                    }}>
                        <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            marginBottom: '4px',
                            textAlign: 'center',
                        }}>
                            {shelf.barcode}
                        </div>
                        <svg
                            ref={el => { barcodeRefs.current[shelf.id] = el; }}
                            style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
