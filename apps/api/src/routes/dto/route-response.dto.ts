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
    pickedItemCount: number;
    packedOrderCount: number;
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
        dto.pickedItemCount = route.pickedItemCount;
        dto.packedOrderCount = route.packedOrderCount;
        dto.isActive = route.isActive;
        dto.createdAt = route.createdAt;
        dto.updatedAt = route.updatedAt;

        if (route.orders) {
            dto.orders = route.orders.map(order => ({
                id: order.id,
                orderNumber: order.orderNumber,
                packageId: order.packageId,
                status: order.status,
                totalPrice: order.totalPrice,
                orderDate: order.orderDate,
            }));
        }

        return dto;
    }
}
