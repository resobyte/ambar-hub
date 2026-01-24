import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    /**
     * Create invoice from order and send to Uyumsoft
     */
    @Post('create-from-order/:orderId')
    async createFromOrder(
        @Param('orderId') orderId: string,
        @Body() options?: {
            branchCode?: string;
            docTraCode?: string;
            costCenterCode?: string;
            whouseCode?: string;
            cardCode?: string;
        },
    ) {
        return this.invoicesService.createInvoiceFromOrder(orderId, options);
    }

    /**
     * Create bulk invoices from multiple orders and send to Uyumsoft
     * Uses InsertInvoiceMulti endpoint
     */
    @Post('create-bulk')
    async createBulk(
        @Body() body: {
            orderIds: string[];
            options?: {
                branchCode?: string;
                docTraCode?: string;
                costCenterCode?: string;
                whouseCode?: string;
            };
        },
    ) {
        return this.invoicesService.createBulkInvoices(body.orderIds, body.options);
    }

    /**
     * Get pending invoices for processing
     */
    @Get('pending')
    async getPendingInvoices(@Query('limit') limit = 50) {
        return {
            success: true,
            data: await this.invoicesService.getPendingInvoices(+limit),
        };
    }

    /**
     * Process a single pending invoice
     */
    @Post(':id/process')
    async processPendingInvoice(@Param('id') id: string) {
        return {
            success: true,
            data: await this.invoicesService.processPendingInvoice(id),
        };
    }

    /**
     * Process all pending invoices (batch job)
     */
    @Post('process-pending')
    async processAllPendingInvoices(@Body() body?: { limit?: number }) {
        return this.invoicesService.processAllPendingInvoices(body?.limit);
    }

    /**
     * Retry failed invoice
     */
    @Post(':id/retry')
    async retryInvoice(@Param('id') id: string) {
        return this.invoicesService.retryInvoice(id);
    }

    /**
     * Get all invoices with pagination
     */
    @Get()
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('status') status?: string,
        @Query('documentType') documentType?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('customerName') customerName?: string,
        @Query('cardCode') cardCode?: string,
        @Query('invoiceNumber') invoiceNumber?: string,
        @Query('edocNo') edocNo?: string,
    ) {
        return this.invoicesService.findAll(+page, +limit, {
            status,
            documentType,
            startDate,
            endDate,
            customerName,
            cardCode,
            invoiceNumber,
            edocNo
        });
    }

    /**
     * Get invoice by ID
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }

    /**
     * Get invoice by order ID
     */
    @Get('by-order/:orderId')
    async findByOrderId(@Param('orderId') orderId: string) {
        return this.invoicesService.findByOrderId(orderId);
    }

    /**
     * Get invoice PDF/HTML
     */
    @Get(':id/pdf')
    async getInvoicePdf(@Param('id') id: string) {
        return this.invoicesService.getInvoicePdf(id);
    }
}
