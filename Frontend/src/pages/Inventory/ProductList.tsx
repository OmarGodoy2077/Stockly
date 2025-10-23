import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductService } from '../../services/productService';
import type { Product } from '../../types';

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getProducts({
        page,
        limit: 10,
        search: search || undefined,
      });
      setProducts(response.data);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  if (loading && products.length === 0) return <div className="p-4">Cargando productos...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Inventario</h1>
        <button
          onClick={() => navigate('/inventory/new')}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Products Grid - Mobile: 1 column, Tablet: 2 columns, Desktop: 3-4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            onClick={() => navigate(`/inventory/${product.id}`)}
          >
            {/* Product Image */}
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">📦</span>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                {product.name}
              </h3>
              
              {product.sku && (
                <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
              )}

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Stock:</span>
                <span className={`text-sm font-semibold ${
                  (product.stock || 0) < 5
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {product.stock || 0} uds
                </span>
              </div>

              {product.price && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Precio:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Condition Badge */}
              <div className="mt-3">
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                  product.condition === 'new'
                    ? 'bg-green-100 text-green-800'
                    : product.condition === 'used'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {product.condition === 'new'
                    ? 'Nuevo'
                    : product.condition === 'used'
                    ? 'Usado'
                    : 'Caja Abierta'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📦</span>
          <p className="text-gray-500 text-lg">No se encontraron productos</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;
