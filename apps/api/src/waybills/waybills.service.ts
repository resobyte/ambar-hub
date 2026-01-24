import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waybill, WaybillType, WaybillStatus } from './entities/waybill.entity';
import { Order } from '../orders/entities/order.entity';
import { Store } from '../stores/entities/store.entity';
import { CreateWaybillDto } from './dto/waybill.dto';

@Injectable()
export class WaybillsService {
    private readonly logger = new Logger(WaybillsService.name);

    constructor(
        @InjectRepository(Waybill)
        private readonly waybillRepository: Repository<Waybill>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
    ) { }

    async create(dto: CreateWaybillDto): Promise<Waybill> {
        const order = await this.orderRepository.findOne({
            where: { id: dto.orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${dto.orderId} not found`);
        }

        const storeId = dto.storeId || order.storeId;
        const waybillNumber = await this.generateWaybillNumber(storeId);
        const htmlContent = this.generateWaybillHtml(order, waybillNumber);

        const shippingAddress = order.shippingAddress as any || {};
        const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 'Müşteri';

        const customerAddress = shippingAddress.fullAddress
            || `${shippingAddress.address1 || ''} ${shippingAddress.district || ''} ${shippingAddress.city || ''}`.trim()
            || '';

        const waybill = this.waybillRepository.create({
            waybillNumber,
            orderId: order.id,
            storeId,
            type: dto.type || WaybillType.DISPATCH,
            status: WaybillStatus.CREATED,
            htmlContent,
            customerName,
            customerAddress,
            customerPhone: shippingAddress.phone || order.customer?.phone || '',
            totalAmount: order.totalPrice || 0,
            currencyCode: order.currencyCode || 'TRY',
            notes: dto.notes,
        });

        const saved = await this.waybillRepository.save(waybill);
        this.logger.log(`Waybill created: ${waybillNumber} for order ${order.orderNumber}`);

        return saved;
    }

    async findAll(page = 1, limit = 10, filters?: {
        storeId?: string;
        type?: WaybillType;
        status?: WaybillStatus;
        startDate?: string;
        endDate?: string;
        waybillNumber?: string;
    }): Promise<{ data: Waybill[]; total: number }> {
        const query = this.waybillRepository.createQueryBuilder('waybill')
            .leftJoinAndSelect('waybill.order', 'order')
            .leftJoinAndSelect('waybill.store', 'store')
            .orderBy('waybill.createdAt', 'DESC');

        if (filters?.storeId) {
            query.andWhere('waybill.storeId = :storeId', { storeId: filters.storeId });
        }

        if (filters?.type) {
            query.andWhere('waybill.type = :type', { type: filters.type });
        }

        if (filters?.status) {
            query.andWhere('waybill.status = :status', { status: filters.status });
        }

        if (filters?.startDate) {
            query.andWhere('waybill.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters?.endDate) {
            query.andWhere('waybill.createdAt <= :endDate', { endDate: filters.endDate });
        }

        if (filters?.waybillNumber) {
            query.andWhere('waybill.waybillNumber LIKE :waybillNumber', {
                waybillNumber: `%${filters.waybillNumber}%`,
            });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }

    async findOne(id: string): Promise<Waybill> {
        const waybill = await this.waybillRepository.findOne({
            where: { id },
            relations: ['order', 'order.items', 'store'],
        });

        if (!waybill) {
            throw new NotFoundException(`Waybill ${id} not found`);
        }

        return waybill;
    }

    async findByNumber(waybillNumber: string): Promise<Waybill> {
        const waybill = await this.waybillRepository.findOne({
            where: { waybillNumber },
            relations: ['order', 'order.items', 'store'],
        });

        if (!waybill) {
            throw new NotFoundException(`Waybill ${waybillNumber} not found`);
        }

        return waybill;
    }

    async markAsPrinted(id: string, userId?: string): Promise<Waybill> {
        const waybill = await this.findOne(id);
        waybill.status = WaybillStatus.PRINTED;
        waybill.printedAt = new Date();
        waybill.printedBy = userId || null;
        return this.waybillRepository.save(waybill);
    }

    async cancel(id: string): Promise<Waybill> {
        const waybill = await this.findOne(id);
        waybill.status = WaybillStatus.CANCELLED;
        return this.waybillRepository.save(waybill);
    }

    private async generateWaybillNumber(storeId?: string): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = 'IRS';
        const prefixYear = `${prefix}${year}`;

        const lastWaybill = await this.waybillRepository
            .createQueryBuilder('waybill')
            .where('waybill.waybillNumber LIKE :pattern', { pattern: `${prefixYear}%` })
            .orderBy('waybill.waybillNumber', 'DESC')
            .getOne();

        let nextSequence = 1;
        if (lastWaybill && lastWaybill.waybillNumber.startsWith(prefixYear)) {
            const sequencePart = lastWaybill.waybillNumber.substring(prefixYear.length);
            const lastSequence = parseInt(sequencePart, 10);
            if (!isNaN(lastSequence)) {
                nextSequence = lastSequence + 1;
            }
        }

        return `${prefixYear}${String(nextSequence).padStart(6, '0')}`;
    }

    private generateWaybillHtml(order: Order, waybillNumber: string): string {
        const shippingAddress = order.shippingAddress as any || {};
        const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 'Müşteri';

        const address = shippingAddress.fullAddress
            || `${shippingAddress.address1 || ''} ${shippingAddress.district || ''} ${shippingAddress.city || ''}`.trim()
            || 'Adres bilgisi yok';

        const phone = shippingAddress.phone || order.customer?.phone || '';

        const items = order.items || [];
        const itemRows = items.map((item, index) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const quantity = Number(item.quantity) || 1;
            return `
            <tr>
                <td>${index + 1}</td>
                <td>${item.barcode || '-'}</td>
                <td>${item.productName || 'Ürün'}</td>
                <td style="text-align: center">${quantity}</td>
                <td style="text-align: right">${unitPrice.toFixed(2)} ₺</td>
                <td style="text-align: right">${(unitPrice * quantity).toFixed(2)} ₺</td>
            </tr>
        `;
        }).join('');

        const totalAmount = Number(order.totalPrice) || 0;

        return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>İrsaliye - ${waybillNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            margin: 20mm;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 18pt;
        }
        .header .waybill-number {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 5px;
        }
        .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .info-box {
            width: 48%;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 11pt;
            border-bottom: 1px solid #999;
            padding-bottom: 5px;
        }
        .info-box p {
            margin: 5px 0;
            font-size: 10pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 10pt;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            border-top: 1px solid #000;
            padding-top: 10px;
            text-align: center;
        }
        @media print {
            body { margin: 10mm; }
            @page { size: A4; margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SATIŞ İRSALİYESİ</h1>
        <div class="waybill-number">${waybillNumber}</div>
    </div>

    <div class="info-section">
        <div class="info-box">
            <h3>ALICI BİLGİLERİ</h3>
            <p><strong>${customerName}</strong></p>
            <p>${address}</p>
            ${phone ? `<p>Tel: ${phone}</p>` : ''}
        </div>
        <div class="info-box" style="text-align: right;">
            <h3>İRSALİYE BİLGİLERİ</h3>
            <p><strong>İrsaliye No:</strong> ${waybillNumber}</p>
            <p><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
            <p><strong>Sipariş No:</strong> ${order.orderNumber}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 5%">#</th>
                <th style="width: 15%">Barkod</th>
                <th style="width: 40%">Ürün Adı</th>
                <th style="width: 10%; text-align: center">Miktar</th>
                <th style="width: 15%; text-align: right">Birim Fiyat</th>
                <th style="width: 15%; text-align: right">Tutar</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="5" style="text-align: right"><strong>TOPLAM:</strong></td>
                <td style="text-align: right"><strong>${totalAmount.toFixed(2)} ₺</strong></td>
            </tr>
        </tfoot>
    </table>

    <div class="footer">
        <div class="signature-box">
            <p>TESLİM EDEN</p>
            <br><br>
            <p>İmza / Tarih</p>
        </div>
        <div class="signature-box">
            <p>TESLİM ALAN</p>
            <br><br>
            <p>İmza / Tarih</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}
