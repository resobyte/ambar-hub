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
        // Generate barcodes for each shelf
        shelves.forEach(shelf => {
            const ref = barcodeRefs.current[shelf.id];
            if (ref) {
                // Use globalSlot as barcode value if available, otherwise use id
                const barcodeValue = shelf.globalSlot?.toString() || shelf.id.slice(0, 8);
                JsBarcode(ref, barcodeValue, {
                    width: 2.2,
                    height: 55,
                    fontSize: 18,
                    marginTop: 1,
                    margin: 1,
                    fontOptions: "bold",
                    displayValue: true
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
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        padding: 0;
                    }
                    .label-container {
                        page-break-after: always;
                        margin: 0;
                        padding: 0;
                    }
                    .label-container:last-child {
                        page-break-after: auto;
                    }
                }
                @media screen {
                    .print-container {
                        padding: 20px;
                        background: #f5f5f5;
                        min-height: 100vh;
                    }
                    .label-container {
                        margin-bottom: 20px;
                    }
                }
            `}</style>

            {/* Print button - hidden in print */}
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
                        paddingLeft: '10mm',
                        paddingTop: '1mm',
                    }}
                >
                    <table style={{ borderSpacing: 0, borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td
                                    style={{
                                        width: '40mm',
                                        verticalAlign: 'middle',
                                        fontSize: '20px',
                                        paddingTop: '15px',
                                        textAlign: 'center',
                                    }}
                                >
                                    <b>{shelf.barcode}</b>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
                                    <svg
                                        ref={el => { barcodeRefs.current[shelf.id] = el; }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
