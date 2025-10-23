export interface ServiceHistory {
    id: string;
    warranty_id: string;
    serial_number: string;
    status: 'received' | 'in_repair' | 'delivered';
    reason: string;
    observations?: string;
    photos?: any; // JSONB in backend
    entry_date: string;
  }