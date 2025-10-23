import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchases, deletePurchase } from '../../services/purchaseService';
import type { Purchase } from '../../types';
import toast from 'react-hot-toast';

const PurchaseList = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchases({});
      setPurchases(data.data || data || []);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Error al cargar las compras';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleEdit = (purchase: Purchase) => {
    navigate(`/purchases/edit/${purchase.id}`);
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la compra ${purchase.invoice_number || purchase.id}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setDeletingId(purchase.id);
      await deletePurchase(purchase.id);
      toast.success('Compra eliminada exitosamente');
      // Refresh the list
      await fetchPurchases();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Error al eliminar la compra';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando compras...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">📦 Compras</h1>
        <div className="flex space-x-2">
          <button 
            onClick={fetchPurchases}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Cargando...' : '🔄 Actualizar'}
          </button>
          <button 
            onClick={() => navigate('/purchases/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Nueva Compra
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No hay compras registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(purchase.purchase_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {purchase.invoice_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${purchase.total_amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ${purchase.cost_amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={purchase.profit_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${purchase.profit_amount?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      onClick={() => handleEdit(purchase)}
                      disabled={deletingId === purchase.id}
                    >
                      Editar
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      onClick={() => handleDelete(purchase)}
                      disabled={deletingId === purchase.id}
                    >
                      {deletingId === purchase.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseList;
