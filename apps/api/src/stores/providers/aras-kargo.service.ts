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
    _request?: any;
    _response?: any;
    _durationMs?: number;
}

export interface ArasGetBarcodeResponse {
    zpl: string | null;
    resultCode?: string;
    resultMsg?: string;
    _request?: any;
    _response?: any;
    _durationMs?: number;
}

export interface ArasCargoCredentials {
    customerCode?: string;
    username: string;
    password: string;
}

@Injectable()
export class ArasKargoService {
    private readonly logger = new Logger(ArasKargoService.name);
    private readonly serviceUrl = process.env.ARAS_SERVICE_URL || 'https://customerws.araskargo.com.tr/arascargoservice.asmx';
    private readonly testServiceUrl = 'https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx';

    private getDefaultCredentials(): ArasCargoCredentials {
        const username = process.env.ARAS_USERNAME || '';
        const password = process.env.ARAS_PASSWORD || '';
        const customerCode = process.env.ARAS_CUSTOMER_CODE || '';
        return { username, password, customerCode };
    }

    async createShipment(order: any, credentials?: ArasCargoCredentials): Promise<ArasSetOrderResponse> {
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

        return this.setOrder(arasOrder, credentials);
    }

    async setOrder(orderInfo: ArasOrderInfo, credentials?: ArasCargoCredentials): Promise<ArasSetOrderResponse> {
        const { username, password } = credentials || this.getDefaultCredentials();

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

        const startTime = Date.now();
        const endpoint = this.serviceUrl;
        const requestPayload = {
            endpoint,
            method: 'SetOrder',
            orderInfo: { ...orderInfo },
        };

        try {
            this.logger.log(`Sending SetOrder to Aras for IntegrationCode: ${orderInfo.IntegrationCode}`);

            const response = await axios.post(endpoint, soapBody, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://tempuri.org/SetOrder'
                },
                timeout: 30000
            });

            const durationMs = Date.now() - startTime;

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
                OrgReceiverCustId: resultBody.OrgReceiverCustId,
                _request: requestPayload,
                _response: resultBody,
                _durationMs: durationMs,
            };

        } catch (error) {
            const durationMs = Date.now() - startTime;
            this.logger.error(`SetOrder failed for ${orderInfo.IntegrationCode}: ${error.message}`);
            
            const errorResponse = axios.isAxiosError(error) ? error.response?.data : error.message;
            if (axios.isAxiosError(error)) {
                this.logger.error(`Aras Error Response: ${JSON.stringify(error.response?.data)}`);
            }

            const err = error as Error & { _request?: any; _response?: any; _durationMs?: number };
            err._request = requestPayload;
            err._response = errorResponse;
            err._durationMs = durationMs;
            throw err;
        }
    }

    async getBarcode(integrationCode: string, credentials?: ArasCargoCredentials): Promise<ArasGetBarcodeResponse> {
        if (!integrationCode) {
            this.logger.warn('No integration code provided for Aras Kargo barcode fetch');
            return { zpl: null };
        }

        const { username, password } = credentials || this.getDefaultCredentials();

        if (!username || !password) {
            this.logger.error('Aras Kargo credentials missing');
            return { zpl: null };
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

        const startTime = Date.now();
        const endpoint = this.serviceUrl;
        const requestPayload = {
            endpoint,
            method: 'GetBarcode',
            integrationCode,
        };

        try {
            const response = await axios.post(endpoint, soapBody, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://tempuri.org/GetBarcode'
                }
            });

            const durationMs = Date.now() - startTime;

            const xmlResult = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: true
            });

            const resultData = xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['GetBarcodeResult'] ||
                xmlResult['soap:Envelope']?.['soap:Body']?.['GetBarcodeResponse']?.['Body'];

            if (!resultData) {
                this.logger.error('Empty response from Aras Kargo GetBarcode');
                return {
                    zpl: null,
                    _request: requestPayload,
                    _response: { error: 'Empty response' },
                    _durationMs: durationMs,
                };
            }

            if (resultData.ResultCode !== '0') {
                this.logger.warn(`Aras Kargo Error (${resultData.ResultCode}): ${resultData.Message}`);
                return {
                    zpl: null,
                    resultCode: resultData.ResultCode,
                    resultMsg: resultData.Message,
                    _request: requestPayload,
                    _response: resultData,
                    _durationMs: durationMs,
                };
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
            }

            return {
                zpl: zplString || null,
                resultCode: resultData.ResultCode,
                resultMsg: resultData.Message,
                _request: requestPayload,
                _response: { ResultCode: resultData.ResultCode, Message: resultData.Message, hasZpl: !!zplString },
                _durationMs: durationMs,
            };

        } catch (error) {
            const durationMs = Date.now() - startTime;
            this.logger.error(`Failed to fetch Aras Kargo barcode for ${integrationCode}: ${error.message}`);
            return {
                zpl: null,
                _request: requestPayload,
                _response: { error: error.message },
                _durationMs: durationMs,
            };
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
