export interface ServiceHistory {
    id: string;
    warranty_id: string | null;
    company_id: string;
    serial_number: string;
    product_name: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    entry_date: Date;
    expected_delivery_date?: Date;
    actual_delivery_date?: Date;
    status: ServiceStatus;
    priority: ServicePriority;
    reason: string;
    diagnosis?: string;
    solution?: string;
    observations?: string;
    internal_notes?: string;
    estimated_cost?: number;
    actual_cost?: number;
    photos?: string[];
    technician_id?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    warranty_info?: {
        expires_at: Date;
        days_remaining: number;
        is_active: boolean;
    };
    technician_name?: string;
}

export type ServiceStatus = 'received' | 'in_repair' | 'waiting_parts' | 'ready' | 'delivered' | 'cancelled';
export type ServicePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ServiceHistoryFilters {
    companyId: string;
    status?: ServiceStatus | 'all';
    priority?: ServicePriority | 'all';
    warrantyId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface ServiceHistoryPagination {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ServiceHistoryResponse {
    services: ServiceHistory[];
    pagination: ServiceHistoryPagination;
}

export interface ServiceHistoryStatistics {
    total_services: number;
    received_count: number;
    in_repair_count: number;
    waiting_parts_count: number;
    ready_count: number;
    delivered_count: number;
    cancelled_count: number;
    urgent_count: number;
    high_priority_count: number;
    under_warranty_count: number;
    avg_repair_days: number;
    avg_repair_cost: number;
}