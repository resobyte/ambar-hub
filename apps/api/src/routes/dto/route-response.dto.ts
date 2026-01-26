import { Route } from '../entities/route.entity';
import { RouteStatus } from '../enums/route-status.enum';

export class RouteResponseDto {
    id: string;
    name: string;
    description: string | null;
    status: RouteStatus;
    labelPrintedAt: Date | null;
    totalOrderCount: number;
    totalItemCount: number;
    uniqueProductCount: number;
    pickedItemCount: number;
    packedOrderCount: number;
    createdById: string | null;
    createdByName: string | null;
    orderStartDate: Date | null;
    orderEndDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    orders?: any[];

    static fromEntity(route: Route): RouteResponseDto {
        const dto = new RouteResponseDto();
        dto.id = route.id;
        dto.name = route.name;
        dto.description = route.description;
        dto.status = route.status;
        dto.labelPrintedAt = route.labelPrintedAt;
        dto.totalOrderCount = route.totalOrderCount;
        dto.totalItemCount = route.totalItemCount;
        dto.uniqueProductCount = route.uniqueProductCount || 0;
        dto.pickedItemCount = route.pickedItemCount;
        dto.packedOrderCount = route.packedOrderCount;
        dto.createdById = route.createdById;
        dto.createdByName = route.createdBy?.firstName
            ? `${route.createdBy.firstName} ${route.createdBy.lastName || ''}`.trim()
            : null;
        dto.orderStartDate = route.orderStartDate;
        dto.orderEndDate = route.orderEndDate;
        dto.isActive = route.isActive;
        dto.createdAt = route.createdAt;
        dto.updatedAt = route.updatedAt;

        if (route.routeOrders) {
            dto.orders = route.routeOrders
                .filter(ro => ro.order)
                .map(ro => ({
                    id: ro.order.id,
                    orderNumber: ro.order.orderNumber,
                    packageId: ro.order.packageId,
                    status: ro.order.status,
                    totalPrice: ro.order.totalPrice,
                    orderDate: ro.order.orderDate,
                    sequence: ro.sequence,
                    isPicked: ro.isPicked,
                    isPacked: ro.isPacked,
                    hasLabel: !!ro.order.cargoLabelZpl,
                    items: ro.order.items?.map(item => ({
                        barcode: item.barcode,
                        productName: item.productName,
                        quantity: item.quantity,
                        sku: item.sku,
                    })) || [],
                    customer: ro.order.customer ? {
                        firstName: ro.order.customer.firstName,
                        lastName: ro.order.customer.lastName,
                    } : null,
                }));
        }

        return dto;
    }
}
