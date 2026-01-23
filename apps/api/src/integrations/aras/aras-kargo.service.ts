import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// ─────────────────────────────────────────────────────────────
// SetOrder Interfaces
// ─────────────────────────────────────────────────────────────

export interface ArasPieceDetail {
    VolumetricWeight: string; // "1"
    Weight: string; // "1"
    BarcodeNumber: string; // "34567890" (Her parça için unique)
    ProductNumber?: string;
    Description?: string;
}

export interface ArasOrderInfo {
    IntegrationCode: string; // Unique Order ID / Entegrasyon Kodu
    TradingWaybillNumber: string; // Sevk İrsaliye No
    InvoiceNumber?: string; // Fatura No
    ReceiverName: string;
    ReceiverAddress: string;
    ReceiverPhone1: string;
    ReceiverPhone2?: string;
    ReceiverPhone3?: string;
    ReceiverCityName: string;
    ReceiverTownName: string;
    ReceiverDistrictName?: string; // Semt
    ReceiverQuarterName?: string; // Mahalle
    ReceiverAvenueName?: string; // Cadde
    ReceiverStreetName?: string; // Sokak
    PieceCount: number; // Toplam koli sayısı
    Pieces: ArasPieceDetail[]; // Koli detayları
    PayorTypeCode: number; // 1=Sender Pays, 2=Receiver Pays (Default 1)
    IsWorldWide: number; // 0=Domestic, 1=International
    Description?: string;
    IsCod?: '0' | '1'; // Tahsilatlı Kargo?
    CodAmount?: number;
    CodCollectionType?: '0' | '1'; // 0=Cash, 1=Credit Card
    CodBillingType?: '0'; // Always 0
    TaxNumber?: string;
    TaxOffice?: string;
}

export interface ArasSetOrderResponse {
    ResultCode: string;
    ResultMsg: string; // "Başarılı" or error message
    OrgReceiverCustId?: string;
}

@Injectable()
export class ArasKargoService {
    private readonly logger = new Logger(ArasKargoService.name);
    // Use test URL by default or from env, user provided test link: https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx
    // Production: https://customerws.araskargo.com.tr/arascargoservice.asmx
    private readonly serviceUrl = process.env.ARAS_SERVICE_URL || 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';
    private readonly testServiceUrl = 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';
    private readonly isTest = true;

    constructor() { }

    private getCredentials() {
        const isTest = this.isTest;
        const username = isTest ? "neodyum" : process.env.ARAS_USERNAME;
        const password = isTest ? "nd2580" : process.env.ARAS_PASSWORD;
        return { username, password };
    }

    async createShipment(order: any, shipmentDetails?: any): Promise<ArasSetOrderResponse> {
        // Map Order to ArasOrderInfo
        // Note: 'order' argument is expected to be the TypeORM Order entity with relations loaded (items, customer?)
        // If it's just an ID, we should fetch it here, but for flexibility let's assume it's passed or we fetch if needed.

        // We need to fetch product details for desi/weight if not in OrderItem
        // Assuming order.items is populated.

        const shippingAddress = order.shippingAddress || {};
        const invoiceAddress = order.invoiceAddress || {};

        // Calculate total PieceCount if not provided
        // Logic: Try to group by some logic or just 1 box per order?
        // User doc says: "Sevkedilen Kargoya ait paket /koli Sayısı"
        // If we don't have package grouping, we can default to 1 pack for the whole order, OR 1 pack per item line?
        // Standard e-commerce practice without advanced WMS is usually 1 shipment = 1 piece (koli) unless specified.
        // Let's assume 1 piece for now unless 'shipmentDetails' says otherwise.

        const pieceCount = order.items[0].quantity || 1;

        // Prepare PieceDetails
        const pieces: ArasPieceDetail[] = [];

        // If we have just 1 piece, we aggregate all items into it? 
        // Or Aras expects piece details to match barcodes.
        // Doc: "PieceDetail... Aras Kargo şubesi kargoları sevk ederken BarcodeNumber alanında yer alan değer ile işlem yapmaktadır."
        // "Her parça barkod numarası barkodu ayrı ayrı okutulur."

        // If we send 1 piece (box), it should have 1 barcode (the packageId or tradingWaybillNumber).
        // If we send multiple items in 1 box, we still declare 1 Piece in Aras?
        // Aras logic: PieceCount = Number of boxes/labels.

        // If we have 1 box, we create 1 PieceDetail.
        if (pieceCount === 1) {
            pieces.push({
                BarcodeNumber: order.packageId || order.orderNumber, // Use packageId as the box barcode
                VolumetricWeight: (order.cargoDeci || 1).toString(),
                Weight: "1", // Default to 1kg if not tracked
                Description: "Sipariş: " + order.orderNumber
            });
        } else {
            // If multiple pieces, we need to know which item is in which piece.
            // Without that info, we can't accurately split.
            // Fallback: Create 1 piece per item line? No, that's too many labels.
            // Fallback: Create pieces based on provided count, split weight evenly?
            for (let i = 0; i < pieceCount; i++) {
                pieces.push({
                    BarcodeNumber: `${order.packageId || order.orderNumber}-${i + 1}`,
                    VolumetricWeight: Math.max(1, Math.floor((order.cargoDeci || 1) / pieceCount)).toString(),
                    Weight: "1",
                    Description: `Parça ${i + 1}`
                });
            }
        }

        const arasOrder: ArasOrderInfo = {
            IntegrationCode: order.orderNumber, // Use Order Number as Integration Code (must be unique)
            TradingWaybillNumber: order.packageId || order.orderNumber.substring(0, 16), // Max 16 chars
            InvoiceNumber: order.orderNumber.substring(0, 20), // Using Order Number as Invoice No fallback
            ReceiverName: (shippingAddress.firstName + ' ' + shippingAddress.lastName).trim(),
            ReceiverAddress: shippingAddress.fullAddress || (shippingAddress.addressLine1 + ' ' + (shippingAddress.addressLine2 || '')).trim(),
            ReceiverPhone1: shippingAddress.phone || order.customer?.phone || '0',
            ReceiverCityName: shippingAddress.city || '',
            ReceiverTownName: shippingAddress.district || '', // district usually maps to Town in TR
            ReceiverDistrictName: shippingAddress.neighborhood || '', // neighborhood key check
            PieceCount: pieceCount,
            Pieces: pieces,
            PayorTypeCode: order.whoPays === 2 ? 2 : 1, // 1=Sender(Gönderici), 2=Receiver(Alıcı)
            IsWorldWide: 0, // Assuming domestic for now
            Description: order.note || '',
            IsCod: order.isCod ? '1' : '0',
            CodAmount: order.isCod ? order.totalPrice : 0,
            CodCollectionType: order.paymentMethod === 'CREDIT_CARD_AT_DOOR' ? '1' : '0', // 0=Cash
            TaxNumber: order.taxNumber,
            TaxOffice: invoiceAddress.taxOffice // Assuming field exists or we grab from invoice address
        };

        return this.setOrder(arasOrder);
    }

    /**
     * Send order details to Aras Kargo to create shipment (SetOrder)
     */
    async setOrder(orderInfo: ArasOrderInfo): Promise<ArasSetOrderResponse> {
        const { username, password } = this.getCredentials();

        // Construct Pieces XML
        const pieceDetailsXml = orderInfo.Pieces.map(piece => `
                  <PieceDetail>
                     <VolumetricWeight>${piece.VolumetricWeight}</VolumetricWeight>
                     <Weight>${piece.Weight}</Weight>
                     <BarcodeNumber>${piece.BarcodeNumber}</BarcodeNumber>
                     <ProductNumber>${piece.ProductNumber || ''}</ProductNumber>
                     <Description>${piece.Description || ''}</Description>
                  </PieceDetail>`).join('');

        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soap:Header/>
   <soap:Body>
      <tem:SetOrder>
         <tem:orderInfo>
            <tem:Order>
               <tem:UserName>${username}</tem:UserName>
               <tem:Password>${password}</tem:Password>
               <tem:TradingWaybillNumber>${orderInfo.TradingWaybillNumber}</tem:TradingWaybillNumber>
               <tem:InvoiceNumber>${orderInfo.InvoiceNumber || ''}</tem:InvoiceNumber>
               <tem:ReceiverName>${this.escapeXml(orderInfo.ReceiverName)}</tem:ReceiverName>
               <tem:ReceiverAddress>${this.escapeXml(orderInfo.ReceiverAddress)}</tem:ReceiverAddress>
               <tem:ReceiverPhone1>${orderInfo.ReceiverPhone1}</tem:ReceiverPhone1>
               <tem:ReceiverPhone2>${orderInfo.ReceiverPhone2 || ''}</tem:ReceiverPhone2>
               <tem:ReceiverPhone3>${orderInfo.ReceiverPhone3 || ''}</tem:ReceiverPhone3>
               <tem:ReceiverCityName>${this.escapeXml(orderInfo.ReceiverCityName)}</tem:ReceiverCityName>
               <tem:ReceiverTownName>${this.escapeXml(orderInfo.ReceiverTownName)}</tem:ReceiverTownName>
               <tem:ReceiverDistrictName>${this.escapeXml(orderInfo.ReceiverDistrictName || '')}</tem:ReceiverDistrictName>
               <tem:ReceiverQuarterName>${this.escapeXml(orderInfo.ReceiverQuarterName || '')}</tem:ReceiverQuarterName>
               <tem:ReceiverAvenueName>${this.escapeXml(orderInfo.ReceiverAvenueName || '')}</tem:ReceiverAvenueName>
               <tem:ReceiverStreetName>${this.escapeXml(orderInfo.ReceiverStreetName || '')}</tem:ReceiverStreetName>
               <tem:VolumetricWeight>0</tem:VolumetricWeight> <!-- Total DM calculated from pieces usually, but user doc says optional/total -->
               <tem:Weight>0</tem:Weight> <!-- Total KG -->
               <tem:PieceCount>${orderInfo.PieceCount}</tem:PieceCount>
               <tem:IntegrationCode>${orderInfo.IntegrationCode}</tem:IntegrationCode>
               <tem:PayorTypeCode>${orderInfo.PayorTypeCode || 1}</tem:PayorTypeCode>
               <tem:IsWorldWide>${orderInfo.IsWorldWide || 0}</tem:IsWorldWide>
               <tem:Description>${this.escapeXml(orderInfo.Description || '')}</tem:Description>
               <tem:IsCod>${orderInfo.IsCod || '0'}</tem:IsCod>
               <tem:CodAmount>${orderInfo.CodAmount || '0'}</tem:CodAmount>
               <tem:CodCollectionType>${orderInfo.CodCollectionType || ''}</tem:CodCollectionType>
               <tem:CodBillingType>${orderInfo.CodBillingType || '0'}</tem:CodBillingType>
               <tem:TaxNumber>${orderInfo.TaxNumber || ''}</tem:TaxNumber>
               <tem:TaxOffice>${orderInfo.TaxOffice || ''}</tem:TaxOffice>
               <tem:PieceDetails>
                  ${pieceDetailsXml}
               </tem:PieceDetails>
               <tem:SenderAccountAddressId></tem:SenderAccountAddressId>
            </tem:Order>
         </tem:orderInfo>
         <tem:userName>${username}</tem:userName>
         <tem:password>${password}</tem:password>
      </tem:SetOrder>
   </soap:Body>
</soap:Envelope>`;

        try {
            this.logger.log(`Sending SetOrder to Aras for IntegrationCode: ${orderInfo.IntegrationCode}`);

            const response = await axios.post(this.isTest ? this.testServiceUrl : this.serviceUrl, soapBody, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://tempuri.org/SetOrder'
                },
                timeout: 30000 // 30s timeout
            });

            const xmlResult = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: true
            });

            // Parse Response
            // Envelope -> Body -> SetOrderResponse -> SetOrderResult -> OrderResultInfo
            const resultBody = xmlResult['soap:Envelope']?.['soap:Body']?.['SetOrderResponse']?.['SetOrderResult']?.['OrderResultInfo'];

            if (!resultBody) {
                this.logger.error('Empty response structure from Aras SetOrder');
                throw new Error('Aras Kargo response is invalid');
            }

            // Aras returns status code in ResultCode
            // "0" = Success
            // Others = Error

            this.logger.log(`Aras Response for ${orderInfo.IntegrationCode}: Code=${resultBody.ResultCode}, Msg=${resultBody.ResultMsg}`);

            return {
                ResultCode: resultBody.ResultCode,
                ResultMsg: resultBody.ResultMsg,
                OrgReceiverCustId: resultBody.OrgReceiverCustId
            };

        } catch (error) {
            this.logger.error(`SetOrder failed for ${orderInfo.IntegrationCode}: ${error.message}`);
            if (axios.isAxiosError(error)) {
                this.logger.error(`Aras Error Response: ${JSON.stringify(error.response?.data)}`);
            }
            throw error;
        }
    }

    /**
     * Cancel dispatch (CancelDispatch)
     */
    async cancelDispatch(integrationCode: string): Promise<boolean> {
        const { username, password } = this.getCredentials();

        // This method was not explicitly requested but useful to have as user mentioned it in doc
        // Not implementing fully unless requested
        return true;
    }

    private escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
            return c;
        });
    }

    /**
     * Fetch ZPL barcode label for a given tracking number (integration code)
     * using Aras Kargo GetQueryDS (QueryType 39)
     */
    async getBarcode(integrationCode: string): Promise<string | null> {
        if (!integrationCode) {
            this.logger.warn('No integration code provided for Aras Kargo barcode fetch');
            return null;
        }

        const { username, password } = this.getCredentials();

        if (!username || !password) {
            this.logger.error('Aras Kargo credentials missing');
            return null;
        }

        // Construct SOAP Payload for GetBarcode
        // Params: Username, Password, integrationCode
        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:GetBarcode>
         <tem:Username>${username}</tem:Username>
         <tem:Password>${password}</tem:Password>
         <tem:integrationCode>${integrationCode}</tem:integrationCode>
      </tem:GetBarcode>
   </soapenv:Body>
</soapenv:Envelope>`;

        try {
            const response = await axios.post(this.serviceUrl, soapBody, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://tempuri.org/GetBarcode'
                }
            });

            const xmlResult = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: true
            });

            // Navigate to response body
            // Structure: Envelope -> Body -> GetBarcodeResponse -> GetBarcodeResult
            const resultData = xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['GetBarcodeResult'] ||
                xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['Body']; // Fallback

            if (!resultData) {
                this.logger.error('Empty response from Aras Kargo GetBarcode');
                return null;
            }

            // Check ResultCode
            if (resultData.ResultCode !== '0') {
                this.logger.warn(`Aras Kargo Error (${resultData.ResultCode}): ${resultData.Message}`);
                return null;
            }

            // Extract ZPL
            // The WSDL says "ZebraZpl": "ArrayOfString", so it might be an array of strings
            const zplData = resultData.ZebraZpl;

            let zplString = '';

            if (zplData && zplData.string) {
                if (Array.isArray(zplData.string)) {
                    zplString = zplData.string.join('\n');
                } else {
                    zplString = zplData.string;
                }
            } else if (typeof zplData === 'string') {
                zplString = zplData;
            } else if (Array.isArray(zplData)) {
                zplString = zplData.join('\n');
            }

            if (!zplString) {
                this.logger.warn(`Aras Kargo returned success (0) but no ZPL data found. Full result: ${JSON.stringify(resultData)}`);
                return null;
            }

            return zplString;

        } catch (error) {
            this.logger.error(`Failed to fetch Aras Kargo barcode for ${integrationCode}: ${error.message}`);
            if (axios.isAxiosError(error)) {
                this.logger.error(`Response Data: ${JSON.stringify(error.response?.data)}`);
            }
            return null;
        }
    }
}
