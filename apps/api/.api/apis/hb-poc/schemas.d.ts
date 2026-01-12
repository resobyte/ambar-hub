declare const GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineid: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketlenecek kalemin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly orderLineId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketlenecek kalemin unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId", "orderLineId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly Id: {
                        readonly description: "Kargo firmasının unique değeri";
                        readonly type: "integer";
                    };
                    readonly IsActive: {
                        readonly description: "Kargo firmasının aktif olup olmadığı bilgisi";
                        readonly type: "boolean";
                    };
                    readonly LogoUrl: {
                        readonly description: "Kargo firmasının Logo URL bilgisi";
                        readonly type: "string";
                    };
                    readonly Name: {
                        readonly description: "Kargo firmasının isim bilgisi";
                        readonly type: "string";
                    };
                    readonly ShortName: {
                        readonly description: "Kargo firmasının kısa isim bilgisi";
                        readonly type: "string";
                    };
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemid: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Kalemin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly lineItemId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Kalemin unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId", "lineItemId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly lineItems: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly lineItemId: {
                                readonly description: "Aynı pakete girebilecek kalemin unique Id bilgisi";
                                readonly type: "string";
                            };
                            readonly orderNumber: {
                                readonly description: "Aynı pakete girebilecek kalemlerin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly quantity: {
                                readonly description: "Aynı pakete girebilecek kalemin miktarı";
                                readonly type: "integer";
                            };
                        };
                    };
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetOrdersMerchantidMerchantid: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Satıcının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren eklenen kalemler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce eklenmiş kalemler esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar kalem listelenir, ancak en fazla ve varsayılan olarak 100 adet gösterilir. Limit değeri girilmediğinde hata oluşacaktır.";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Ödemesi tamamlanmış kalem listesi";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly barcode: {
                                readonly description: "Paketin teslimat numarası";
                                readonly type: "string";
                            };
                            readonly bnplCommissionAmount: {
                                readonly description: "Satıcıdan alınan BNPL işlem ücreti tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly canCreatePackage: {
                                readonly description: "Ödemenin alınıp alınmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly cargoCompany: {
                                readonly description: "Kargo firmasının isim bilgisi";
                                readonly type: "string";
                            };
                            readonly cargoCompanyModel: {
                                readonly description: "Kargo bilgisi";
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly description: "Kargo firmasının unique değeri";
                                        readonly type: "integer";
                                    };
                                    readonly logoUrl: {
                                        readonly description: "Kargo firmasının Logo URL bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly description: "Kargo firmasının isim bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly shortName: {
                                        readonly description: "Kargo firmasının kısa isim bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly trackingUrl: {
                                        readonly description: "Kargonun takibi için URL bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly commission: {
                                readonly description: "Kalemin komisyon bedeli";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly commissionRate: {
                                readonly description: "Kalemin komisyon oranı";
                                readonly type: "number";
                            };
                            readonly commissionType: {
                                readonly description: "Satıcı komisyon servisinden alınan komisyon türü";
                                readonly type: "integer";
                            };
                            readonly creationReason: {
                                readonly description: "Kalemin oluşma sebebi";
                                readonly type: "string";
                            };
                            readonly creditCardHolderName: {
                                readonly description: "Boş bir değer atar";
                                readonly type: "string";
                            };
                            readonly customerId: {
                                readonly description: "Müşterinin unique Id bilgisi";
                                readonly type: "string";
                            };
                            readonly customerName: {
                                readonly description: "Müşterinin adı ve soyadı";
                                readonly type: "string";
                            };
                            readonly customizedText01: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText02: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText03: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText04: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedTextX: {
                                readonly description: "Özelleştirilebilir kalem ise \"X\" değilse varsayılan değer \"\"";
                                readonly type: "string";
                            };
                            readonly deliveryNote: {
                                readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                                readonly type: "object";
                                readonly properties: {
                                    readonly tags: {
                                        readonly description: "Notun etiketi";
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly value: {
                                        readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly deliveryOptionId: {
                                readonly description: "Paketin teslimat seçeneği";
                                readonly type: "integer";
                            };
                            readonly deliveryType: {
                                readonly description: "Paketin teslimat türü";
                                readonly type: "string";
                            };
                            readonly deptorDifferenceAmount: {
                                readonly description: "Satıcı tarafından uygulanan indirim tutarı";
                                readonly type: "number";
                            };
                            readonly discountInfo: {
                                readonly description: "İndirim bilgisi";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly campaignDiscountRate: {
                                            readonly description: "Kampanya indirim oranı";
                                            readonly type: "number";
                                        };
                                        readonly campaignId: {
                                            readonly description: "Kalemin kampanya unique Id değeri";
                                            readonly type: "integer";
                                        };
                                        readonly campaignName: {
                                            readonly description: "Kampanya ismi";
                                            readonly type: "string";
                                        };
                                        readonly campaignType: {
                                            readonly description: "Kampanya türü";
                                            readonly type: "integer";
                                        };
                                        readonly conditionOrAward: {
                                            readonly description: "Koşul sağlandığında kampanyanın tanımlanacağı bilgisi";
                                            readonly type: "integer";
                                        };
                                        readonly correlationId: {
                                            readonly description: "Log Id";
                                            readonly type: "string";
                                        };
                                        readonly discountTotal: {
                                            readonly description: "Kampanya indirim tutarı";
                                            readonly type: "number";
                                        };
                                        readonly isProtectedCampaign: {
                                            readonly type: "boolean";
                                        };
                                        readonly quantity: {
                                            readonly description: "Kampanya uygulanacak kalemin miktarı";
                                            readonly type: "integer";
                                        };
                                    };
                                };
                            };
                            readonly discountToBeBilledToHB: {
                                readonly description: "HB’ye faturalandırılacak indirim (KDV dahil) tutarı";
                                readonly type: "number";
                            };
                            readonly dispatchTime: {
                                readonly description: "Kargoya Teslim İçin Kalan Süre (Gün)";
                                readonly type: "integer";
                            };
                            readonly dueDate: {
                                readonly description: "Tahmini kargoya veriliş tarihi (esd)";
                                readonly type: "string";
                            };
                            readonly hbDiscount: {
                                readonly description: "Kalemin birim indirim tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly totalPrice: {
                                        readonly description: "Kalemin toplam indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly unitPrice: {
                                        readonly description: "Kalemin birim indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                            };
                            readonly id: {
                                readonly description: "Kalemin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly invoice: {
                                readonly description: "Fatura bilgileri";
                                readonly type: "object";
                                readonly properties: {
                                    readonly address: {
                                        readonly description: "Faturanın teslim edileceği adres bilgisi";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly address: {
                                                readonly description: "Adres bilgileri";
                                                readonly type: "string";
                                            };
                                            readonly addressId: {
                                                readonly description: "Adresin unique Id değeri";
                                                readonly type: "string";
                                            };
                                            readonly alternatePhoneNumber: {
                                                readonly description: "Müşterinin Gsm numarası";
                                                readonly type: "string";
                                            };
                                            readonly city: {
                                                readonly description: "Adresin şehir bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly countryCode: {
                                                readonly description: "Ülke kodu";
                                                readonly type: "string";
                                            };
                                            readonly directions: {
                                                readonly description: "Adrese ilişkin açıklayıcı bilgi";
                                                readonly type: "string";
                                            };
                                            readonly district: {
                                                readonly description: "Adresin mahalle/semt bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly email: {
                                                readonly description: "Müşterinin mail bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly name: {
                                                readonly description: "Teslim edilecek kişinin ismi";
                                                readonly type: "string";
                                            };
                                            readonly phoneNumber: {
                                                readonly description: "Müşterinin telefon numarası";
                                                readonly type: "string";
                                            };
                                            readonly postalCode: {
                                                readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly town: {
                                                readonly description: "Adresin ilçe bilgisi";
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly taxNumber: {
                                        readonly description: "Kurumsal müşterinin vergi numarası";
                                        readonly type: "string";
                                    };
                                    readonly taxOffice: {
                                        readonly description: "Faturanın teslim edileceği vergi dairesi adı";
                                        readonly type: "string";
                                    };
                                    readonly turkishIdentityNumber: {
                                        readonly description: "Müşterinin TCKN bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly isCancellable: {
                                readonly description: "Kalem, oluşturuldu durumundaysa true, değilse false";
                                readonly type: "boolean";
                            };
                            readonly isCancellableByHbAdmin: {
                                readonly description: "Kalem, oluşturuldu veya kargoya verildi durumundaysa true, değilse false";
                                readonly type: "boolean";
                            };
                            readonly isCargoChangable: {
                                readonly description: "Sipariş HepsiMat ise kargo değişimine izin verilmediği bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isCustomized: {
                                readonly description: "Kalemin Özelleştirilebilir olup olmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isJetDelivery: {
                                readonly description: "Yarın kapında mı?";
                                readonly type: "boolean";
                            };
                            readonly isMicroExport: {
                                readonly description: "Kalemin mikro ihracat olup olmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isSundayDelivery: {
                                readonly description: "Pazar günü teslimatı mı?";
                                readonly type: "boolean";
                            };
                            readonly lastStatusUpdateDate: {
                                readonly description: "Kalemin son statüsünün güncellendiği tarih";
                                readonly type: "string";
                            };
                            readonly merchantDiscount: {
                                readonly description: "Kalemin satıcısı tarafından uygulanan indirim tutarı bilgileri";
                                readonly type: "object";
                                readonly properties: {
                                    readonly totalPrice: {
                                        readonly description: "Kalemin satıcısı tarafından uygulanan toplam indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly unitPrice: {
                                        readonly description: "Kalemin satıcısı tarafından uygulanan birim indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                            };
                            readonly merchantId: {
                                readonly description: "Kalemin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly merchantSKU: {
                                readonly description: "Kalemin satıcıya ait SKU değeri";
                                readonly type: "string";
                            };
                            readonly name: {
                                readonly description: "Ürün ismi";
                                readonly type: "string";
                            };
                            readonly orderDate: {
                                readonly description: "Siparişin oluşturulma tarihi";
                                readonly type: "string";
                            };
                            readonly orderId: {
                                readonly description: "Siparişin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly orderNumber: {
                                readonly description: "Kalemin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly packageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                            readonly parentItemIndex: {
                                readonly description: "Bundle bilgisi";
                                readonly type: "integer";
                            };
                            readonly paymentTermInDays: {
                                readonly description: "Satıcıya ödeme yapılacak günü belirten veri";
                                readonly type: "integer";
                            };
                            readonly pickUpTime: {
                                readonly description: "Satıcının kargo firmasına teslim etmesi gereken saat aralığı";
                                readonly type: "string";
                            };
                            readonly productBarcode: {
                                readonly description: "SKU'nun EAN barcode bilgisi";
                                readonly type: "string";
                            };
                            readonly productImageUrlFormat: {
                                readonly description: "Ürün görseli";
                                readonly type: "string";
                            };
                            readonly properties: {
                                readonly description: "Ürünün Hermes'teki bilgileri";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly displayName: {
                                            readonly description: "Ürünün hermes üzerindeki ismi";
                                            readonly type: "string";
                                        };
                                        readonly name: {
                                            readonly description: "Ürünün hermes üzerindeki varyant ismi";
                                            readonly type: "string";
                                        };
                                        readonly value: {
                                            readonly description: "Ürünün hermes üzerindeki varyant değeri";
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                            readonly purchasePrice: {
                                readonly description: "Tedarikçiden alınan ürünün fiyatı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly quantity: {
                                readonly description: "Kalem adedi";
                                readonly type: "integer";
                            };
                            readonly releatedLineIndexesWithCampaign: {
                                readonly description: "Kampanya ilişkili kalemlerin index değerlerik";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly sapNumber: {
                                readonly description: "SAP sisteminde takibi için kullanılan değer";
                                readonly type: "string";
                            };
                            readonly shippingAddress: {
                                readonly description: "Paketin teslimat adresi";
                                readonly type: "object";
                                readonly properties: {
                                    readonly address: {
                                        readonly description: "Adres bilgileri";
                                        readonly type: "string";
                                    };
                                    readonly addressId: {
                                        readonly description: "Adresin unique Id değeri";
                                        readonly type: "string";
                                    };
                                    readonly alternatePhoneNumber: {
                                        readonly description: "Müşterinin Gsm numarası";
                                        readonly type: "string";
                                    };
                                    readonly city: {
                                        readonly description: "Adresin şehir bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly countryCode: {
                                        readonly description: "Ülke kodu";
                                        readonly type: "string";
                                    };
                                    readonly directions: {
                                        readonly description: "Adrese ilişkin açıklayıcı bilgi";
                                        readonly type: "string";
                                    };
                                    readonly district: {
                                        readonly description: "Adresin mahalle/semt bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly email: {
                                        readonly description: "Müşterinin mail bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly description: "Teslim edilecek kişinin ismi";
                                        readonly type: "string";
                                    };
                                    readonly phoneNumber: {
                                        readonly description: "Müşterinin telefon numarası";
                                        readonly type: "string";
                                    };
                                    readonly postalCode: {
                                        readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly town: {
                                        readonly description: "Adresin ilçe bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly sku: {
                                readonly description: "Kalemin sku değeri";
                                readonly type: "string";
                            };
                            readonly slot: {
                                readonly description: "Müşterinin paketi teslim almak için seçtiği saat aralığı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly timeslot: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly status: {
                                readonly description: "Kalemin durumu";
                                readonly type: "string";
                            };
                            readonly totalPrice: {
                                readonly description: "Kalemin toplam tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly unitLaborCost: {
                                readonly description: "Birim işçilik maliyeti tutarı ( altın işçiliği )";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly unitPrice: {
                                readonly description: "Kalemin birim tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly vat: {
                                readonly description: "Kalemin kdv tutarı";
                                readonly type: "number";
                            };
                            readonly vatRate: {
                                readonly description: "Kalemin kdv oranı";
                                readonly type: "number";
                            };
                            readonly warehouse: {
                                readonly description: "Depo";
                                readonly type: "object";
                                readonly properties: {
                                    readonly shippingAddressLabel: {
                                        readonly description: "Depo kodu";
                                        readonly type: "string";
                                    };
                                    readonly shippingModel: {
                                        readonly description: "Kalemin teslimat modeli";
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam kalem sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetOrdersMerchantidMerchantidCancelled: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen kalemlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren iptal olmuş kalemler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce iptal olmuş kalemler esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar kalem listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Satıcıya ait İptal olmuş kalem listesi";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly cancelDate: {
                                readonly description: "Kalemin iptal edildiği tarih";
                                readonly type: "string";
                            };
                            readonly cancelReasonCode: {
                                readonly description: "Kalemin iptal nedeni";
                                readonly type: "string";
                            };
                            readonly cancelledBy: {
                                readonly description: "Kalemin kim tarafından iptal edildiği bilgisi";
                                readonly type: "string";
                            };
                            readonly lineItemId: {
                                readonly description: "Kalemin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly merchantId: {
                                readonly description: "Kalemin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly merchantSku: {
                                readonly description: "Kalemin satıcıya ait SKU değeri";
                                readonly type: "string";
                            };
                            readonly orderNumber: {
                                readonly description: "Kalemin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly quantity: {
                                readonly description: "Kalemin iptal edilen adedi";
                                readonly type: "integer";
                            };
                            readonly sku: {
                                readonly description: "Kalemin sku değeri";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam kalem sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetOrdersMerchantidMerchantidOrdernumberOrdernumber: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Satıcının unique Id değeridir";
                };
                readonly orderNumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Sipariş numarası";
                };
            };
            readonly required: readonly ["merchantId", "orderNumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly createdDate: {
                    readonly description: "Siparişin eklenme tarihi";
                    readonly type: "string";
                };
                readonly customer: {
                    readonly description: "Müşteri bilgileri";
                    readonly type: "object";
                    readonly properties: {
                        readonly customerId: {
                            readonly description: "Müşterinin unique Id bilgisi";
                            readonly type: "string";
                        };
                        readonly name: {
                            readonly description: "Müşterinin adı ve soyadı";
                            readonly type: "string";
                        };
                    };
                };
                readonly deliveryAddress: {
                    readonly description: "Paketin teslim edileceği adres bilgisi";
                    readonly type: "object";
                    readonly properties: {
                        readonly address: {
                            readonly description: "Adres bilgileri";
                            readonly type: "string";
                        };
                        readonly addressId: {
                            readonly description: "Adresin unique Id değeri";
                            readonly type: "string";
                        };
                        readonly alternatePhoneNumber: {
                            readonly description: "Müşterinin Gsm numarası";
                            readonly type: "string";
                        };
                        readonly city: {
                            readonly description: "Adresin şehir bilgisi";
                            readonly type: "string";
                        };
                        readonly countryCode: {
                            readonly description: "Ülke kodu";
                            readonly type: "string";
                        };
                        readonly directions: {
                            readonly description: "Adrese ilişkin açıklayıcı bilgi";
                            readonly type: "string";
                        };
                        readonly district: {
                            readonly description: "Adresin mahalle/semt bilgisi";
                            readonly type: "string";
                        };
                        readonly email: {
                            readonly description: "Müşterinin mail bilgisi";
                            readonly type: "string";
                        };
                        readonly name: {
                            readonly description: "Teslim edilecek kişinin ismi";
                            readonly type: "string";
                        };
                        readonly phoneNumber: {
                            readonly description: "Müşterinin telefon numarası";
                            readonly type: "string";
                        };
                        readonly postalCode: {
                            readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                            readonly type: "string";
                        };
                        readonly town: {
                            readonly description: "Adresin ilçe bilgisi";
                            readonly type: "string";
                        };
                    };
                };
                readonly invoice: {
                    readonly description: "Fatura bilgileri";
                    readonly type: "object";
                    readonly properties: {
                        readonly address: {
                            readonly description: "Faturanın teslim edileceği adres bilgisi";
                            readonly type: "object";
                            readonly properties: {
                                readonly address: {
                                    readonly description: "Adres bilgileri";
                                    readonly type: "string";
                                };
                                readonly addressId: {
                                    readonly description: "Adresin unique Id değeri";
                                    readonly type: "string";
                                };
                                readonly alternatePhoneNumber: {
                                    readonly description: "Müşterinin Gsm numarası";
                                    readonly type: "string";
                                };
                                readonly city: {
                                    readonly description: "Adresin şehir bilgisi";
                                    readonly type: "string";
                                };
                                readonly countryCode: {
                                    readonly description: "Ülke kodu";
                                    readonly type: "string";
                                };
                                readonly directions: {
                                    readonly description: "Adrese ilişkin açıklayıcı bilgi";
                                    readonly type: "string";
                                };
                                readonly district: {
                                    readonly description: "Adresin mahalle/semt bilgisi";
                                    readonly type: "string";
                                };
                                readonly email: {
                                    readonly description: "Müşterinin mail bilgisi";
                                    readonly type: "string";
                                };
                                readonly name: {
                                    readonly description: "Teslim edilecek kişinin ismi";
                                    readonly type: "string";
                                };
                                readonly phoneNumber: {
                                    readonly description: "Müşterinin telefon numarası";
                                    readonly type: "string";
                                };
                                readonly postalCode: {
                                    readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                                    readonly type: "string";
                                };
                                readonly town: {
                                    readonly description: "Adresin ilçe bilgisi";
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly taxNumber: {
                            readonly description: "Kurumsal müşterinin vergi numarası";
                            readonly type: "string";
                        };
                        readonly taxOffice: {
                            readonly description: "Faturanın teslim edileceği vergi dairesi adı";
                            readonly type: "string";
                        };
                        readonly turkishIdentityNumber: {
                            readonly description: "Müşterinin TCKN bilgisi";
                            readonly type: "string";
                        };
                    };
                };
                readonly items: {
                    readonly description: "Siparişteki kalem listesi";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly barcode: {
                                readonly description: "Paketin teslimat numarası";
                                readonly type: "string";
                            };
                            readonly bnplCommissionAmount: {
                                readonly description: "Satıcıdan alınan BNPL işlem ücreti tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly canCreatePackage: {
                                readonly description: "Ödemenin alınıp alınmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly cargoCompany: {
                                readonly description: "Kargo firmasının isim bilgisi";
                                readonly type: "string";
                            };
                            readonly cargoCompanyModel: {
                                readonly description: "Kargo bilgisi";
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly description: "Kargo firmasının unique değeri";
                                        readonly type: "integer";
                                    };
                                    readonly logoUrl: {
                                        readonly description: "Kargo firmasının Logo URL bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly description: "Kargo firmasının isim bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly shortName: {
                                        readonly description: "Kargo firmasının kısa isim bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly trackingUrl: {
                                        readonly description: "Kargonun takibi için URL bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly commission: {
                                readonly description: "Kalemin komisyon bedeli";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly commissionRate: {
                                readonly description: "Kalemin komisyon oranı";
                                readonly type: "number";
                            };
                            readonly commissionType: {
                                readonly description: "Satıcı komisyon servisinden alınan komisyon türü";
                                readonly type: "integer";
                            };
                            readonly creationReason: {
                                readonly description: "Kalemin oluşma sebebi";
                                readonly type: "string";
                            };
                            readonly creditCardHolderName: {
                                readonly description: "Boş bir değer atar";
                                readonly type: "string";
                            };
                            readonly customerId: {
                                readonly description: "Müşterinin unique Id bilgisi";
                                readonly type: "string";
                            };
                            readonly customerName: {
                                readonly description: "Müşterinin adı ve soyadı";
                                readonly type: "string";
                            };
                            readonly customizedText01: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText02: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText03: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedText04: {
                                readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                readonly type: "string";
                            };
                            readonly customizedTextX: {
                                readonly description: "Özelleştirilebilir kalem ise \"X\" değilse varsayılan değer \"\"";
                                readonly type: "string";
                            };
                            readonly deliveryNote: {
                                readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                                readonly type: "object";
                                readonly properties: {
                                    readonly tags: {
                                        readonly description: "Notun etiketi";
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly value: {
                                        readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly deliveryOptionId: {
                                readonly description: "Paketin teslimat seçeneği";
                                readonly type: "integer";
                            };
                            readonly deliveryType: {
                                readonly description: "Paketin teslimat türü";
                                readonly type: "string";
                            };
                            readonly deptorDifferenceAmount: {
                                readonly description: "Satıcı tarafından uygulanan indirim tutarı";
                                readonly type: "number";
                            };
                            readonly discountInfo: {
                                readonly description: "İndirim bilgisi";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly campaignDiscountRate: {
                                            readonly description: "Kampanya indirim oranı";
                                            readonly type: "number";
                                        };
                                        readonly campaignId: {
                                            readonly description: "Kalemin kampanya unique Id değeri";
                                            readonly type: "integer";
                                        };
                                        readonly campaignName: {
                                            readonly description: "Kampanya ismi";
                                            readonly type: "string";
                                        };
                                        readonly campaignType: {
                                            readonly description: "Kampanya türü";
                                            readonly type: "integer";
                                        };
                                        readonly conditionOrAward: {
                                            readonly description: "Koşul sağlandığında kampanyanın tanımlanacağı bilgisi";
                                            readonly type: "integer";
                                        };
                                        readonly correlationId: {
                                            readonly description: "Log Id";
                                            readonly type: "string";
                                        };
                                        readonly discountTotal: {
                                            readonly description: "Kampanya indirim tutarı";
                                            readonly type: "number";
                                        };
                                        readonly isProtectedCampaign: {
                                            readonly type: "boolean";
                                        };
                                        readonly quantity: {
                                            readonly description: "Kampanya uygulanacak kalemin miktarı";
                                            readonly type: "integer";
                                        };
                                    };
                                };
                            };
                            readonly discountToBeBilledToHB: {
                                readonly description: "HB’ye faturalandırılacak indirim (KDV dahil) tutarı";
                                readonly type: "number";
                            };
                            readonly dispatchTime: {
                                readonly description: "Kargoya Teslim İçin Kalan Süre (Gün)";
                                readonly type: "integer";
                            };
                            readonly dueDate: {
                                readonly description: "Tahmini kargoya veriliş tarihi (esd)";
                                readonly type: "string";
                            };
                            readonly hbDiscount: {
                                readonly description: "Kalemin birim indirim tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly totalPrice: {
                                        readonly description: "Kalemin toplam indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly unitPrice: {
                                        readonly description: "Kalemin birim indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                            };
                            readonly id: {
                                readonly description: "Kalemin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly invoice: {
                                readonly description: "Fatura bilgileri";
                                readonly type: "object";
                                readonly properties: {
                                    readonly address: {
                                        readonly description: "Faturanın teslim edileceği adres bilgisi";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly address: {
                                                readonly description: "Adres bilgileri";
                                                readonly type: "string";
                                            };
                                            readonly addressId: {
                                                readonly description: "Adresin unique Id değeri";
                                                readonly type: "string";
                                            };
                                            readonly alternatePhoneNumber: {
                                                readonly description: "Müşterinin Gsm numarası";
                                                readonly type: "string";
                                            };
                                            readonly city: {
                                                readonly description: "Adresin şehir bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly countryCode: {
                                                readonly description: "Ülke kodu";
                                                readonly type: "string";
                                            };
                                            readonly directions: {
                                                readonly description: "Adrese ilişkin açıklayıcı bilgi";
                                                readonly type: "string";
                                            };
                                            readonly district: {
                                                readonly description: "Adresin mahalle/semt bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly email: {
                                                readonly description: "Müşterinin mail bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly name: {
                                                readonly description: "Teslim edilecek kişinin ismi";
                                                readonly type: "string";
                                            };
                                            readonly phoneNumber: {
                                                readonly description: "Müşterinin telefon numarası";
                                                readonly type: "string";
                                            };
                                            readonly postalCode: {
                                                readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                                                readonly type: "string";
                                            };
                                            readonly town: {
                                                readonly description: "Adresin ilçe bilgisi";
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly taxNumber: {
                                        readonly description: "Kurumsal müşterinin vergi numarası";
                                        readonly type: "string";
                                    };
                                    readonly taxOffice: {
                                        readonly description: "Faturanın teslim edileceği vergi dairesi adı";
                                        readonly type: "string";
                                    };
                                    readonly turkishIdentityNumber: {
                                        readonly description: "Müşterinin TCKN bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly isCancellable: {
                                readonly description: "Kalem, oluşturuldu durumundaysa true, değilse false";
                                readonly type: "boolean";
                            };
                            readonly isCancellableByHbAdmin: {
                                readonly description: "Kalem, oluşturuldu veya kargoya verildi durumundaysa true, değilse false";
                                readonly type: "boolean";
                            };
                            readonly isCargoChangable: {
                                readonly description: "Sipariş HepsiMat ise kargo değişimine izin verilmediği bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isCustomized: {
                                readonly description: "Kalemin Özelleştirilebilir olup olmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isJetDelivery: {
                                readonly description: "Yarın kapında mı?";
                                readonly type: "boolean";
                            };
                            readonly isMicroExport: {
                                readonly description: "Kalemin mikro ihracat olup olmadığı bilgisi";
                                readonly type: "boolean";
                            };
                            readonly isSundayDelivery: {
                                readonly description: "Pazar günü teslimatı mı?";
                                readonly type: "boolean";
                            };
                            readonly lastStatusUpdateDate: {
                                readonly description: "Kalemin son statüsünün güncellendiği tarih";
                                readonly type: "string";
                            };
                            readonly merchantDiscount: {
                                readonly description: "Kalemin satıcısı tarafından uygulanan indirim tutarı bilgileri";
                                readonly type: "object";
                                readonly properties: {
                                    readonly totalPrice: {
                                        readonly description: "Kalemin satıcısı tarafından uygulanan toplam indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly unitPrice: {
                                        readonly description: "Kalemin satıcısı tarafından uygulanan birim indirim tutarı";
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly amount: {
                                                readonly type: "number";
                                            };
                                            readonly currency: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                            };
                            readonly merchantId: {
                                readonly description: "Kalemin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly merchantSKU: {
                                readonly description: "Kalemin satıcıya ait SKU değeri";
                                readonly type: "string";
                            };
                            readonly name: {
                                readonly description: "Ürün ismi";
                                readonly type: "string";
                            };
                            readonly orderDate: {
                                readonly description: "Siparişin oluşturulma tarihi";
                                readonly type: "string";
                            };
                            readonly orderId: {
                                readonly description: "Siparişin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly orderNumber: {
                                readonly description: "Kalemin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly packageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                            readonly parentItemIndex: {
                                readonly description: "Bundle bilgisi";
                                readonly type: "integer";
                            };
                            readonly paymentTermInDays: {
                                readonly description: "Satıcıya ödeme yapılacak günü belirten veri";
                                readonly type: "integer";
                            };
                            readonly pickUpTime: {
                                readonly description: "Satıcının kargo firmasına teslim etmesi gereken saat aralığı";
                                readonly type: "string";
                            };
                            readonly productBarcode: {
                                readonly description: "SKU'nun EAN barcode bilgisi";
                                readonly type: "string";
                            };
                            readonly productImageUrlFormat: {
                                readonly description: "Ürün görseli";
                                readonly type: "string";
                            };
                            readonly properties: {
                                readonly description: "Ürünün Hermes'teki bilgileri";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly displayName: {
                                            readonly description: "Ürünün hermes üzerindeki ismi";
                                            readonly type: "string";
                                        };
                                        readonly name: {
                                            readonly description: "Ürünün hermes üzerindeki varyant ismi";
                                            readonly type: "string";
                                        };
                                        readonly value: {
                                            readonly description: "Ürünün hermes üzerindeki varyant değeri";
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                            readonly purchasePrice: {
                                readonly description: "Tedarikçiden alınan ürünün fiyatı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly quantity: {
                                readonly description: "Kalem adedi";
                                readonly type: "integer";
                            };
                            readonly releatedLineIndexesWithCampaign: {
                                readonly description: "Kampanya ilişkili kalemlerin index değerlerik";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly sapNumber: {
                                readonly description: "SAP sisteminde takibi için kullanılan değer";
                                readonly type: "string";
                            };
                            readonly shippingAddress: {
                                readonly description: "Paketin teslimat adresi";
                                readonly type: "object";
                                readonly properties: {
                                    readonly address: {
                                        readonly description: "Adres bilgileri";
                                        readonly type: "string";
                                    };
                                    readonly addressId: {
                                        readonly description: "Adresin unique Id değeri";
                                        readonly type: "string";
                                    };
                                    readonly alternatePhoneNumber: {
                                        readonly description: "Müşterinin Gsm numarası";
                                        readonly type: "string";
                                    };
                                    readonly city: {
                                        readonly description: "Adresin şehir bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly countryCode: {
                                        readonly description: "Ülke kodu";
                                        readonly type: "string";
                                    };
                                    readonly directions: {
                                        readonly description: "Adrese ilişkin açıklayıcı bilgi";
                                        readonly type: "string";
                                    };
                                    readonly district: {
                                        readonly description: "Adresin mahalle/semt bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly email: {
                                        readonly description: "Müşterinin mail bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly description: "Teslim edilecek kişinin ismi";
                                        readonly type: "string";
                                    };
                                    readonly phoneNumber: {
                                        readonly description: "Müşterinin telefon numarası";
                                        readonly type: "string";
                                    };
                                    readonly postalCode: {
                                        readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                                        readonly type: "string";
                                    };
                                    readonly town: {
                                        readonly description: "Adresin ilçe bilgisi";
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly sku: {
                                readonly description: "Kalemin sku değeri";
                                readonly type: "string";
                            };
                            readonly slot: {
                                readonly description: "Müşterinin paketi teslim almak için seçtiği saat aralığı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly id: {
                                        readonly type: "string";
                                    };
                                    readonly timeslot: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly status: {
                                readonly description: "Kalemin durumu";
                                readonly type: "string";
                            };
                            readonly totalPrice: {
                                readonly description: "Kalemin toplam tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly unitLaborCost: {
                                readonly description: "Birim işçilik maliyeti tutarı ( altın işçiliği )";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly unitPrice: {
                                readonly description: "Kalemin birim tutarı";
                                readonly type: "object";
                                readonly properties: {
                                    readonly amount: {
                                        readonly type: "number";
                                    };
                                    readonly currency: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly vat: {
                                readonly description: "Kalemin kdv tutarı";
                                readonly type: "number";
                            };
                            readonly vatRate: {
                                readonly description: "Kalemin kdv oranı";
                                readonly type: "number";
                            };
                            readonly warehouse: {
                                readonly description: "Depo";
                                readonly type: "object";
                                readonly properties: {
                                    readonly shippingAddressLabel: {
                                        readonly description: "Depo kodu";
                                        readonly type: "string";
                                    };
                                    readonly shippingModel: {
                                        readonly description: "Kalemin teslimat modeli";
                                        readonly type: "string";
                                    };
                                };
                            };
                        };
                    };
                };
                readonly orderDate: {
                    readonly description: "Siparişin oluşturulma tarihi";
                    readonly type: "string";
                };
                readonly orderId: {
                    readonly description: "Siparişin unique Id değeri";
                    readonly type: "string";
                };
                readonly orderNote: {
                    readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                    readonly type: "object";
                    readonly properties: {
                        readonly tags: {
                            readonly description: "Notun etiketi";
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                        readonly value: {
                            readonly description: "Teslimatla ilgili müşteriden gelen açıklama";
                            readonly type: "string";
                        };
                    };
                };
                readonly orderNumber: {
                    readonly description: "Sipariş numarası";
                    readonly type: "string";
                };
                readonly paymentStatus: {
                    readonly description: "Siparişin ödeme durumu";
                    readonly type: "string";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetOrdersMerchantidMerchantidPaymentawaiting: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen kalemlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren siparişin oluşturulma tarihi esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce oluşturulmuş sipariş esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar kalem listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir. Limit değeri 1' den küçük olduğunda hata oluşacaktır";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Satıcıya ait ödeme bekleniyor statüsünde bekleyen kalemler";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly Id: {
                                readonly description: "Kalemin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly MerchantId: {
                                readonly description: "Kalemin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly MerchantSku: {
                                readonly description: "Kalemin satıcıya ait SKU değeri";
                                readonly type: "string";
                            };
                            readonly Name: {
                                readonly description: "Ürün ismi";
                                readonly type: "string";
                            };
                            readonly OrderDate: {
                                readonly description: "Siparişin oluşturulma tarihi";
                                readonly type: "string";
                            };
                            readonly OrderNumber: {
                                readonly description: "Kalemin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly Properties: {
                                readonly description: "Ürünün Hermes'teki bilgileri";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly name: {
                                            readonly description: "Ürünün hermes üzerindeki varyant ismi";
                                            readonly type: "string";
                                        };
                                        readonly value: {
                                            readonly description: "Ürünün hermes üzerindeki varyant değeri";
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                            readonly Quantity: {
                                readonly description: "Kalem adedi";
                                readonly type: "integer";
                            };
                            readonly Sku: {
                                readonly description: "Kalemin sku değeri";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam kalem sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantid: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren eklenen kalemler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce eklenmiş paketler esas alınır";
                };
                readonly timespan: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Bugünün tarihinden girilen değer kadar saat geri gidilerek, o zaman aralığındaki paketler listelenir. Örneğin, 12 değeri girildiğinde son 12 saat içindeki paketler getirilir";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 10 paket gösterilir. 1'den küçük bir değer girilirse hata alınır";
                };
                readonly Offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly barcode: {
                        readonly description: "Paketin teslimat numarası";
                        readonly type: "string";
                    };
                    readonly billingAddress: {
                        readonly description: "Faturanın teslim edileceği adres bilgisi";
                        readonly type: "string";
                    };
                    readonly billingCity: {
                        readonly description: "Faturanın teslim edileceği adresin şehir bilgisi";
                        readonly type: "string";
                    };
                    readonly billingCountryCode: {
                        readonly description: "Faturanın teslim edileceği ülke kodu";
                        readonly type: "string";
                    };
                    readonly billingDistrict: {
                        readonly description: "Faturanın teslim edileceği adresin mahalle/semt bilgisi";
                        readonly type: "string";
                    };
                    readonly billingPostalCode: {
                        readonly description: "Faturanın teslim edileceği adresin posta kodu bilgisi";
                        readonly type: "string";
                    };
                    readonly billingTown: {
                        readonly description: "Faturanın teslim edileceği adresin ilçe bilgisi";
                        readonly type: "string";
                    };
                    readonly cargoCompany: {
                        readonly description: "Kargo şirketi adı";
                        readonly type: "string";
                    };
                    readonly companyName: {
                        readonly description: "Faturanın teslim edileceği kişinin ismi";
                        readonly type: "string";
                    };
                    readonly customerId: {
                        readonly description: "Müşterinin unique Id bilgisi";
                        readonly type: "string";
                    };
                    readonly customerName: {
                        readonly description: "Müşterinin adı ve soyadı";
                        readonly type: "string";
                    };
                    readonly customsTotalPrice: {
                        readonly description: "Customs kalemler için toplam tutar bilgisi";
                        readonly type: "object";
                        readonly properties: {
                            readonly amount: {
                                readonly type: "number";
                            };
                            readonly currency: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly dueDate: {
                        readonly description: "Paketin tahmini kargoya veriliş tarihi (esd)";
                        readonly type: "string";
                    };
                    readonly email: {
                        readonly description: "Müşterinin mail bilgisi";
                        readonly type: "string";
                    };
                    readonly estimatedArrivalDate: {
                        readonly description: "Paketin tahmini varış tarihi";
                        readonly type: "string";
                    };
                    readonly id: {
                        readonly description: "Paketin unique Id değeri";
                        readonly type: "string";
                    };
                    readonly identityNo: {
                        readonly description: "Müşterinin TCKN bilgisi";
                        readonly type: "string";
                    };
                    readonly isCargoChangable: {
                        readonly description: "Kargo firması değiştirilebilir mi";
                        readonly type: "boolean";
                    };
                    readonly items: {
                        readonly description: "Paket içindeki kalemlerin bilgileri";
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly bnplCommissionAmount: {
                                    readonly description: "Satıcıdan alınan BNPL işlem ücreti tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly cargoPaymentInfo: {
                                    readonly description: "Kargo ödeme bilgisi\"";
                                    readonly type: "string";
                                };
                                readonly commission: {
                                    readonly description: "Kalemin komisyon bedeli";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly commissionRate: {
                                    readonly description: "Kalemin komisyon oranı";
                                    readonly type: "number";
                                };
                                readonly creationReason: {
                                    readonly description: "Kalemin oluşma sebebi";
                                    readonly type: "string";
                                };
                                readonly customerDelivery: {
                                    readonly description: "Müşterinin paketi teslim almak için seçtiği saat aralığı";
                                    readonly type: "string";
                                };
                                readonly customizedText01: {
                                    readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                    readonly type: "string";
                                };
                                readonly customizedText02: {
                                    readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                    readonly type: "string";
                                };
                                readonly customizedText03: {
                                    readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                    readonly type: "string";
                                };
                                readonly customizedText04: {
                                    readonly description: "Özelleştirilebilir kalemin içerik bilgisi";
                                    readonly type: "string";
                                };
                                readonly deliveryType: {
                                    readonly description: "Paketin teslimat seçeneği";
                                    readonly type: "string";
                                };
                                readonly deptorDifferenceAmount: {
                                    readonly description: "Satıcı tarafından uygulanan indirim tutarı";
                                    readonly type: "number";
                                };
                                readonly discountToBeBilledToHB: {
                                    readonly description: "HB’ye faturalandırılacak indirim (KDV dahil) tutarı";
                                    readonly type: "number";
                                };
                                readonly gtip: {
                                    readonly description: "Ürünün gümrük vergisi kodu";
                                    readonly type: "string";
                                };
                                readonly hbSku: {
                                    readonly description: "Kalemin sku değeri";
                                    readonly type: "string";
                                };
                                readonly isMicroExport: {
                                    readonly description: "Kalemin mikro ihracat olup olmadığı bilgisi";
                                    readonly type: "boolean";
                                };
                                readonly lineItemId: {
                                    readonly description: "Kalemin unique Id değeri";
                                    readonly type: "string";
                                };
                                readonly listingId: {
                                    readonly description: "Kalemin unique Listing Id değeri";
                                    readonly type: "string";
                                };
                                readonly merchantId: {
                                    readonly description: "Kalemin satıcısının unique Id değeri";
                                    readonly type: "string";
                                };
                                readonly merchantSku: {
                                    readonly description: "Kalemin satıcıya ait SKU değeri";
                                    readonly type: "string";
                                };
                                readonly merchantTotalPrice: {
                                    readonly description: "Satıcının toplam satış fiyatı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly merchantUnitPrice: {
                                    readonly description: "Satıcının birim satış fiyatı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly orderDate: {
                                    readonly description: "Siparişin oluşturulma tarihi";
                                    readonly type: "string";
                                };
                                readonly orderNumber: {
                                    readonly description: "Kalemin sipariş numarası";
                                    readonly type: "string";
                                };
                                readonly parentItemIndex: {
                                    readonly description: "Bundle bilgisi";
                                    readonly type: "integer";
                                };
                                readonly pickupTime: {
                                    readonly description: "Satıcının kargo firmasına teslim etmesi gereken saat aralığı";
                                    readonly type: "string";
                                };
                                readonly price: {
                                    readonly description: "Kalemin birim tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly productBarcode: {
                                    readonly description: "SKU'nun EAN barcode bilgisi";
                                    readonly type: "string";
                                };
                                readonly productImageUrlFormat: {
                                    readonly description: "Ürün görseli";
                                    readonly type: "string";
                                };
                                readonly productName: {
                                    readonly description: "Ürünün ismi";
                                    readonly type: "string";
                                };
                                readonly properties: {
                                    readonly description: "Ürünün Hermes'teki bilgileri";
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly displayName: {
                                                readonly description: "Ürünün hermes üzerindeki ismi";
                                                readonly type: "string";
                                            };
                                            readonly name: {
                                                readonly description: "Ürünün hermes üzerindeki varyant ismi";
                                                readonly type: "string";
                                            };
                                            readonly value: {
                                                readonly description: "Ürünün hermes üzerindeki varyant değeri";
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                };
                                readonly purchasePrice: {
                                    readonly description: "Tedarikçiden alınan ürünün fiyatı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly quantity: {
                                    readonly description: "Kalem adedi";
                                    readonly type: "integer";
                                };
                                readonly releatedLineIndexesWithCampaign: {
                                    readonly description: "Kampanya ilişkili kalemlerin index değerleri";
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly totalHBDiscount: {
                                    readonly description: "Kalemin toplam indirim tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly totalMerchantDiscount: {
                                    readonly description: "Kalemin satıcısı tarafından uygulanan toplam indirim tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly totalPrice: {
                                    readonly description: "Kalemin toplam tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly unitHBDiscount: {
                                    readonly description: "Kalemin birim indirim tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly unitLaborCost: {
                                    readonly description: "Kalemin birim işçilik maliyeti";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly unitMerchantDiscount: {
                                    readonly description: "Kalemin satıcısı tarafından uygulanan birim indirim tutarı";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly amount: {
                                            readonly type: "number";
                                        };
                                        readonly currency: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly vat: {
                                    readonly description: "Kalemin kdv tutarı";
                                    readonly type: "number";
                                };
                                readonly vatRate: {
                                    readonly description: "Kalemin kdv oranı";
                                    readonly type: "number";
                                };
                                readonly warehouse: {
                                    readonly description: "Depo bilgileri";
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly shippingAddressLabel: {
                                            readonly description: "Depo kodu";
                                            readonly type: "string";
                                        };
                                        readonly shippingModel: {
                                            readonly description: "Teslimat modeli";
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly weight: {
                                    readonly description: "Paketin ağırlık bilgisi";
                                    readonly type: "number";
                                };
                            };
                        };
                    };
                    readonly orderDate: {
                        readonly description: "Siparişin oluşturulma tarihi";
                        readonly type: "string";
                    };
                    readonly packageNumber: {
                        readonly description: "Paket numarası";
                        readonly type: "string";
                    };
                    readonly phoneNumber: {
                        readonly description: "Müşterinin telefon numarası";
                        readonly type: "string";
                    };
                    readonly recipientName: {
                        readonly description: "Paketin teslim edileceği kişinin ismi";
                        readonly type: "string";
                    };
                    readonly shippingAddressDetail: {
                        readonly description: "Paketin teslimat adresi";
                        readonly type: "string";
                    };
                    readonly shippingCity: {
                        readonly description: "Paketin teslim edileceği adresin şehir bilgisi";
                        readonly type: "string";
                    };
                    readonly shippingCountryCode: {
                        readonly description: "Paketin teslim edileceği ülke kodu";
                        readonly type: "string";
                    };
                    readonly shippingDistrict: {
                        readonly description: "Paketin teslim edileceği adresin mahalle/semt bilgisi";
                        readonly type: "string";
                    };
                    readonly shippingTotalPrice: {
                        readonly description: "ShippingFee kalemler için toplam tutar bilgisi";
                        readonly type: "object";
                        readonly properties: {
                            readonly amount: {
                                readonly type: "number";
                            };
                            readonly currency: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly shippingTown: {
                        readonly description: "Paketin teslim edileceği adresin ilçe bilgisi";
                        readonly type: "string";
                    };
                    readonly status: {
                        readonly description: "Paketin durumu";
                        readonly type: "string";
                    };
                    readonly taxNumber: {
                        readonly description: "Kurumsal müşterinin vergi numarası";
                        readonly type: "string";
                    };
                    readonly taxOffice: {
                        readonly description: "Faturanın teslim edileceği vergi dairesi adı";
                        readonly type: "string";
                    };
                    readonly totalPrice: {
                        readonly description: "Paketteki kalemlerin vade farkı eklenmemiş tutarlarının toplamı";
                        readonly type: "object";
                        readonly properties: {
                            readonly amount: {
                                readonly type: "number";
                            };
                            readonly currency: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly unpackedDate: {
                        readonly description: "Paketin silinme tarihi";
                        readonly type: "string";
                    };
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidDelivered: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren teslim olmuş paketler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce teslim olmuş paketler esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Satıcıya ait teslim olmuş paketler";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly Barcode: {
                                readonly description: "Paketin teslimat numarası";
                                readonly type: "string";
                            };
                            readonly DeliveredDate: {
                                readonly description: "Paketin teslim edilme tarihi";
                                readonly type: "string";
                            };
                            readonly Id: {
                                readonly description: "Paketin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly MerchantId: {
                                readonly description: "Paketin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly OrderNumber: {
                                readonly description: "Paket içindeki kalemlerin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly OrderNumbers: {
                                readonly description: "Paket içindeki kalemlerin sipariş numaraları";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly PackageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam paket sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidMissingInvoice: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Faturası eksik paketler";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly orderNumbers: {
                                readonly description: "Paket içindeki kalemlerin sipariş numaraları";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly packageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                            readonly status: {
                                readonly description: "Paketin güncel statüsü";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam paket sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidPackagenumberPackagenumber: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketin satıcısının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly barcode: {
                    readonly description: "Paketin teslimat numarası";
                    readonly type: "string";
                };
                readonly cargoCompany: {
                    readonly description: "Kargo firmasının isim bilgisi";
                    readonly type: "string";
                };
                readonly deci: {
                    readonly description: "Paketin hacimsel ağırlığı";
                    readonly type: "number";
                };
                readonly estimatedArrivalDate: {
                    readonly description: "Paketin tahmini varış tarihi";
                    readonly type: "string";
                };
                readonly packageNumber: {
                    readonly description: "Paket numarası";
                    readonly type: "string";
                };
                readonly status: {
                    readonly description: "Paketin durumu";
                    readonly type: "string";
                };
                readonly trackingInfoCode: {
                    readonly description: "Kargo takip numarası";
                    readonly type: "string";
                };
                readonly trackingInfoUrl: {
                    readonly description: "Kargo gönderisinin takibi için URL bilgisi";
                    readonly type: "string";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompanies: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly packageNumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin hangi satıcıya ait olduğunu belirten bilgidir";
                };
            };
            readonly required: readonly ["packageNumber", "merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly Id: {
                    readonly description: "Kargo firmasının unique değeri";
                    readonly type: "integer";
                };
                readonly IsActive: {
                    readonly description: "Kargo firmasının aktif olup olmadığı bilgisi";
                    readonly type: "boolean";
                };
                readonly LogoUrl: {
                    readonly description: "Kargo firmasının Logo URL bilgisi";
                    readonly type: "string";
                };
                readonly Name: {
                    readonly description: "Kargo firmasının isim bilgisi";
                    readonly type: "string";
                };
                readonly ShortName: {
                    readonly description: "Kargo firmasının kısa isim bilgisi";
                    readonly type: "string";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabels: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly format: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Etiket basmak için kullanılan format türüdür";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly data: {
                    readonly description: "Delivery nin servisinden dönen barkod verileri";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly format: {
                    readonly description: "Etiket format türü";
                    readonly type: "string";
                };
                readonly hasMerchantMutualBarcode: {
                    readonly description: "Delivery'nin servisinden dönen, satıcıya ait ortak barkod olup olmadığı bilgisi";
                    readonly type: "boolean";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidShipped: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren kargoya teslim edilmiş paketler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce kargoya teslim edilmiş paketler esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Satıcıya ait kargoya teslim edilmiş paketler";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly Barcode: {
                                readonly description: "Paketin teslimat numarası";
                                readonly type: "string";
                            };
                            readonly Deci: {
                                readonly description: "Paketin hacimsel ağırlığı (desi), kargo fiyatlandırmasında kullanılan değer";
                                readonly type: "number";
                            };
                            readonly Id: {
                                readonly description: "Paketin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly MerchantId: {
                                readonly description: "Paketin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly OrderNumber: {
                                readonly description: "Paket içindeki kalemlerin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly OrderNumbers: {
                                readonly description: "Paket içindeki kalemlerin sipariş numaraları";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly PackageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                            readonly ShippedDate: {
                                readonly description: "Paketin kargoya teslim edilme tarihi";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam paket sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidStatusUnpacked: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 10 paket gösterilir. 1'den küçük bir değer girilirse hata alınır";
                };
                readonly Offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren Unpack olmuş paketler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce Unpack olmuş paketler esas alınır";
                };
                readonly timespan: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Bugünün tarihinden girilen değer kadar saat geri gidilerek, o zaman aralığındaki Unpack olmuş paketler listelenir. Örneğin, 12 değeri girildiğinde son 12 saat içindeki paketler getirilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly items: {
                        readonly description: "Satıcıya ait silinmiş paketlerin listesi";
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly barcode: {
                                    readonly description: "Paketin teslimat numarası";
                                    readonly type: "string";
                                };
                                readonly packageNumber: {
                                    readonly description: "Paket numarası";
                                    readonly type: "string";
                                };
                                readonly unpackedDate: {
                                    readonly description: "Paketin silinme tarihi";
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                    readonly limit: {
                        readonly description: "Limit değeri";
                        readonly type: "integer";
                    };
                    readonly offset: {
                        readonly description: "Offset değeri";
                        readonly type: "integer";
                    };
                    readonly pageCount: {
                        readonly description: "Sayfa sayısı";
                        readonly type: "integer";
                    };
                    readonly totalCount: {
                        readonly description: "Toplam kalem sayısı";
                        readonly type: "integer";
                    };
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPackagesMerchantidMerchantidUndelivered: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Listelenmek istenen paketlerin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly begindate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten itibaren teslim edilememiş paketler esas alınır";
                };
                readonly enddate: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen tarihten önce teslim edilememiş paketler esas alınır";
                };
                readonly offset: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Başlangıçtan belirtilen değer kadar kaydı atlar. Offset: 20, limit: 10 girildiğinde, ilk 20 kaydı atlar ve 21. kayıttan başlayarak 10 kayıt listeler";
                };
                readonly limit: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Girilen değer kadar paket listelenir, ancak en fazla ve varsayılan olarak 50 adet gösterilir";
                };
            };
            readonly required: readonly [];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly items: {
                    readonly description: "Satıcıya ait teslim edilememiş paketler";
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly Barcode: {
                                readonly description: "Paketin teslimat numarası";
                                readonly type: "string";
                            };
                            readonly Id: {
                                readonly description: "Paketin unique Id değeri";
                                readonly type: "string";
                            };
                            readonly MerchantId: {
                                readonly description: "Paketin satıcısının unique Id değeri";
                                readonly type: "string";
                            };
                            readonly OrderNumber: {
                                readonly description: "Paket içindeki kalemlerin sipariş numarası";
                                readonly type: "string";
                            };
                            readonly OrderNumbers: {
                                readonly description: "Paket içindeki kalemlerin sipariş numaraları";
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly PackageNumber: {
                                readonly description: "Paket numarası";
                                readonly type: "string";
                            };
                            readonly UndeliveredDate: {
                                readonly description: "Paketin teslim edilememe tarihi";
                                readonly type: "string";
                            };
                            readonly UndeliveredReason: {
                                readonly description: "Paketin teslim edilememe nedeni";
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly limit: {
                    readonly description: "Limit değeri";
                    readonly type: "integer";
                };
                readonly offset: {
                    readonly description: "Offset değeri";
                    readonly type: "integer";
                };
                readonly pageCount: {
                    readonly description: "Sayfa sayısı";
                    readonly type: "integer";
                };
                readonly totalCount: {
                    readonly description: "Toplam paket sayısı";
                    readonly type: "integer";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostLineitemsMerchantidMerchantidIdLineidCancelbymerchant: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly reasonId: {
                readonly type: "integer";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Siparişin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly lineId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İptal edilmek istenen, henüz paketlenmemiş kalemin unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId", "lineId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantid: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly barcode: {
                readonly type: "string";
            };
            readonly cargoCompany: {
                readonly type: "string";
            };
            readonly carrier: {
                readonly type: "string";
            };
            readonly creationReason: {
                readonly type: "string";
            };
            readonly deci: {
                readonly type: "number";
            };
            readonly lineItemRequests: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly id: {
                            readonly type: "string";
                        };
                        readonly quantity: {
                            readonly type: "integer";
                        };
                        readonly serialNumbers: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                };
            };
            readonly parcelQuantity: {
                readonly type: "integer";
            };
            readonly warehouse: {
                readonly type: "object";
                readonly properties: {
                    readonly shippingAddressLabel: {
                        readonly description: "Depo kodu";
                        readonly type: "string";
                    };
                    readonly shippingModel: {
                        readonly description: "Teslimat modeli";
                        readonly type: "string";
                    };
                };
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin satıcısının unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "201": {
            readonly type: "object";
            readonly properties: {
                readonly barcode: {
                    readonly description: "Paketin teslimat kodu";
                    readonly type: "string";
                };
                readonly packageNumber: {
                    readonly description: "Paket numarısı";
                    readonly type: "string";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliver: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly digitalCodes: {
                readonly description: "Dijital ürün kodları";
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly receivedBy: {
                readonly description: "Paketi teslim alacak kişi";
                readonly type: "string";
            };
            readonly receivedDate: {
                readonly description: "Paketin teslim edilme tarihi";
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Satıcının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransit: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly cost: {
                readonly description: "Gönderim ücreti";
                readonly type: "number";
            };
            readonly deci: {
                readonly description: "Paketin hacimsel ağırlığı";
                readonly type: "number";
            };
            readonly estimatedArrivalDate: {
                readonly description: "Paketin tahmini varış tarihi";
                readonly type: "string";
            };
            readonly shippedDate: {
                readonly description: "Paketin kargoya verilme tarihi";
                readonly type: "string";
            };
            readonly tax: {
                readonly description: "Paketin KDV'si";
                readonly type: "number";
            };
            readonly trackingNumber: {
                readonly description: "Kargo takip numarası";
                readonly type: "string";
            };
            readonly trackingPhoneNumber: {
                readonly description: "Kargo takip telefon numarası";
                readonly type: "string";
            };
            readonly trackingUrl: {
                readonly description: "Kargonun takibi için URL bilgisi";
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin satıcısının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplit: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly cancelledItems: {
                readonly description: "İptal edilmek istenen kalem bilgileri";
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly cancelReasonId: {
                            readonly description: "İptal nedeni kodu";
                            readonly type: "integer";
                        };
                        readonly orderLineId: {
                            readonly description: "Kalemin unique Id değeridir";
                            readonly type: "string";
                        };
                        readonly quantity: {
                            readonly description: "Kalem miktarı";
                            readonly type: "integer";
                        };
                    };
                };
            };
            readonly packageDetails: {
                readonly description: "Paket bilgileri";
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly barcode: {
                            readonly description: "Paketin teslimat kodu";
                            readonly type: "string";
                        };
                        readonly cargoCompany: {
                            readonly description: "Kargo firması";
                            readonly type: "string";
                        };
                        readonly carrier: {
                            readonly description: "Kargo firması kısa isim bilgisi";
                            readonly type: "string";
                        };
                        readonly deci: {
                            readonly description: "Paketin hacimsel ağırlığı";
                            readonly type: "number";
                        };
                        readonly lines: {
                            readonly description: "Paketteki kalemlerin bilgileri";
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly orderLineId: {
                                        readonly description: "Kalemin unique Id değeridir";
                                        readonly type: "string";
                                    };
                                    readonly quantity: {
                                        readonly description: "Kalem miktarı";
                                        readonly type: "integer";
                                    };
                                };
                            };
                        };
                        readonly parcelQuantity: {
                            readonly description: "Koli sayısı";
                            readonly type: "integer";
                        };
                        readonly warehouse: {
                            readonly description: "Depo bilgileri";
                            readonly type: "object";
                            readonly properties: {
                                readonly shippingAddressLabel: {
                                    readonly description: "Depo kodu";
                                    readonly type: "string";
                                };
                                readonly shippingModel: {
                                    readonly description: "Teslimat modeli";
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin satıcısının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliver: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly undeliveredDate: {
                readonly description: "Paketin teslim edilememe tarihi";
                readonly type: "string";
            };
            readonly undeliveredReason: {
                readonly description: "Paketin teslim edilememe nedeni";
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin satıcısının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpack: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Satıcının unique Id değeridir";
                };
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packagenumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PutLineitemsMerchantidMerchantidOrderlineidIdCargocompany: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly CargoCompanyShortName: {
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketlenecek kalemin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly id: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketlenecek kalemin unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId", "id"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "204": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PutLineitemsMerchantidMerchantidOrderlineidIdLaborcost: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly unitLaborCost: {
                readonly type: "number";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketlenecek kalemin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly id: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İşçilik maliyeti güncelenecek kalemin unique Id değeridir";
                };
            };
            readonly required: readonly ["merchantId", "id"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "204": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompany: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly CargoCompanyShortName: {
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin hangi satıcıya ait olduğunu belirten bilgidir";
                };
                readonly packageNumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
            };
            readonly required: readonly ["merchantId", "packageNumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "204": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoice: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly arrangementDate: {
                readonly description: "Fatura düzenlenme tarihi";
                readonly type: "string";
            };
            readonly invoiceLink: {
                readonly description: "Fatura Linki";
                readonly type: "string";
            };
            readonly invoices: {
                readonly description: "Faturalar";
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly arrangementDate: {
                            readonly description: "Fatura düzenlenme tarihi";
                            readonly type: "string";
                        };
                        readonly invoiceLink: {
                            readonly description: "Fatura linki";
                            readonly type: "string";
                        };
                        readonly orderNumber: {
                            readonly description: "Sipariş numarası";
                            readonly type: "string";
                        };
                        readonly rowNumber: {
                            readonly description: "Fatura sıra numarası";
                            readonly type: "string";
                        };
                        readonly serialNumber: {
                            readonly description: "Faturanın seri numarası";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly rowNumber: {
                readonly description: "Fatura sıra numarası";
                readonly type: "string";
            };
            readonly serialNumber: {
                readonly description: "Faturanın seri numarası";
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Fatura eklenmek istenen paketin satıcısının unique Id değeridir";
                };
                readonly packageNumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Pakete ait fatura bilgileridir";
                };
            };
            readonly required: readonly ["merchantId", "packageNumber"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "204": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouse: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly shippingAddressLabel: {
                readonly description: "Depo adresini tanımlayan kısa bir etiket bilgisi";
                readonly type: "string";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly packagenumber: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paket numarasıdır";
                };
                readonly merchantId: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Paketin hangi satıcıya ait olduğunu belirten bilgidir";
                };
            };
            readonly required: readonly ["packagenumber", "merchantId"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly "User-Agent": {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "İsteği yapan client'ın bilgilerini içerir";
                };
            };
            readonly required: readonly ["User-Agent"];
        }];
    };
    readonly response: {
        readonly "204": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "401": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly type: "string";
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
export { GetDeliveryChangeablecargocompaniesMerchantidMerchantidOrderlineidOrderlineid, GetLineitemsMerchantidMerchantidPackageablewithLineitemidLineitemid, GetOrdersMerchantidMerchantid, GetOrdersMerchantidMerchantidCancelled, GetOrdersMerchantidMerchantidOrdernumberOrdernumber, GetOrdersMerchantidMerchantidPaymentawaiting, GetPackagesMerchantidMerchantid, GetPackagesMerchantidMerchantidDelivered, GetPackagesMerchantidMerchantidMissingInvoice, GetPackagesMerchantidMerchantidPackagenumberPackagenumber, GetPackagesMerchantidMerchantidPackagenumberPackagenumberChangablecargocompanies, GetPackagesMerchantidMerchantidPackagenumberPackagenumberLabels, GetPackagesMerchantidMerchantidShipped, GetPackagesMerchantidMerchantidStatusUnpacked, GetPackagesMerchantidMerchantidUndelivered, PostLineitemsMerchantidMerchantidIdLineidCancelbymerchant, PostPackagesMerchantidMerchantid, PostPackagesMerchantidMerchantidPackagenumberPackagenumberDeliver, PostPackagesMerchantidMerchantidPackagenumberPackagenumberIntransit, PostPackagesMerchantidMerchantidPackagenumberPackagenumberSplit, PostPackagesMerchantidMerchantidPackagenumberPackagenumberUndeliver, PostPackagesMerchantidMerchantidPackagenumberPackagenumberUnpack, PutLineitemsMerchantidMerchantidOrderlineidIdCargocompany, PutLineitemsMerchantidMerchantidOrderlineidIdLaborcost, PutPackagesMerchantidMerchantidPackagenumberPackagenumberChangecargocompany, PutPackagesMerchantidMerchantidPackagenumberPackagenumberInvoice, PutPackagesMerchantidMerchantidPackagenumberPackagenumberWarehouse };
