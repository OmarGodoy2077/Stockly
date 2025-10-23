import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductService } from '../../services/productService';
import { CategoryService } from '../../services/categoryService';
import { CategoryManager } from './CategoryManager';
import type { CreateProductData } from '../../services/productService';
import type { CategoryTree } from '../../services/categoryService';

const ProductAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [showAutoSKU, setShowAutoSKU] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryTree | null>(null);

  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    sku: '',
    brand: '',
    description: '',
    category_id: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // Auto-generate SKU from name
  const generateSKUFromName = (name: string): string => {
    if (!name.trim()) return '';
    return name
      .toUpperCase()
      .substring(0, 3)
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(3, 'A') +
      '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const loadCategories = async () => {
    try {
      const data = await CategoryService.getCategoryTree();
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          type === 'number'
            ? value === ''
              ? 0
              : Number(value)
            : value,
      };

      // Auto-generate SKU when name changes and SKU is empty
      if (name === 'name' && !prev.sku) {
        updated.sku = generateSKUFromName(value);
        setShowAutoSKU(true);
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validations
    if (!formData.name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    if (!formData.category_id.trim()) {
      setError('La categoría es requerida');
      return;
    }

    try {
      setLoading(true);

      // Ensure category_id is not an empty string
      if (!formData.category_id || formData.category_id.trim() === '') {
        setError('La categoría es requerida');
        return;
      }

      const productData: CreateProductData = {
        name: formData.name.trim(),
        sku: formData.sku?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        category_id: formData.category_id.trim(),
      };

      console.log('Submitting product:', productData);

      const response = await ProductService.createProduct(productData);
      
      console.log('Product created successfully:', response);
      setSuccess(true);
      
      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate('/inventory');
      }, 1500);
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Error al crear el producto'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
          >
            <span>←</span> Volver al Inventario
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Agregar Nuevo Producto
          </h1>
          <p className="text-gray-600">
            Completa los datos básicos del producto
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
              {/* Success Alert */}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-pulse">
                  <span className="text-green-600 text-xl flex-shrink-0">✓</span>
                  <div className="flex-1">
                    <p className="text-green-700 font-medium text-sm">Éxito</p>
                    <p className="text-green-600 text-sm mt-1">
                      Producto creado correctamente. Redirigiendo...
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <span className="text-red-600 text-xl flex-shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="text-red-700 font-medium text-sm">Error</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre del Producto */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Nombre del Producto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Laptop Dell Inspiron 15"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre descriptivo del producto
                  </p>
                </div>

                {/* Marca */}
                <div>
                  <label
                    htmlFor="brand"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Marca <span className="text-gray-400">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    id="brand"
                    name="brand"
                    value={formData.brand || ''}
                    onChange={handleInputChange}
                    placeholder="Ej: Dell, HP, Lenovo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fabricante o marca del producto
                  </p>
                </div>

                {/* Descripción */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Descripción <span className="text-gray-400">(Opcional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    placeholder="Describe características especiales del producto..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 resize-none"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 1000 caracteres
                  </p>
                </div>

                {/* SKU */}
                <div>
                  <label
                    htmlFor="sku"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    SKU
                    {showAutoSKU && (
                      <span className="text-green-600 text-xs ml-1">
                        (Auto generado)
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        setShowAutoSKU(false);
                      }}
                      placeholder="Ej: DELL-INS-001"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          sku: generateSKUFromName(prev.name),
                        }));
                        setShowAutoSKU(true);
                      }}
                      className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors"
                      title="Generar nuevo SKU automático"
                    >
                      🔄
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Código único del producto (se genera automáticamente)
                  </p>
                </div>

                {/* Categoría */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-md text-sm transition-colors"
                    >
                      <span>➕</span> Nueva
                    </button>
                  </div>

                  {/* Category Selection Grid */}
                  {Array.isArray(categories) && categories.length > 0 ? (
                    <div className="space-y-4">
                      {!selectedCategory ? (
                        <div className="grid grid-cols-2 gap-3">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              onClick={() => {
                                if (category.children && category.children.length > 0) {
                                  setSelectedCategory(category);
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    category_id: category.id,
                                  }));
                                }
                              }}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                formData.category_id === category.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <p className="font-medium text-sm text-gray-900">
                                {category.name}
                              </p>
                              {category.children && category.children.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {category.children.length} subcategoría
                                  {category.children.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCategory(null)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              ← Volver a categorías
                            </button>
                            <span className="text-sm text-gray-600">
                              Seleccionando subcategoría de: {selectedCategory.name}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedCategory.children?.map((subcategory) => (
                              <div
                                key={subcategory.id}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    category_id: subcategory.id,
                                  }));
                                  setSelectedCategory(null);
                                }}
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                  formData.category_id === subcategory.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <p className="font-medium text-sm text-gray-900">
                                  {subcategory.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <p className="text-sm text-gray-600">
                        No hay categorías. Crea una nueva.
                      </p>
                    </div>
                  )}

                  {!formData.category_id && (
                    <p className="text-xs text-red-500 mt-2">
                      ⚠️ Selecciona una categoría
                    </p>
                  )}
                  {formData.category_id && (
                    <p className="text-xs text-green-500 mt-2">
                      ✓ Categoría seleccionada
                    </p>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    ℹ️ Información
                  </p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>✓ Nombre y Categoría son requeridos</li>
                    <li>✓ SKU se genera automáticamente</li>
                    <li>✓ Stock se configura en compras</li>
                    <li>✓ Precio se configura en ventas</li>
                  </ul>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={
                      loading || !formData.name.trim() || !formData.category_id
                    }
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">⏳</span> Guardando...
                      </>
                    ) : (
                      <>
                        <span>✓</span> Guardar Producto
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/inventory')}
                    disabled={loading}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {showCategoryManager ? (
              <div className="sticky top-6">
                <CategoryManager
                  selectedCategoryId={formData.category_id}
                  onCategorySelect={(id) => {
                    setFormData((prev) => ({ ...prev, category_id: id }));
                    setShowCategoryManager(false);
                  }}
                  onClose={() => {
                    setShowCategoryManager(false);
                    loadCategories();
                  }}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📋 Campos requeridos
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold flex-shrink-0">•</span>
                      <span>
                        <strong>Nombre</strong> - Descripción del producto
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold flex-shrink-0">•</span>
                      <span>
                        <strong>Categoría</strong> - Clasificación
                      </span>
                    </li>
                  </ul>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    🎨 Campos opcionales
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      <span>
                        <strong>Marca</strong> - Fabricante
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      <span>
                        <strong>Descripción</strong> - Detalles
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      <span>
                        <strong>SKU</strong> - Auto generado
                      </span>
                    </li>
                  </ul>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📊 Se configura después
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-blue-600 flex-shrink-0">→</span>
                      <span>
                        <strong>Stock</strong> - En compras
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 flex-shrink-0">→</span>
                      <span>
                        <strong>Precio</strong> - En ventas
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 flex-shrink-0">→</span>
                      <span>
                        <strong>Imagen</strong> - En compras
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700">
                    💡 Los datos se pueden editar después de crear el producto.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAdd;
