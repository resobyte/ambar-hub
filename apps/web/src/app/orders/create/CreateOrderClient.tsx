'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, Search, Building2, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import { useToast } from "@/components/ui/use-toast";

import { apiPost, getCustomers, getProducts, Customer, Product } from '@/lib/api';
import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// Schema Definition
// -----------------------------------------------------------------------------

const orderTypeSchema = z.enum(['Perakende', 'Personel', 'Pazarlama', 'B2B', 'Pazaryeri']);

const addressSchema = z.object({
    firstName: z.string().min(1, 'Ad zorunludur'),
    lastName: z.string().min(1, 'Soyad zorunludur'),
    phone: z.string().optional(),
    city: z.string().min(1, 'Şehir zorunludur'),
    district: z.string().min(1, 'İlçe zorunludur'),
    postalCode: z.string().optional(),
    addressDetail: z.string().min(1, 'Adres detayı zorunludur'),
});

const itemSchema = z.object({
    productId: z.string().min(1, 'Ürün seçilmelidir'),
    quantity: z.number().min(1, 'Adet en az 1 olmalıdır'),
    price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
    // UI helper fields
    productName: z.string().optional(),
});

const createOrderBaseSchema = z.object({
    customerId: z.string().optional(),
    isNewCustomer: z.boolean(),
    newCustomerData: z.object({
        type: z.enum(['INDIVIDUAL', 'COMMERCIAL']).default('INDIVIDUAL'),
        firstName: z.string().min(1, 'Ad zorunludur'),
        lastName: z.string().min(1, 'Soyad zorunludur'),
        email: z.string().email('Geçerli bir email giriniz').optional().or(z.literal('')),
        phone: z.string().optional(),
        city: z.string().min(1, 'Şehir zorunludur'),
        district: z.string().min(1, 'İlçe zorunludur'),
        postalCode: z.string().optional(),
        addressDetail: z.string().min(1, 'Adres detayı zorunludur'),
        tcIdentityNumber: z.string().optional(),
        taxNumber: z.string().optional(),
        taxOffice: z.string().optional(),
        company: z.string().optional(),
        // Invoice Address
        invoiceCity: z.string().optional(),
        invoiceDistrict: z.string().optional(),
        invoicePostalCode: z.string().optional(),
        invoiceAddress: z.string().optional(),
    }).optional(),

    orderType: orderTypeSchema,
    shippingAddress: addressSchema,
    invoiceAddress: addressSchema,

    items: z.array(itemSchema).min(1, 'En az bir ürün eklemelisiniz'),

    paymentMethod: z.string(), // Hidden or simple select
    storeId: z.string().optional(), // Could be selected or defaulted
});

const createOrderSchema = createOrderBaseSchema.refine((data) => {
    if (data.isNewCustomer) {
        return !!data.newCustomerData?.firstName && !!data.newCustomerData?.lastName;
    }
    return !!data.customerId;
}, {
    message: "Müşteri seçilmeli veya yeni müşteri oluşturulmalıdır",
    path: ["customerId"]
});

type CreateOrderFormValues = z.input<typeof createOrderBaseSchema>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CreateOrderClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Customer Search State
    const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
    const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");

    // Product Search State (Global or per row? Implementing global helper for row usage)
    const [products, setProducts] = useState<Product[]>([]);

    // Initial fetch of some data
    useEffect(() => {
        getCustomers(1, 50)
            .then((res: any) => {
                const list = res.data?.customers || res.customers || res.data || [];
                setCustomers(Array.isArray(list) ? list : []);
            })
            .catch(console.error);

        getProducts(1, 100, { isActive: 'true' })
            .then((res: any) => {
                const list = res.data?.products || res.products || res.data || [];
                setProducts(Array.isArray(list) ? list : []);
            })
            .catch(console.error);
    }, []);

    // Search customers effect
    useEffect(() => {
        const timer = setTimeout(() => {
            getCustomers(1, 50, customerSearch)
                .then((res: any) => {
                    const list = res.data?.customers || res.customers || res.data || [];
                    setCustomers(Array.isArray(list) ? list : []);
                })
                .catch(console.error);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch]);


    // State for Address Toggles
    const [sameAddressOrder, setSameAddressOrder] = useState(true);
    const [sameAddressCustomer, setSameAddressCustomer] = useState(true);

    const form = useForm<CreateOrderFormValues>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            orderType: 'Perakende',
            isNewCustomer: false,
            items: [],
            paymentMethod: 'CASH',
            shippingAddress: {
                firstName: '', lastName: '', city: '', district: '', postalCode: '', addressDetail: ''
            },
            invoiceAddress: {
                firstName: '', lastName: '', city: '', district: '', postalCode: '', addressDetail: ''
            }
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const isNewCustomer = useWatch({ control: form.control, name: "isNewCustomer" });
    const selectedCustomerId = useWatch({ control: form.control, name: "customerId" });
    const orderItems = useWatch({ control: form.control, name: "items" });

    // Sync Order Addresses if "Same" is checked
    useEffect(() => {
        if (sameAddressOrder) {
            const subscription = form.watch((value, { name }) => {
                if (name?.startsWith('shippingAddress')) {
                    form.setValue('invoiceAddress', form.getValues('shippingAddress'));
                }
            });
            return () => subscription.unsubscribe();
        }
    }, [sameAddressOrder, form]);

    // Sync Customer Addresses if "Same" is checked
    useEffect(() => {
        if (sameAddressCustomer) {
            const subscription = form.watch((value, { name }) => {
                const data = value.newCustomerData;
                if (name?.startsWith('newCustomerData') && data) {
                    // Sync main address to invoice address fields (if we were storing them locally before submit)
                    // But here we need to populate the hidden fields or just handle at submit time?
                    // Better to handle visually and at submit time. 
                    // But schema validation might fail if fields are empty and required? 
                    // Schema says optional for invoice fields in newCustomerData.
                }
            });
            return () => subscription.unsubscribe();
        }
    }, [sameAddressCustomer, form]);

    // When customer is selected, pre-fill address fields if available
    useEffect(() => {
        if (selectedCustomerId && !isNewCustomer) {
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                const baseAddress = {
                    firstName: customer.firstName || '',
                    lastName: customer.lastName || '',
                    phone: customer.phone || '',
                    city: customer.city || '',
                    district: customer.district || '',
                    addressDetail: customer.address || '',
                };
                form.setValue('shippingAddress', baseAddress);
                form.setValue('invoiceAddress', baseAddress);
            }
        }
    }, [selectedCustomerId, isNewCustomer, customers, form]);

    // Calculate totals
    const totalAmount = orderItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

    const onSubmit: SubmitHandler<CreateOrderFormValues> = async (data) => {
        try {
            setIsSubmitting(true);

            // Clean up: if isNewCustomer is false, remove newCustomerData to avoid confusion (though schema handles it)
            // If isNewCustomer is true, remove customerId

            const payload = {
                customerId: data.isNewCustomer ? undefined : data.customerId,
                orderType: data.orderType,
                newCustomerData: data.isNewCustomer ? {
                    ...data.newCustomerData,
                    // If same address, map shipping to invoice fields for backend
                    invoiceCity: sameAddressCustomer ? data.newCustomerData?.city : data.newCustomerData?.invoiceCity,
                    invoiceDistrict: sameAddressCustomer ? data.newCustomerData?.district : data.newCustomerData?.invoiceDistrict,
                    invoicePostalCode: sameAddressCustomer ? data.newCustomerData?.postalCode : data.newCustomerData?.invoicePostalCode,
                    invoiceAddress: sameAddressCustomer ? data.newCustomerData?.addressDetail : data.newCustomerData?.invoiceAddress,
                } : undefined,
                shippingAddress: data.shippingAddress,
                // Ensure invoice address is correct for Order
                invoiceAddress: sameAddressOrder ? data.shippingAddress : data.invoiceAddress,
                items: data.items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    price: i.price
                })),
                paymentMethod: data.paymentMethod,
                storeId: data.storeId,
            };

            await apiPost('/orders', payload);

            toast({
                title: "Başarılı",
                description: "Sipariş başarıyla oluşturuldu.",
            });

            router.push('/orders');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Hata",
                description: error.message || "Sipariş oluşturulurken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Sipariş Oluştur</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* Customer Selection Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl">Müşteri Bilgileri</CardTitle>
                            <div className="flex items-center space-x-2">
                                {isNewCustomer && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            form.setValue('isNewCustomer', false);
                                            form.setValue('customerId', undefined);
                                        }}
                                    >
                                        Mevcut Müşteri Seç
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant={isNewCustomer ? "default" : "secondary"}
                                    onClick={() => setIsNewCustomerDialogOpen(true)}
                                >
                                    {isNewCustomer ? "Müşteri Bilgilerini Düzenle" : "Yeni Müşteri Oluştur"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {!isNewCustomer && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="customerId"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Müşteri Ara</FormLabel>
                                                <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox} modal={true}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={openCustomerCombobox}
                                                                className={cn(
                                                                    "w-full justify-between",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? customers.find((customer) => customer.id === field.value)?.firstName + ' ' + customers.find((customer) => customer.id === field.value)?.lastName
                                                                    : "Müşteri seçin..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0">
                                                        <Command shouldFilter={false} className="overflow-visible">
                                                            <CommandInput
                                                                placeholder="Müşteri ara..."
                                                                value={customerSearch}
                                                                onValueChange={setCustomerSearch}
                                                            />
                                                            <CommandList className='max-h-[300px] overflow-y-auto'>
                                                                <CommandEmpty>Müşteri bulunamadı.</CommandEmpty>
                                                                {customers.map((customer) => (
                                                                    <CommandItem
                                                                        key={customer.id}
                                                                        value={customer.id}
                                                                        onSelect={() => {
                                                                            form.setValue("customerId", customer.id);
                                                                            setOpenCustomerCombobox(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span>{customer.firstName} {customer.lastName}</span>
                                                                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* New Customer Dialog */}
                    <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Yeni Müşteri Oluştur</DialogTitle>
                                <DialogDescription>
                                    Sipariş için yeni müşteri bilgilerini giriniz.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {/* Customer Type Selector */}
                                <FormField
                                    control={form.control}
                                    name="newCustomerData.type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Müşteri Tipi</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || 'INDIVIDUAL'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="INDIVIDUAL">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4" /> Bireysel
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="COMMERCIAL">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="w-4 h-4" /> Ticari
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Commercial Fields - only show for COMMERCIAL type */}
                                {form.watch('newCustomerData.type') === 'COMMERCIAL' && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="newCustomerData.company"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Firma Adı</FormLabel>
                                                    <FormControl><Input {...field} placeholder="Firma adı" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="newCustomerData.taxOffice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Vergi Dairesi</FormLabel>
                                                        <FormControl><Input {...field} placeholder="Vergi dairesi" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="newCustomerData.taxNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>VKN</FormLabel>
                                                        <FormControl><Input {...field} placeholder="Vergi kimlik no" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ad</FormLabel>
                                                <FormControl><Input {...field} placeholder="Ad" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Soyad</FormLabel>
                                                <FormControl><Input {...field} placeholder="Soyad" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* TC Identity - only show for INDIVIDUAL type */}
                                {form.watch('newCustomerData.type') !== 'COMMERCIAL' && (
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.tcIdentityNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>TC Kimlik No</FormLabel>
                                                <FormControl><Input {...field} placeholder="TC kimlik numarası" maxLength={11} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Email */}
                                <FormField
                                    control={form.control}
                                    name="newCustomerData.email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>E-posta</FormLabel>
                                            <FormControl><Input {...field} type="email" placeholder="E-posta adresi" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Phone */}
                                <FormField
                                    control={form.control}
                                    name="newCustomerData.phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefon</FormLabel>
                                            <FormControl><Input {...field} placeholder="Telefon numarası" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Address Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Şehir</FormLabel>
                                                <FormControl><Input {...field} placeholder="Şehir" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.district"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>İlçe</FormLabel>
                                                <FormControl><Input {...field} placeholder="İlçe" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="newCustomerData.postalCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Posta Kodu</FormLabel>
                                                <FormControl><Input {...field} placeholder="Posta kodu" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="newCustomerData.addressDetail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Adres</FormLabel>
                                            <FormControl><Input {...field} placeholder="Açık adres" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Invoice Address Section */}
                                <div className="border rounded p-4 bg-muted/20">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Checkbox
                                            id="sameAddressCustomer"
                                            checked={sameAddressCustomer}
                                            onCheckedChange={(c) => setSameAddressCustomer(!!c)}
                                        />
                                        <label htmlFor="sameAddressCustomer" className="text-sm font-medium leading-none cursor-pointer">
                                            Fatura adresi teslimat adresiyle aynı
                                        </label>
                                    </div>

                                    {!sameAddressCustomer && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="newCustomerData.invoiceCity"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fatura İli</FormLabel>
                                                            <FormControl><Input {...field} placeholder="İl" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="newCustomerData.invoiceDistrict"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fatura İlçesi</FormLabel>
                                                            <FormControl><Input {...field} placeholder="İlçe" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="newCustomerData.invoicePostalCode"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fatura Posta Kodu</FormLabel>
                                                            <FormControl><Input {...field} placeholder="Posta kodu" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="newCustomerData.invoiceAddress"
                                                render={({ field }) => (
                                                    <FormItem className="mt-4">
                                                        <FormLabel>Fatura Adresi</FormLabel>
                                                        <FormControl><Input {...field} placeholder="Açık fatura adresi" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)}>İptal</Button>
                                <Button type="button" onClick={() => {
                                    form.setValue('isNewCustomer', true);
                                    form.setValue('customerId', undefined);
                                    setIsNewCustomerDialogOpen(false);
                                }}>Kaydet</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Order Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Sipariş Detayları</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="orderType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sipariş Tipi</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tip seçin" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Perakende">Perakende</SelectItem>
                                                <SelectItem value="Personel">Personel</SelectItem>
                                                <SelectItem value="Pazarlama">Pazarlama</SelectItem>
                                                <SelectItem value="B2B">B2B</SelectItem>
                                                <SelectItem value="Pazaryeri">Pazaryeri</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Address Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Teslimat Adresi</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormAddressFields form={form} prefix="shippingAddress" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl">Fatura Adresi</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sameAddressOrder"
                                        checked={sameAddressOrder}
                                        onCheckedChange={(c) => setSameAddressOrder(!!c)}
                                    />
                                    <label htmlFor="sameAddressOrder" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Teslimat ile Aynı
                                    </label>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!sameAddressOrder && (
                                    <FormAddressFields form={form} prefix="invoiceAddress" />
                                )}
                                {sameAddressOrder && (
                                    <div className="text-muted-foreground text-sm italic">
                                        Fatura adresi teslimat adresi ile aynı olacak.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Order Items */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl">Ürünler</CardTitle>
                            <Button type="button" onClick={() => append({ productId: '', quantity: 1, price: 0, productName: '' })}>
                                <Plus className="w-4 h-4 mr-2" /> Ürün Ekle
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-end border-b pb-4">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.productId`}
                                        render={({ field: productField }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Ürün</FormLabel>
                                                <ProductCombobox
                                                    value={productField.value}
                                                    onChange={(val, product) => {
                                                        productField.onChange(val);
                                                        if (product) {
                                                            form.setValue(`items.${index}.price`, product.purchasePrice || 0);
                                                            form.setValue(`items.${index}.productName`, product.name || '');
                                                        }
                                                    }}
                                                    products={products}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field: qtyField }) => (
                                            <FormItem className="w-24">
                                                <FormLabel>Adet</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={1} {...qtyField} onChange={e => qtyField.onChange(Number(e.target.value))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.price`}
                                        render={({ field: priceField }) => (
                                            <FormItem className="w-32">
                                                <FormLabel>Alış Fiyatı</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} step="0.01" {...priceField} onChange={e => priceField.onChange(Number(e.target.value))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="pb-2 w-32 font-medium text-right">
                                        {(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.price`)).toFixed(2)} TL
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="mb-0.5 text-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}

                            <div className="flex justify-end pt-4">
                                <div className="text-2xl font-bold">
                                    Toplam: {totalAmount.toFixed(2)} TL
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>İptal</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Sipariş Oluştur
                        </Button>
                    </div>

                </form>
            </Form>
        </div >
    );
}

function FormAddressFields({ form, prefix }: { form: any, prefix: string }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name={`${prefix}.firstName`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ad</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${prefix}.lastName`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Soyad</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${prefix}.city`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Şehir</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${prefix}.district`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>İlçe</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${prefix}.postalCode`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Posta Kodu</FormLabel>
                        <FormControl><Input {...field} placeholder="Opsiyonel" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${prefix}.addressDetail`}
                render={({ field }) => (
                    <FormItem className="col-span-2">
                        <FormLabel>Adres Detayı</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}

function ProductCombobox({ value, onChange, products }: { value: string, onChange: (id: string, product?: Product) => void, products: Product[] }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    // Internal filtered products based on command input if standard filter is not enough
    // But Command performs filtering defaultly.
    // If list is huge, we might need manual filter logic, but 100 products is fine.

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between",
                            !value && "text-muted-foreground"
                        )}
                    >
                        {value
                            ? products.find((product) => product.id === value)?.name
                            : "Ürün seçin..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command className="overflow-visible">
                    <CommandInput placeholder="Ürün ara..." />
                    <CommandList className='max-h-[300px] overflow-y-auto'>
                        <CommandEmpty>Ürün bulunamadı.</CommandEmpty>
                        <CommandGroup>
                            {products.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={product.name} // Filter by name
                                    onSelect={() => {
                                        onChange(product.id, product)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === product.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        <span className="text-xs text-muted-foreground">{product.barcode} - {product.salePrice} TL</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
