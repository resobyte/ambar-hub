import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core';
import Oas from 'oas';
import APICore from 'api/dist/core';
declare class SDK {
    spec: Oas;
    core: APICore;
    constructor();
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config: ConfigOptions): void;
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    auth(...values: string[] | number[]): this;
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    server(url: string, variables?: {}): void;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve paketlenmesi planlanan bir siparişi
     * kalemi (orderLineId) için, hangi kargo firmalarıyla gönderim yapılabileceğini listelemek
     * amacıyla kullanılır
     *
     * @summary Paketlenecek Siparisin Hangi Kargo Firmasi Ile Degistirilebilecegini Listeleme
     * @throws FetchError<400, types.GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineidResponse400> Bad Request
     * @throws FetchError<401, types.GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineidResponse401> Unauthorized
     * @throws FetchError<500, types.GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineidResponse500> Internal Server Error
     */
    getDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineid(metadata: types.GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineidMetadataParam): Promise<FetchResponse<200, types.GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineidResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve henüz paketlenmemiş bir sipariş
     * kaleminin (lineId) iptal edilmesi için kullanılır
     *
     * @summary Iptal Bilgisi Gonderme
     * @throws FetchError<400, types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantResponse400> Bad Request
     * @throws FetchError<401, types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantResponse401> Unauthorized
     * @throws FetchError<500, types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantResponse500> Internal Server Error
     */
    postLineitemsMerchantidMerchantidIdLineidCancelbymerchant(body: types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantBodyParam, metadata: types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantMetadataParam): Promise<FetchResponse<200, types.PostLineitemsMerchantidMerchantidIdLineidCancelbymerchantResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait bir sipariş kalemi (id) için kargo
     * firmasını değiştirmek amacıyla kullanılır
     *
     * @summary Paketlenecek Siparisin Kargo Firmasini Degistirme
     * @throws FetchError<400, types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyResponse400> Bad Request
     * @throws FetchError<401, types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyResponse401> Unauthorized
     * @throws FetchError<500, types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyResponse500> Internal Server Error
     */
    putLineitemsMerchantidMerchantidOrderlineidIdCargocompany(body: types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyBodyParam, metadata: types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyMetadataParam): Promise<FetchResponse<204, types.PutLineitemsMerchantidMerchantidOrderlineidIdCargocompanyResponse204>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait bir sipariş kalemi (id) için işçilik
     * maliyetini güncellemek amacıyla kullanılır (sadece altın ürünler için geçerlidir)
     *
     * @summary Siparis Kalemi Iscilik Maliyeti Guncelleme
     * @throws FetchError<400, types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostResponse400> Bad Request
     * @throws FetchError<401, types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostResponse401> Unauthorized
     * @throws FetchError<500, types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostResponse500> Internal Server Error
     */
    putLineitemsMerchantidMerchantidOrderlineidIdLaborcost(body: types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostBodyParam, metadata: types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostMetadataParam): Promise<FetchResponse<204, types.PutLineitemsMerchantidMerchantidOrderlineidIdLaborcostResponse204>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve belirli bir sipariş kalemi
     * (lineItemId) için, aynı pakete konulabilecek diğer kalemleri listelemek amacıyla
     * kullanılır
     *
     * @summary Ayni Pakete Konulabilecek Kalemleri Listeleme
     * @throws FetchError<400, types.GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemidResponse400> Bad Request
     * @throws FetchError<401, types.GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemidResponse401> Unauthorized
     * @throws FetchError<500, types.GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemidResponse500> Internal Server Error
     */
    getLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemid(metadata: types.GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemidMetadataParam): Promise<FetchResponse<200, types.GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemidResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve sipariş alındı statüsündeki
     * kalemleri listelemek için kullanılır
     *
     * @summary Odemesi Tamamlanmis Siparisleri Listeleme
     * @throws FetchError<400, types.GetOrdersMerchantidMerchantidResponse400> Bad Request
     * @throws FetchError<401, types.GetOrdersMerchantidMerchantidResponse401> Unauthorized
     * @throws FetchError<500, types.GetOrdersMerchantidMerchantidResponse500> Internal Server Error
     */
    getOrdersMerchantidMerchantid(metadata: types.GetOrdersMerchantidMerchantidMetadataParam): Promise<FetchResponse<200, types.GetOrdersMerchantidMerchantidResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait iptal edilmiş siparişleri listelemek
     * için kullanılır
     *
     * @summary Iptal Siparis Bilgileri Listeleme
     * @throws FetchError<400, types.GetOrdersMerchantidMerchantidCancelledResponse400> Bad Request
     * @throws FetchError<401, types.GetOrdersMerchantidMerchantidCancelledResponse401> Unauthorized
     * @throws FetchError<500, types.GetOrdersMerchantidMerchantidCancelledResponse500> Internal Server Error
     */
    getOrdersMerchantidMerchantidCancelled(metadata: types.GetOrdersMerchantidMerchantidCancelledMetadataParam): Promise<FetchResponse<200, types.GetOrdersMerchantidMerchantidCancelledResponse200>>;
    /**
     * Bu servis, belirli bir sipariş numarasına ait detaylı bilgileri listelemek için
     * kullanılır
     *
     * @summary Siparise Ait Detay Listeleme
     * @throws FetchError<400, types.GetOrdersMerchantidMerchantidOrdernumberOrdernumberResponse400> Bad Request
     * @throws FetchError<401, types.GetOrdersMerchantidMerchantidOrdernumberOrdernumberResponse401> Unauthorized
     * @throws FetchError<500, types.GetOrdersMerchantidMerchantidOrdernumberOrdernumberResponse500> Internal Server Error
     */
    getOrdersMerchantidMerchantidOrdernumberOrdernumber(metadata: types.GetOrdersMerchantidMerchantidOrdernumberOrdernumberMetadataParam): Promise<FetchResponse<200, types.GetOrdersMerchantidMerchantidOrdernumberOrdernumberResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ödemesi beklenen siparişleri listelemek
     * için kullanılır
     *
     * @summary Odemesi Beklenen Siparisleri Listeleme
     * @throws FetchError<400, types.GetOrdersMerchantidMerchantidPaymentawaitingResponse400> Bad Request
     * @throws FetchError<401, types.GetOrdersMerchantidMerchantidPaymentawaitingResponse401> Unauthorized
     * @throws FetchError<500, types.GetOrdersMerchantidMerchantidPaymentawaitingResponse500> Internal Server Error
     */
    getOrdersMerchantidMerchantidPaymentawaiting(metadata: types.GetOrdersMerchantidMerchantidPaymentawaitingMetadataParam): Promise<FetchResponse<200, types.GetOrdersMerchantidMerchantidPaymentawaitingResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait paketleri listelemek için kullanılır
     *
     * @summary Saticiya Ait Paket Bilgilerini Listeleme
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantid(metadata: types.GetPackagesMerchantidMerchantidMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait olan ve belirtilen sipariş kalemlerinin
     * paketlenmesi için kullanılır
     *
     * @summary Kalem veya Kalemleri Paketleme
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantid(body: types.PostPackagesMerchantidMerchantidBodyParam, metadata: types.PostPackagesMerchantidMerchantidMetadataParam): Promise<FetchResponse<201, types.PostPackagesMerchantidMerchantidResponse201>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait teslim edilmiş paketleri listelemek
     * için kullanılır
     *
     * @summary Teslim Edilen Siparislerin Listelenmesi
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidDeliveredResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidDeliveredResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidDeliveredResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidDelivered(metadata: types.GetPackagesMerchantidMerchantidDeliveredMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidDeliveredResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait faturası sisteme yüklenmemiş tüm
     * paketleri listelemek için kullanılır.
     *
     * @summary Faturası Yüklenmemiş Siparişlerin Listelenmesi
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidMissingInvoiceResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidMissingInvoiceResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidMissingInvoiceResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidMissingInvoice(metadata: types.GetPackagesMerchantidMerchantidMissingInvoiceMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidMissingInvoiceResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve paketleme işlemi tamamlanmış bir
     * siparişin hangi kargo firmaları ile gönderilebileceğini listelemek amacıyla kullanılır
     *
     * @summary Paketli Siparisin Hangi Kargo Firmasi Ile Degistirilebilecegini Listeleme
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompaniesResponse400> Bad Request
     * @throws FetchError<404, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompaniesResponse404> Not Found
     */
    getPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompanies(metadata: types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompaniesMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompaniesResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait ve paketlenmiş bir siparişin kargo
     * firmasını değiştirmek için kullanılır
     *
     * @summary Paketli Siparisin Kargo Firmasini Degistirme
     * @throws FetchError<400, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyResponse400> Bad Request
     * @throws FetchError<401, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyResponse401> Unauthorized
     * @throws FetchError<500, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyResponse500> Internal Server Error
     */
    putPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompany(body: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyBodyParam, metadata: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyMetadataParam): Promise<FetchResponse<204, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompanyResponse204>>;
    /**
     * Bu servis, belirli bir paket numarasına (packageNumber) ait fatura bilgisini eklemek
     * için kullanılır
     *
     * @summary Fatura Linki Gonderme
     * @throws FetchError<400, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceResponse400> Bad Request
     * @throws FetchError<401, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceResponse401> Unauthorized
     * @throws FetchError<500, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceResponse500> Internal Server Error
     */
    putPackagesMerchantidMerchantidPackagenumberPackagenumberInvoice(body: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceBodyParam, metadata: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceMetadataParam): Promise<FetchResponse<204, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoiceResponse204>>;
    /**
     * Bu servis, belirli bir paket numarası (packagenumber) ile ilişkili kargo bilgilerini
     * listelemek için kullanılır
     *
     * @summary Paket Icin Kargo Bilgilerini Listeleme
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidPackagenumberPackagenumber(metadata: types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberResponse200>>;
    /**
     * Bu servis, belirli bir paket numarası (packagenumber) için teslimat durumunu teslim
     * edildi olarak güncellemek amacıyla kullanılır
     *
     * @summary Teslimat Statusu Iletme (Teslim Edildi)
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantidPackagenumberPackagenumberDeliver(body: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverBodyParam, metadata: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverMetadataParam): Promise<FetchResponse<200, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliverResponse200>>;
    /**
     * Bu servis, belirli bir paket numarası (packagenumber) için teslimat durumunu kargoda
     * olarak güncellemek amacıyla kullanılır
     *
     * @summary Teslimat Statusu Iletme(Kargoda)
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantidPackagenumberPackagenumberIntransit(body: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitBodyParam, metadata: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitMetadataParam): Promise<FetchResponse<200, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransitResponse200>>;
    /**
     * Bu servis, belirli bir paket numarasına (packagenumber) ve satıcıya (merchantId) ait
     * paket için ortak barkod oluşturulmasını sağlar
     *
     * @summary Ortak Barkod Olusturma
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabelsResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabelsResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabelsResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidPackagenumberPackagenumberLabels(metadata: types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabelsMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabelsResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait mevcut paketi (packageNumber) bozarak,
     * paketlenecek kalemleri paketlemek ve iptal edilecek de kalemleri iptal etmek için
     * kullanılır
     *
     * @summary Paket Bolme
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantidPackagenumberPackagenumberSplit(body: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitBodyParam, metadata: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitMetadataParam): Promise<FetchResponse<200, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplitResponse200>>;
    /**
     * Bu servis, belirli bir paket numarası (packagenumber) için teslimat durumunu teslim
     * edilemedi olarak güncellemek amacıyla kullanılır
     *
     * @summary Teslimat Statusu Iletme(Teslim Edilemedi)
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliver(body: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverBodyParam, metadata: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverMetadataParam): Promise<FetchResponse<200, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliverResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait mevcut bir paketi (packagenumber)
     * bozmak için kullanılır
     *
     * @summary Paket Bozma
     * @throws FetchError<400, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackResponse400> Bad Request
     * @throws FetchError<401, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackResponse401> Unauthorized
     * @throws FetchError<404, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackResponse404> Not Found
     * @throws FetchError<500, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackResponse500> Internal Server Error
     */
    postPackagesMerchantidMerchantidPackagenumberPackagenumberUnpack(metadata: types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackMetadataParam): Promise<FetchResponse<200, types.PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpackResponse200>>;
    /**
     * Bu servis, belirli bir paket numarasına (packagenumber) ve satıcıya (merchantId) ait
     * paketin depo bilgilerini güncellemek için kullanılır
     *
     * @summary Paket Bilgilerinde Depo Bilgisi Güncelleme
     * @throws FetchError<400, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseResponse400> Bad Request
     * @throws FetchError<401, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseResponse401> Unauthorized
     * @throws FetchError<500, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseResponse500> Internal Server Error
     */
    putPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouse(body: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseBodyParam, metadata: types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseMetadataParam): Promise<FetchResponse<204, types.PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouseResponse204>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait kargoya verilen paketleri listelemek
     * için kullanılır
     *
     * @summary Kargoya Verilen Siparislerin Listelenmesi
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidShippedResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidShippedResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidShippedResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidShipped(metadata: types.GetPackagesMerchantidMerchantidShippedMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidShippedResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait bozulan paketlerin bilgilerini
     * listelemek için kullanılır
     *
     * @summary Bozulan (Unpack) Paket Bilgilerini Listeleme
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidStatusUnpackedResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidStatusUnpackedResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidStatusUnpackedResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidStatusUnpacked(metadata: types.GetPackagesMerchantidMerchantidStatusUnpackedMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidStatusUnpackedResponse200>>;
    /**
     * Bu servis, belirli bir satıcıya (merchantId) ait teslim edilememiş paketlerin
     * bilgilerini listelemek için kullanılır
     *
     * @summary Teslim Edilemedi Siparislerin Listelenmesi
     * @throws FetchError<400, types.GetPackagesMerchantidMerchantidUndeliveredResponse400> Bad Request
     * @throws FetchError<401, types.GetPackagesMerchantidMerchantidUndeliveredResponse401> Unauthorized
     * @throws FetchError<500, types.GetPackagesMerchantidMerchantidUndeliveredResponse500> Internal Server Error
     */
    getPackagesMerchantidMerchantidUndelivered(metadata: types.GetPackagesMerchantidMerchantidUndeliveredMetadataParam): Promise<FetchResponse<200, types.GetPackagesMerchantidMerchantidUndeliveredResponse200>>;
}
declare const createSDK: SDK;
export = createSDK;
