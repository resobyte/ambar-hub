import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

@Injectable()
export class ArasKargoService {
    private readonly logger = new Logger(ArasKargoService.name);
    private readonly serviceUrl = 'https://customerws.araskargo.com.tr/arascargoservice.asmx';

    constructor() { }

    /**
     * Fetch ZPL barcode label for a given tracking number (integration code)
     * using Aras Kargo GetQueryDS (QueryType 39)
     */
    async getBarcode(integrationCode: string): Promise<string | null> {
        if (!integrationCode) {
            this.logger.warn('No integration code provided for Aras Kargo barcode fetch');
            return null;
        }

        const username = process.env.ARAS_USERNAME;
        const password = process.env.ARAS_PASSWORD;

        if (!username || !password) {
            this.logger.error('Aras Kargo credentials missing in environment variables');
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

            // xml2js parse logic for arrays:
            // If explicitArray: false, single item is obj/string, multiple is array
            // But WSDL says ArrayOfString, so usually it wraps like <ZebraZpl><string>...</string></ZebraZpl>
            // We need to inspect what we got.

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
