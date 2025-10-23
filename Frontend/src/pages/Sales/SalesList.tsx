import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SaleService, type SaleFilter } from '../../services/saleService';
import type { Sale } from '../../types';

const SalesList = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; saleId: string | null; previewUrl: string | null; loading: boolean }>({
    isOpen: false,
    saleId: null,
    previewUrl: null,
    loading: false,
  });

  const itemsPerPage = 10;

  const fetchSales = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const filters: SaleFilter = {
        page,
        limit: itemsPerPage,
        sort_by: 'date',
        sort_order: 'desc',
      };

      if (searchTerm) {
        filters.customer_name = searchTerm;
      }

      const response = await SaleService.getSales(filters);
      setSales(response.data || []);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(page);
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al cargar ventas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [searchTerm]);

  const handleDownloadReceipt = async (id: string, customerName: string) => {
    try {
      toast.loading('Descargando recibo...');
      const blob = await SaleService.downloadReceipt(id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt-${customerName}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Recibo descargado correctamente');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Error al descargar recibo');
    }
  };

  const handlePreviewReceipt = async (id: string) => {
    try {
      setPreviewModal({
        isOpen: true,
        saleId: id,
        previewUrl: null,
        loading: true,
      });
      
      const pdfBlob = await SaleService.downloadReceipt(id);
      const previewUrl = URL.createObjectURL(pdfBlob);
      
      setPreviewModal({
        isOpen: true,
        saleId: id,
        previewUrl,
        loading: false,
      });
    } catch (err: any) {
      toast.error('Error al cargar vista previa del recibo');
      setPreviewModal({
        isOpen: false,
        saleId: null,
        previewUrl: null,
        loading: false,
      });
    }
  };

  const closePreviewModal = () => {
    if (previewModal.previewUrl && previewModal.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewModal.previewUrl);
    }
    setPreviewModal({
      isOpen: false,
      saleId: null,
      previewUrl: null,
      loading: false,
    });
  };

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta venta?')) {
      return;
    }

    try {
      setDeletingId(id);
      await SaleService.deleteSale(id);
      toast.success('Venta eliminada correctamente');
      // Refresh the list
      fetchSales(currentPage);
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar venta');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
        <button
          onClick={() => navigate('/sales/new')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Nueva Venta
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nombre de cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No hay ventas registradas</p>
          <p className="text-gray-400 text-sm mt-1">
            Crea tu primera venta para comenzar
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garantía
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(sale.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sale.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sale.customer_email || sale.customer_phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${(sale.total_amount || sale.total || 0)?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={
                          sale.warranty_months
                            ? 'text-green-600 font-medium'
                            : 'text-gray-500'
                        }
                      >
                        {sale.warranty_months ? `${sale.warranty_months} meses` : 'Sin garantía'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                        title="Ver detalles"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handlePreviewReceipt(sale.id)}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                        title="Vista previa del recibo"
                      >
                        Previsualizar
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(sale.id, sale.customer_name)}
                        className="text-green-600 hover:text-green-900 font-medium"
                        title="Descargar recibo"
                      >
                        Descargar
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        disabled={deletingId === sale.id}
                        className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar venta"
                      >
                        {deletingId === sale.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => fetchSales(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchSales(page)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => fetchSales(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Vista Previa del Recibo</h2>
              <button
                onClick={closePreviewModal}
                disabled={previewModal.loading}
                className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
              {previewModal.loading ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-600">Cargando vista previa...</p>
                </div>
              ) : previewModal.previewUrl ? (
                <embed
                  src={previewModal.previewUrl}
                  type="application/pdf"
                  className="w-full h-full min-h-[500px]"
                  title="Previsualización del recibo"
                />
              ) : (
                <div className="text-center">
                  <p className="text-red-600">Error al cargar la vista previa</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closePreviewModal}
                disabled={previewModal.loading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  if (previewModal.saleId) {
                    const sale = sales.find(s => s.id === previewModal.saleId);
                    if (sale) {
                      handleDownloadReceipt(previewModal.saleId, sale.customer_name);
                    }
                  }
                }}
                disabled={previewModal.loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Descargar desde aquí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;
