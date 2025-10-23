import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../../services/productService';
import { getSuppliers, createSupplier } from '../../services/supplierService';
import { PurchaseService } from '../../services/purchaseService';
import type { Product } from '../../types';

interface SupplierInfo {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PurchaseItemForm {
  product_id: string;
  quantity: number;
  unit_price: number;
  cost_per_unit: number;
  sell_price_per_unit: number;
}

interface SupplierMode {
  type: 'existing' | 'new';
}

const NewPurchase = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [supplierMode, setSupplierMode] = useState<SupplierMode>({ type: 'existing' });
  const [supplier, setSupplier] = useState<SupplierInfo>({
    name: '',
    email: '',
    phone: '',
  });
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PurchaseItemForm[]>([
    {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      cost_per_unit: 0,
      sell_price_per_unit: 0,
    },
  ]);
  const [notes, setNotes] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, suppliersRes] = await Promise.all([
          ProductService.getProducts({}),
          getSuppliers({}),
        ]);
        setProducts(productsRes.data || []);
        setSuppliers(suppliersRes.data || []);
      } catch (err: any) {
        console.error('❌ Error loading data:', err);
        toast.error('Error al cargar datos');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      const fetchPurchase = async () => {
        try {
          setLoading(true);
          const purchase = await PurchaseService.getPurchaseById(id);
          
          // Set supplier mode based on whether supplier exists
          if (purchase.supplier_id) {
            setSupplierMode({ type: 'existing' });
            // Find supplier in the list or set manually
            const existingSupplier = suppliers.find(s => s.id === purchase.supplier_id);
            if (existingSupplier) {
              setSupplier(existingSupplier);
            } else {
              // Supplier not in list, set manually
              setSupplier({
                id: purchase.supplier_id,
                name: purchase.supplier_name || '',
                email: '',
                phone: '',
              });
            }
          } else {
            setSupplierMode({ type: 'new' });
            setSupplier({
              name: purchase.supplier_name || '',
              email: '',
              phone: '',
            });
          }
          
          setInvoiceNumber(purchase.invoice_number || '');
          setPurchaseDate(purchase.purchase_date);
          setNotes(purchase.notes || '');
          setItems(purchase.products.map(p => ({
            product_id: p.product_id,
            quantity: p.quantity,
            unit_price: p.unit_price,
            cost_per_unit: p.cost_per_unit || 0,
            sell_price_per_unit: p.sell_price_per_unit || 0,
          })));
        } catch (error: any) {
          toast.error('Error al cargar la compra');
          navigate('/purchases');
        } finally {
          setLoading(false);
        }
      };
      fetchPurchase();
    }
  }, [isEditing, id, suppliers, navigate]);

  // ============= HELPER FUNCTIONS =============

  const getProductInfo = (productId: string): Product | undefined => {
    return products.find((p) => p.id === productId);
  };

  const isProductAlreadyAdded = (productId: string, currentIndex: number): boolean => {
    return items.some((item, idx) => item.product_id === productId && idx !== currentIndex && productId !== '');
  };

  const getFilteredProducts = (searchTerm: string): Product[] => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    );
  };

  // ============= CALCULATIONS =============

  const calculateCostTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0);
  };

  const calculateSellTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.sell_price_per_unit, 0);
  };

  const calculateProfit = () => {
    return calculateSellTotal() - calculateCostTotal();
  };

  const calculateProfitMargin = () => {
    const sellTotal = calculateSellTotal();
    if (sellTotal === 0) return 0;
    return (calculateProfit() / sellTotal) * 100;
  };

  // ============= EVENT HANDLERS =============

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        quantity: 1,
        unit_price: 0,
        cost_per_unit: 0,
        sell_price_per_unit: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Debe mantener al menos una línea de producto');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems(prevItems => {
        const newItems = [...prevItems];
        newItems[index] = {
          ...newItems[index],
          product_id: productId,
          unit_price: product.price,
          sell_price_per_unit: product.price
        };
        return newItems;
      });
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    const selected = suppliers.find((s) => s.id === supplierId);
    if (selected) {
      setSupplier(selected);
    }
  };

  const validateForm = (): boolean => {
    // Validate supplier
    if (!supplier.name.trim()) {
      toast.error('El nombre del proveedor es requerido');
      return false;
    }

    // Filter valid items
    const validItems = items.filter((item) => item.product_id && item.quantity > 0);
    
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un producto a la compra');
      return false;
    }

    // Validate no duplicates
    const productIds = validItems.map((i) => i.product_id);
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      toast.error('No puede agregar el mismo producto dos veces');
      return false;
    }

    // Validate quantities are positive
    for (const item of validItems) {
      if (item.quantity <= 0) {
        toast.error('La cantidad debe ser mayor a 0');
        return false;
      }
    }

    // Validate prices are non-negative
    for (const item of validItems) {
      if (item.cost_per_unit < 0 || item.unit_price < 0 || item.sell_price_per_unit < 0) {
        toast.error('Los precios no pueden ser negativos');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const validItems = items.filter((item) => item.product_id && item.quantity > 0);

      let finalSupplierId = supplier.id;
      let finalSupplierName = supplier.name;

      // If creating a new supplier, create it first
      if (supplierMode.type === 'new' && !supplier.id) {
        try {
          const newSupplier = await createSupplier({
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: '',
            notes: '',
          });
          finalSupplierId = newSupplier.id;
          finalSupplierName = newSupplier.name;
          toast.success('Proveedor creado exitosamente');
          
          // Refresh suppliers list
          const suppliersRes = await getSuppliers({});
          setSuppliers(suppliersRes.data || []);
        } catch (supplierError: any) {
          toast.error('Error al crear el proveedor: ' + supplierError.message);
          return;
        }
      }

      const purchaseData = {
        supplier_id: finalSupplierId,
        supplier_name: finalSupplierName,
        invoice_number: invoiceNumber,
        products: validItems,
        purchase_date: purchaseDate,
        notes,
      };

      if (isEditing && id) {
        await PurchaseService.updatePurchase({ ...purchaseData, id });
        toast.success('✅ Compra actualizada correctamente');
      } else {
        await PurchaseService.createPurchase(purchaseData);
        toast.success('✅ Compra registrada correctamente');
      }
      navigate('/purchases');
    } catch (err: any) {
      toast.error(err?.message || 'Error al procesar la compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          📦 {isEditing ? 'Editar Compra de Productos' : 'Nueva Compra de Productos'}
        </h1>
        <div className="text-sm text-gray-500">
          Productos disponibles: {products.length}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========== SUPPLIER SECTION ========== */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">👥 Información del Proveedor</h2>

          {/* Supplier Mode Selector */}
          <div className="mb-4 flex gap-6 p-3 bg-gray-50 rounded">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={supplierMode.type === 'existing'}
                onChange={() => {
                  setSupplierMode({ type: 'existing' });
                  setSupplier({ name: '', email: '', phone: '' });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Usar Proveedor Existente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={supplierMode.type === 'new'}
                onChange={() => {
                  setSupplierMode({ type: 'new' });
                  setSupplier({ name: '', email: '', phone: '' });
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Registrar Nuevo Proveedor</span>
            </label>
          </div>

          {/* Existing Supplier */}
          {supplierMode.type === 'existing' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Proveedor
                </label>
                <select
                  value={supplier.id || ''}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Seleccionar --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={supplier.email || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={supplier.phone || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 outline-none"
                />
              </div>
            </div>
          )}

          {/* New Supplier */}
          {supplierMode.type === 'new' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={supplier.name}
                  onChange={(e) => setSupplier({ ...supplier, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <input
                type="email"
                placeholder="Email (opcional)"
                value={supplier.email || ''}
                onChange={(e) => setSupplier({ ...supplier, email: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <input
                type="tel"
                placeholder="Teléfono (opcional)"
                value={supplier.phone || ''}
                onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* Invoice and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Factura
              </label>
              <input
                type="text"
                placeholder="ej: INV-2025-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Compra *
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* ========== PRODUCTS SECTION ========== */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">📋 Productos de la Compra</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              + Agregar Producto
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o SKU..."
              value={productSearchInput}
              onChange={(e) => setProductSearchInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {products.length === 0 && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ No hay productos disponibles. Primero debe crear productos en el inventario.
              </p>
            )}
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Producto (SKU)</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Stock Act.</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Estado</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Cantidad</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">P. Compra</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Costo Unit.</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">P. Venta</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Ganancia</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => {
                  const product = getProductInfo(item.product_id);
                  const isDuplicate = isProductAlreadyAdded(item.product_id, index);
                  const itemCost = item.quantity * item.cost_per_unit;
                  const itemRevenue = item.quantity * item.sell_price_per_unit;
                  const itemGain = itemRevenue - itemCost;

                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${isDuplicate ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''}`}>
                      {/* Product Selection */}
                      <td className="px-3 py-3">
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => {
                            handleProductSelect(index, e.target.value);
                          }}
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${
                            isDuplicate ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'
                          }`}
                          required
                        >
                          <option value="">-- Seleccionar --</option>
                          {getFilteredProducts(productSearchInput).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku || 'N/A'})
                            </option>
                          ))}
                        </select>
                        {isDuplicate && (
                          <p className="text-xs text-yellow-600 mt-1 font-medium">⚠️ Producto duplicado</p>
                        )}
                      </td>

                      {/* Stock Display */}
                      <td className="px-3 py-3 text-center">
                        {product ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            (product.stock || 0) < 5
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock || 0}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Condition Badge */}
                      <td className="px-3 py-3 text-center">
                        {product && (
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            product.condition === 'new'
                              ? 'bg-green-100 text-green-800'
                              : product.condition === 'used'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {product.condition === 'new' ? 'Nuevo' : product.condition === 'used' ? 'Usado' : 'Abierto'}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) handleItemChange(index, 'quantity', val);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Purchase Price */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Cost Unit */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.cost_per_unit}
                          onChange={(e) => handleItemChange(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Sale Price */}
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.sell_price_per_unit}
                          onChange={(e) => handleItemChange(index, 'sell_price_per_unit', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Profit */}
                      <td className={`px-3 py-3 text-right font-bold text-sm ${itemGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${itemGain.toFixed(2)}
                      </td>

                      {/* Remove Button */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition font-medium"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">No hay productos. Haz clic en "+ Agregar Producto"</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== SUMMARY SECTION ========== */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Resumen de Compra</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium">Costo Total</p>
              <p className="text-2xl font-bold text-blue-700">${calculateCostTotal().toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium">Valor Venta Potencial</p>
              <p className="text-2xl font-bold text-purple-700">${calculateSellTotal().toFixed(2)}</p>
            </div>
            <div className={`p-4 rounded-lg ${calculateProfit() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className="text-sm text-gray-700 font-medium">Ganancia Total</p>
              <p className={`text-2xl font-bold ${calculateProfit() >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${calculateProfit().toFixed(2)}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${calculateProfitMargin() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className="text-sm text-gray-700 font-medium">Margen (%)</p>
              <p className={`text-2xl font-bold ${calculateProfitMargin() >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {calculateProfitMargin().toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* ========== NOTES SECTION ========== */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notas de la Compra</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales o comentarios sobre la compra..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* ========== ACTION BUTTONS ========== */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (isEditing ? '⏳ Actualizando...' : '⏳ Registrando...') : (isEditing ? '✅ Actualizar Compra' : '✅ Registrar Compra')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPurchase;
