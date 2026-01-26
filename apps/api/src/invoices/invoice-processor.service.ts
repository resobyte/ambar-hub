import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';

/**
 * Background job service for processing pending invoices
 * Runs every 5 minutes to process PENDING invoices and send them to Uyumsoft
 */
@Injectable()
export class InvoiceProcessorService {
    private readonly logger = new Logger(InvoiceProcessorService.name);
    private isProcessing = false;

    constructor(
        private readonly invoicesService: InvoicesService,
    ) {}

    /**
     * Cron job that runs every 5 minutes
     * Processes all pending invoices
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async processPendingInvoicesJob(): Promise<void> {
        // Prevent concurrent processing
        if (this.isProcessing) {
            this.logger.warn('Previous invoice processing job still running, skipping...');
            return;
        }

        this.isProcessing = true;
        this.logger.log('Starting pending invoice processing job...');

        try {
            const result = await this.invoicesService.processAllPendingInvoices(50);

            if (result.processed > 0) {
                this.logger.log(
                    `Invoice processing completed: ${result.succeeded}/${result.processed} succeeded, ${result.failed} failed`,
                );

                // Log errors for debugging
                if (result.failed > 0) {
                    const errors = result.results.filter(r => r.status === 'ERROR');
                    errors.forEach(err => {
                        this.logger.error(`Invoice error for order ${err.orderId}: ${err.error}`);
                    });
                }
            } else {
                this.logger.debug('No pending invoices to process');
            }
        } catch (error) {
            this.logger.error(`Invoice processing job failed: ${error.message}`, error.stack);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Manual trigger for processing pending invoices
     * Can be called via API for immediate processing
     */
    async manualProcessPendingInvoices(limit: number = 50): Promise<{
        success: boolean;
        processed: number;
        succeeded: number;
        failed: number;
        results: Array<{ invoiceId: string; orderId: string; status: string; error?: string }>;
    }> {
        this.logger.log(`Manual invoice processing triggered with limit ${limit}`);
        return this.invoicesService.processAllPendingInvoices(limit);
    }
}
