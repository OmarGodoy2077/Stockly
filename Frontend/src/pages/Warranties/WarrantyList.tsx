import { useEffect, useState } from 'react';
import { getWarranties, deactivateWarranty } from '../../services/warrantyService';
import { showToast } from '../../utils/toast';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Link } from 'react-router-dom';

interface SaleProduct {
  id: string;
  product_id: string;
  product_name: string;
  serial_number: string;
  quantity: number;
  unit_price: number;
}

interface Warranty {
  id: string;
  serial_number: string;
  start_date: string;
  expires_at: string;
  warranty_months: number;
  is_active: boolean;
  days_remaining: number;
  warranty_status: 'active' | 'expired' | 'expiring_soon';
  product_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_count: number;
  sale_products: SaleProduct[];
  invoice_number?: string; // 🔧 NUEVO
}

interface WarrantyFilters {
  status: 'all' | 'active' | 'expired' | 'expiring_soon';
  serial_number?: string;
  customer_name?: string;
  page: number;
  limit: number;
}

const WarrantyList = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WarrantyFilters>({
    status: 'all',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  useEffect(() => {
    let mounted = true;
    
    const loadWarranties = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getWarranties(filters);
        
        if (mounted) {
          // Validar la estructura de la respuesta
          if (response && typeof response === 'object') {
            // 🔧 FIXED: Backend retorna { data: [...], pagination: {...} }, no { warranties }
            const warrantiesList = Array.isArray(response.data) ? response.data : 
                                   Array.isArray(response.warranties) ? response.warranties : 
                                   [];
            setWarranties(warrantiesList);
            setPagination({
              currentPage: response.pagination?.page || 1,
              totalPages: response.pagination?.totalPages || 1,
              totalItems: response.pagination?.total || 0
            });
          } else {
            setWarranties([]);
          }
        }
      } catch (err: any) {
        if (mounted) {
          const errorMessage = err.response?.data?.message || 'Error al cargar garantías';
          setError(errorMessage);
          showToast.error(errorMessage);
          // En caso de error, mantener el estado vacío
          setWarranties([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadWarranties();

    return () => {
      mounted = false;
    };
  }, [filters]);

  const handleDeactivate = async (id: string) => {
    if (window.confirm('¿Estás seguro de desactivar esta garantía?')) {
      try {
        await deactivateWarranty(id);
        showToast.success('Garantía desactivada correctamente');
        // Recargar datos actualizando filters (trigger useEffect)
        setFilters(prev => ({ ...prev }));
      } catch (err: any) {
        showToast.error(err.response?.data?.message || 'Error al desactivar garantía');
      }
    }
  };

  const handleFilterChange = (key: keyof WarrantyFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Activa ({daysRemaining} días restantes)</Badge>;
      case 'expiring_soon':
        return <Badge variant="warning">Por vencer ({daysRemaining} días restantes)</Badge>;
      case 'expired':
        return <Badge variant="error">Expirada</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Garantías</CardTitle>
          <div className="flex gap-4 flex-wrap">
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-48"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="expiring_soon">Por vencer</option>
              <option value="expired">Expiradas</option>
            </Select>

            <Input
              type="text"
              placeholder="Buscar por número de serie"
              value={filters.serial_number || ''}
              onChange={(e) => handleFilterChange('serial_number', e.target.value)}
              className="w-64"
            />

            <Input
              type="text"
              placeholder="Buscar por cliente"
              value={filters.customer_name || ''}
              onChange={(e) => handleFilterChange('customer_name', e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>

        <CardBody>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vigencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(warranties) && warranties.length > 0 ? (
                    warranties.map((warranty) => (
                      <tr key={warranty.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {warranty.product_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {warranty.invoice_number ? warranty.invoice_number.substring(0, 8) + '...' : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warranty.serial_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{warranty.customer_name}</div>
                          {warranty.customer_email && (
                            <div className="text-sm text-gray-500">{warranty.customer_email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(warranty.warranty_status, warranty.days_remaining)}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          to={`/services?warranty=${warranty.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {warranty.service_count} servicios
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(warranty.start_date)} - {formatDate(warranty.expires_at)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {warranty.warranty_months} meses
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            to={`/services/new?warranty=${warranty.id}`}
                            className="text-primary hover:text-primary-dark"
                          >
                            Nuevo Servicio
                          </Link>
                          {warranty.is_active && (
                            <button
                              onClick={() => handleDeactivate(warranty.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Desactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  ) : (
                    !loading && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                          No se encontraron garantías
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {warranties.length > 0 && pagination.totalPages > 1 && (
            <div className="mt-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(pagination.currentPage - 1) * filters.limit + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * filters.limit, pagination.totalItems)}
                  </span>{' '}
                  de <span className="font-medium">{pagination.totalItems}</span> garantías
                </div>
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default WarrantyList;
