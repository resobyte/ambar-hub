import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface ArasPieceDetail {
    VolumetricWeight: string;
    Weight: string;
    BarcodeNumber: string;
    ProductNumber?: string;
    Description?: string;
}

export interface ArasOrderInfo {
    IntegrationCode: string;
    InvoiceNumber?: string;
    ReceiverName: string;
    ReceiverAddress: string;
    ReceiverPhone1: string;
    ReceiverCityName: string;
    ReceiverTownName: string;
    VolumetricWeight: number;
    PieceCount: number;
    Pieces: ArasPieceDetail[];
    PayorTypeCode: number;
}

export interface ArasSetOrderResponse {
    ResultCode: string;
    ResultMsg: string;
    OrgReceiverCustId?: string;
}

@Injectable()
export class ArasKargoService {
    private readonly logger = new Logger(ArasKargoService.name);
    private readonly serviceUrl = process.env.ARAS_SERVICE_URL || 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';
    private readonly testServiceUrl = 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';
    private readonly isTest = process.env.ARAS_TEST_MODE !== 'false';

    private getCredentials() {
        const isTest = this.isTest;
        const username = isTest ? "neodyum" : process.env.ARAS_USERNAME;
        const password = isTest ? "nd2580" : process.env.ARAS_PASSWORD;
        return { username, password };
    }

    async createShipment(order: any): Promise<ArasSetOrderResponse> {
        const shippingAddress = order.shippingAddress || {};

        const volumetricWeight = Number(order.cargoDeci) || 1;
        const pieceCount = 1;
        const pieces: ArasPieceDetail[] = [{
            BarcodeNumber: order.packageId || order.orderNumber,
            VolumetricWeight: volumetricWeight.toString(),
            Weight: "1",
        }];

        const arasOrder: ArasOrderInfo = {
            IntegrationCode: order.packageId || order.orderNumber,
            InvoiceNumber: order.orderNumber,
            ReceiverName: ((shippingAddress.firstName || '') + ' ' + (shippingAddress.lastName || '')).trim() || 'Alıcı',
            ReceiverAddress: shippingAddress.fullAddress || shippingAddress.addressDetail || ((shippingAddress.addressLine1 || '') + ' ' + (shippingAddress.addressLine2 || '')).trim() || 'Adres',
            ReceiverPhone1: shippingAddress.phone || order.customer?.phone || '05000000000',
            ReceiverCityName: shippingAddress.city || 'İstanbul',
            ReceiverTownName: shippingAddress.district || 'Merkez',
            VolumetricWeight: volumetricWeight,
            PieceCount: pieceCount,
            Pieces: pieces,
            PayorTypeCode: order.whoPays === 2 ? 2 : 1,
        };

        return this.setOrder(arasOrder);
    }

    async setOrder(orderInfo: ArasOrderInfo): Promise<ArasSetOrderResponse> {
        const { username, password } = this.getCredentials();

        const pieceDetailsXml = orderInfo.Pieces.map(piece => `
                <PieceDetail>
                  <VolumetricWeight>${piece.VolumetricWeight}</VolumetricWeight>
                  <Weight>${piece.Weight}</Weight>
                  <BarcodeNumber>${piece.BarcodeNumber}</BarcodeNumber>
                  <ProductNumber/>
                  <Description/>
                </PieceDetail>`).join('');

        const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <orderInfo>
        <Order>
          <UserName>${username}</UserName>
          <Password>${password}</Password>
          <TradingsetNumber/>
          <InvoiceNumber>${orderInfo.InvoiceNumber || ''}</InvoiceNumber>
          <ReceiverName>${this.escapeXml(orderInfo.ReceiverName)}</ReceiverName>
          <ReceiverAddress>${this.escapeXml(orderInfo.ReceiverAddress)}</ReceiverAddress>
          <ReceiverPhone1>${orderInfo.ReceiverPhone1}</ReceiverPhone1>
          <ReceiverCityName>${this.escapeXml(orderInfo.ReceiverCityName)}</ReceiverCityName>
          <ReceiverTownName>${this.escapeXml(orderInfo.ReceiverTownName)}</ReceiverTownName>
          <VolumetricWeight>${orderInfo.VolumetricWeight}</VolumetricWeight>
          <PieceCount>${orderInfo.PieceCount}</PieceCount>
          <IntegrationCode>${orderInfo.IntegrationCode}</IntegrationCode>
          <PayorTypeCode>${orderInfo.PayorTypeCode || 1}</PayorTypeCode>
          <SenderAccountAddressId></SenderAccountAddressId>
          <PieceDetails>${pieceDetailsXml}
          </PieceDetails>
        </Order>
      </orderInfo>
      <userName>${username}</userName>
      <password>${password}</password>
    </SetOrder>
  </soap:Body>
</soap:Envelope>`;

        try {
            this.logger.log(`Sending SetOrder to Aras for IntegrationCode: ${orderInfo.IntegrationCode}`);

            const response = await axios.post(this.isTest ? this.testServiceUrl : this.serviceUrl, soapBody, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://tempuri.org/SetOrder'
                },
                timeout: 30000
            });

            const xmlResult = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: true
            });

            const resultBody = xmlResult['soap:Envelope']?.['soap:Body']?.['SetOrderResponse']?.['SetOrderResult']?.['OrderResultInfo'];

            if (!resultBody) {
                this.logger.error('Empty response structure from Aras SetOrder');
                throw new Error('Aras Kargo response is invalid');
            }

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

            const resultData = xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['GetBarcodeResult'] ||
                xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['Body'];

            if (!resultData) {
                this.logger.error('Empty response from Aras Kargo GetBarcode');
                return null;
            }

            if (resultData.ResultCode !== '0') {
                this.logger.warn(`Aras Kargo Error (${resultData.ResultCode}): ${resultData.Message}`);
                return null;
            }

            const zplData = resultData.ZebraZpl;
            let zplString = '';

            if (zplData && zplData.string) {
                zplString = Array.isArray(zplData.string) ? zplData.string.join('\n') : zplData.string;
            } else if (typeof zplData === 'string') {
                zplString = zplData;
            } else if (Array.isArray(zplData)) {
                zplString = zplData.join('\n');
            }

            if (!zplString) {
                this.logger.warn(`Aras Kargo returned success (0) but no ZPL data found.`);
                return null;
            }

            return zplString;

        } catch (error) {
            this.logger.error(`Failed to fetch Aras Kargo barcode for ${integrationCode}: ${error.message}`);
            return null;
        }
    }

    private escapeXml(unsafe: string): string {
        if (!unsafe) return '';
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
}
