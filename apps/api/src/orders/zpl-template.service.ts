import { Injectable, Logger } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { Store } from '../stores/entities/store.entity';
import { format } from 'date-fns';

interface ZplLabelData {
  barcode: string;
  receiverName: string;
  receiverAddress: string;
  senderName: string;
  senderAddress: string;
  senderVat: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  source: string;
  carrier: string;
  items: Array<{
    lineNo: number;
    sku: string;
    name: string;
    quantity: number;
  }>;
}

/**
 * ZPL (Zebra Programming Language) Template Service
 * 100mm x 100mm thermal label template
 */
@Injectable()
export class ZplTemplateService {
  private readonly logger = new Logger(ZplTemplateService.name);

  /**
   * Generate ZPL label code from order data
   * Label size: 100mm x 100mm (approximately 400 dots x 400 dots at 203 DPI)
   */
  generateCargoLabel(order: Order, store: Store): string {
    const labelData = this.prepareLabelData(order, store);
    
    const zpl = `
^XA
^CI28
^LH0,0
^PW400
^LL400

${this.generateBarcodeSection(labelData.barcode)}

${this.generateReceiverSection(labelData)}

${this.generateSenderSection(labelData)}

${this.generateOrderDetailsSection(labelData)}

${this.generateInfoNoticeSection()}

${this.generateItemsSection(labelData.items)}

^XZ
`.trim();

    return zpl;
  }

  private prepareLabelData(order: Order, store: Store): ZplLabelData {
    const shippingAddress = order.shippingAddress as any || {};
    const invoiceAddress = order.invoiceAddress as any || {};
    
    // Receiver info from shipping address
    const receiverName = [
      shippingAddress.firstName || '',
      shippingAddress.lastName || ''
    ].filter(Boolean).join(' ') || order.customer?.firstName + ' ' + order.customer?.lastName || 'Alıcı';
    
    const receiverAddress = [
      shippingAddress.fullAddress || shippingAddress.addressDetail || shippingAddress.address || '',
      shippingAddress.neighborhood || '',
      shippingAddress.district || '',
      shippingAddress.city || '',
      'Türkiye'
    ].filter(Boolean).join(' / ');

    // Sender info from store
    const senderName = store.brandName || 'Farmakozmetika Sağlık Ürünleri ve Kozmetik Tic. Ltd. Şti.';
    const senderAddress = 'Cihangir Mahallesi Güvercin Sokak No:4 193 Numara Avcılar İstanbul';
    const senderVat = `VD: Avcılar VKN/TC: ${store.companyCode || '3851513350'}`;

    // Order details
    const invoiceNumber = order.orderNumber || 'N/A';
    const invoiceDate = order.orderDate ? format(new Date(order.orderDate), 'dd.MM.yyyy') : '';
    const packageId = order.packageId || order.orderNumber;
    const barcode = order.cargoTrackingNumber || packageId || order.orderNumber;

    // Source mapping
    const sourceMap: Record<string, string> = {
      'TRENDYOL': 'Trendyol',
      'HEPSIBURADA': 'Hepsiburada',
      'IKAS': 'IKAS',
      'MANUAL': 'Manuel'
    };
    const source = sourceMap[store.type] || store.name || 'Mağaza';

    // Carrier
    const carrier = order.cargoProviderName || store.shippingProvider?.name || 'Aras Kargo';

    // Items
    const items = (order.items || []).map((item, index) => ({
      lineNo: index + 1,
      sku: item.sku || 'N/A',
      name: item.productName || 'Ürün',
      quantity: item.quantity || 1
    }));

    return {
      barcode,
      receiverName,
      receiverAddress,
      senderName,
      senderAddress,
      senderVat,
      invoiceNumber,
      invoiceDate,
      orderNumber: packageId,
      source,
      carrier,
      items
    };
  }

  /**
   * Barcode section - at the top center
   */
  private generateBarcodeSection(barcode: string): string {
    return `
^FO50,10^BY2,3,50
^BCN,50,Y,N,N
^FD${barcode}^FS
^FO50,65^A0N,20,20^FH^FD${barcode}^FS
`.trim();
  }

  /**
   * Receiver information box - left side
   */
  private generateReceiverSection(data: ZplLabelData): string {
    // Split long addresses if needed
    const addressLines = this.splitText(data.receiverAddress, 35);
    
    let yPos = 90;
    const result = [`^FO10,${yPos}^GB200,85,2^FS`]; // Box border
    
    yPos += 5;
    result.push(`^FO15,${yPos}^A0N,18,18^FH^FDALICI:^FS`);
    
    yPos += 18;
    result.push(`^FO15,${yPos}^A0N,16,16^FH^FD${this.escapeZpl(data.receiverName)}^FS`);
    
    yPos += 16;
    addressLines.forEach(line => {
      result.push(`^FO15,${yPos}^A0N,12,12^FH^FD${this.escapeZpl(line)}^FS`);
      yPos += 12;
    });

    return result.join('\n');
  }

  /**
   * Sender information box - right side
   */
  private generateSenderSection(data: ZplLabelData): string {
    const senderLines = this.splitText(data.senderAddress, 30);
    
    let yPos = 90;
    const result = [`^FO215,${yPos}^GB175,85,2^FS`]; // Box border
    
    yPos += 5;
    result.push(`^FO220,${yPos}^A0N,16,16^FH^FDGONDEREN:^FS`);
    
    yPos += 16;
    result.push(`^FO220,${yPos}^A0N,10,10^FH^FD${this.escapeZpl(data.senderName).substring(0, 40)}^FS`);
    
    yPos += 10;
    senderLines.forEach(line => {
      result.push(`^FO220,${yPos}^A0N,10,10^FH^FD${this.escapeZpl(line)}^FS`);
      yPos += 10;
    });
    
    yPos += 2;
    result.push(`^FO220,${yPos}^A0N,9,9^FH^FD${this.escapeZpl(data.senderVat)}^FS`);

    return result.join('\n');
  }

  /**
   * Order details section - 5 columns
   */
  private generateOrderDetailsSection(data: ZplLabelData): string {
    const yPos = 180;
    const result = [];
    
    // Row dividers
    result.push(`^FO10,${yPos}^GB380,55,2^FS`);
    result.push(`^FO75,${yPos}^GB0,55,2^FS`);  // Vertical line 1
    result.push(`^FO145,${yPos}^GB0,55,2^FS`); // Vertical line 2
    result.push(`^FO230,${yPos}^GB0,55,2^FS`); // Vertical line 3
    result.push(`^FO305,${yPos}^GB0,55,2^FS`); // Vertical line 4
    
    // Column 1: Invoice Number
    result.push(`^FO15,${yPos + 3}^A0N,10,10^FH^FDFATURA NO:^FS`);
    result.push(`^FO15,${yPos + 15}^A0N,12,12^FH^FD${this.escapeZpl(data.invoiceNumber).substring(0, 12)}^FS`);
    
    // Column 2: Invoice Date
    result.push(`^FO80,${yPos + 3}^A0N,10,10^FH^FDFATURA TARIHI:^FS`);
    result.push(`^FO80,${yPos + 15}^A0N,12,12^FH^FD${data.invoiceDate}^FS`);
    
    // Column 3: Order Number
    result.push(`^FO150,${yPos + 3}^A0N,10,10^FH^FDSIPARIS NO:^FS`);
    result.push(`^FO150,${yPos + 15}^A0N,10,10^FH^FD${this.escapeZpl(data.orderNumber).substring(0, 18)}^FS`);
    
    // Column 4: Source
    result.push(`^FO235,${yPos + 3}^A0N,10,10^FH^FDKAYNAK:^FS`);
    result.push(`^FO235,${yPos + 15}^A0N,12,12^FH^FD${this.escapeZpl(data.source)}^FS`);
    
    // Column 5: Carrier
    result.push(`^FO310,${yPos + 3}^A0N,10,10^FH^FDTASIYICI:^FS`);
    result.push(`^FO310,${yPos + 15}^A0N,12,12^FH^FD${this.escapeZpl(data.carrier)}^FS`);

    return result.join('\n');
  }

  /**
   * Information notice section
   */
  private generateInfoNoticeSection(): string {
    const yPos = 240;
    return `
^FO10,${yPos}^GB380,15,2^FS
^FO15,${yPos + 3}^A0N,9,9^FH^FDBilgilendirme: Firmamiz E-fatura Mukellefıdir. Faturaniz kayitli e-posta adresinize gonderilmistir.^FS
`.trim();
  }

  /**
   * Items table section
   */
  private generateItemsSection(items: Array<{ lineNo: number; sku: string; name: string; quantity: number }>): string {
    let yPos = 260;
    const result = [];
    
    // Table border
    result.push(`^FO10,${yPos}^GB380,135,2^FS`);
    
    // Table header
    result.push(`^FO15,${yPos + 3}^A0N,10,10^FH^FDSira No^FS`);
    result.push(`^FO55,${yPos + 3}^A0N,10,10^FH^FDMalzeme/Hizmet Kodu^FS`);
    result.push(`^FO180,${yPos + 3}^A0N,10,10^FH^FDMalzeme/Hizmet Aciklamasi^FS`);
    result.push(`^FO355,${yPos + 3}^A0N,10,10^FH^FDMiktar^FS`);
    
    // Header bottom line
    yPos += 15;
    result.push(`^FO10,${yPos}^GB380,0,2^FS`);
    
    // Column dividers
    result.push(`^FO50,${yPos - 15}^GB0,135,2^FS`);  // After Sıra No
    result.push(`^FO175,${yPos - 15}^GB0,135,2^FS`); // After Kod
    result.push(`^FO350,${yPos - 15}^GB0,135,2^FS`); // After Açıklama
    
    // Items (max 5 items to fit in label)
    const maxItems = Math.min(items.length, 5);
    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      yPos += 3;
      
      // Line number
      result.push(`^FO15,${yPos}^A0N,10,10^FH^FD${item.lineNo}^FS`);
      
      // SKU
      result.push(`^FO55,${yPos}^A0N,10,10^FH^FD${this.escapeZpl(item.sku).substring(0, 15)}^FS`);
      
      // Product name (truncate if too long)
      const productName = this.escapeZpl(item.name).substring(0, 35);
      result.push(`^FO180,${yPos}^A0N,9,9^FH^FD${productName}^FS`);
      
      // Quantity
      result.push(`^FO355,${yPos}^A0N,10,10^FH^FD${item.quantity}^FS`);
      
      yPos += 12;
      
      // Row divider
      if (i < maxItems - 1) {
        result.push(`^FO10,${yPos}^GB380,0,1^FS`);
      }
    }

    return result.join('\n');
  }

  /**
   * Escape special characters for ZPL
   */
  private escapeZpl(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/_5F/g, '__5F')  // Escape existing hex codes first
      .replace(/_/g, '_5F')      // Underscore
      .replace(/\^/g, '_5E')     // Caret
      .replace(/~/g, '_7E')      // Tilde
      .replace(/\\/g, '_5C')     // Backslash
      // Turkish characters
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C');
  }

  /**
   * Split long text into multiple lines
   */
  private splitText(text: string, maxLength: number): string[] {
    if (!text) return [''];
    if (text.length <= maxLength) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxLength) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word.length > maxLength ? word.substring(0, maxLength) : word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  }
}
