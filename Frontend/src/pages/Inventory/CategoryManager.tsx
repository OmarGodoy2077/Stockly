import { useState, useEffect } from 'react';
import { CategoryService } from '../../services/categoryService';
import type { CategoryTree } from '../../services/categoryService';

interface CategoryManagerProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategoryId?: string;
  onClose?: () => void;
}

export const CategoryManager = ({
  onCategorySelect,
  selectedCategoryId,
  onClose,
}: CategoryManagerProps) => {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading categories...');
      const data = await CategoryService.getCategoryTree();
      console.log('Categories loaded:', data);
      setCategories(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar categorías';
      console.error('Error loading categories:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await CategoryService.createCategory({
        name: newCategoryName.trim(),
        parent_id: selectedParentId || undefined,
      });

      setNewCategoryName('');
      setSelectedParentId(null);
      setShowForm(false);

      // Reload categories
      await loadCategories();
    } catch (err: any) {
      // El error viene del categoryService que ya lo formatea
      // err.message contiene el mensaje de error formateado
      const errorMsg = err.message || 'Error al crear la categoría';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await CategoryService.deleteCategory(categoryId);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryTree = (categories: CategoryTree[] | undefined, level = 0) => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return null;
    }

    return categories.map((category) => (
      <div key={category.id} className={`ml-${level * 4}`}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100">
          {/* Category Button */}
          <button
            onClick={() => {
              onCategorySelect?.(category.id);
            }}
            className={`flex-1 text-left py-2 px-3 rounded-md transition-all ${
              selectedCategoryId === category.id
                ? 'bg-blue-100 border-l-4 border-blue-600 text-blue-700 font-semibold'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-sm">{category.name}</span>
          </button>

          {/* Subcategory button */}
          <button
            onClick={() => {
              setSelectedParentId(category.id);
              setShowForm(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
            title="Agregar subcategoría"
          >
            <span className="text-lg">➕</span>
          </button>

          {/* Delete button */}
          <button
            onClick={() => handleDeleteCategory(category.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded-md"
            title="Eliminar categoría"
          >
            <span className="text-lg">🗑️</span>
          </button>
        </div>

        {/* Render children */}
        {category.children && category.children.length > 0 && (
          <div className="ml-4 border-l-2 border-gray-200">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Categorías</h3>
          <p className="text-sm text-gray-500">
            Selecciona una categoría o crea nuevas
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 text-xs mt-1 underline"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Categories List */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {loading && categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-500 mt-2 text-sm">Cargando categorías...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No hay categorías creadas</p>
            <p className="text-xs mt-1">Crea una nueva para empezar</p>
          </div>
        ) : (
          <div className="space-y-1">{renderCategoryTree(categories)}</div>
        )}
      </div>

      {/* Create New Category Section */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {!showForm ? (
          <button
            onClick={() => {
              setShowForm(true);
              setSelectedParentId(null);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            <span>➕</span> Nueva Categoría Principal
          </button>
        ) : (
          <form onSubmit={handleCreateCategory} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre de la categoría *
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej: Electrónica, Componentes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400"
                autoFocus
              />
            </div>

            {selectedParentId && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs font-medium text-blue-700">
                  Creando subcategoría
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewCategoryName('');
                  setSelectedParentId(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-700">
        <p>💡 Tip: Haz clic en ➕ junto a una categoría para crear una subcategoría</p>
      </div>
    </div>
  );
};
