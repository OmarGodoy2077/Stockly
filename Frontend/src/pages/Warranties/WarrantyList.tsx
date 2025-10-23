import { useEffect, useState } from 'react';
import { getWarranties, deactivateWarranty } from '../../services/warrantyService';

interface Warranty {
  id: string;
  serial_number: string;
  start_date: string;
  end_date: string;
  warranty_months: number;
  is_active: boolean;
  product?: {
    name: string;
  };
  customer_name?: string;
}

const WarrantyList = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const data = await getWarranties({});
      setWarranties(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar garantías');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm('¿Estás seguro de desactivar esta garantía?')) {
      try {
        await deactivateWarranty(id);
        fetchWarranties();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al desactivar garantía');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) return <div className="p-4">Cargando garantías...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Garantías</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Serie
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {warranties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay garantías registradas
                  </td>
                </tr>
              ) : (
                warranties.map((warranty) => (
                  <tr key={warranty.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{warranty.serial_number}</div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{warranty.product?.name || '-'}</div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{warranty.customer_name || '-'}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(warranty.end_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        warranty.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {warranty.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {warranty.is_active && (
                        <button
                          onClick={() => handleDeactivate(warranty.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WarrantyList;
