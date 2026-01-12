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
    ) {
        return this.invoicesService.findAll(+page, +limit);
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
