import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../../services/productService';
import { SaleService } from '../../services/saleService';
import type { Product } from '../../types';
import { SerialNumberInput } from '../../components/SerialNumberInput';

interface SaleItemForm {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  serial_number?: string;
}

const NewSale = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerData, setCustomerData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
  });
  const [items, setItems] = useState<SaleItemForm[]>([
    { product_id: '', quantity: 1, unit_price: 0, discount: 0, serial_number: '' },
  ]);
  const [warrantyMonths, setWarrantyMonths] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'check' | 'transfer'>('cash');
  const [salesPlatform, setSalesPlatform] = useState<'direct' | 'amazon' | 'ebay' | 'shopify' | 'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'marketplace' | 'otros'>('direct');
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await ProductService.getProducts({});
        setProducts(response.data || []);
      } catch (err: any) {
        console.error('Error loading products:', err);
      }
    };
    fetchProducts();
  }, []);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      const discount = item.discount || 0;
      return sum + (lineTotal - discount);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { product_id: '', quantity: 1, unit_price: 0, discount: 0, serial_number: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
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
        // Limitar la cantidad máxima al stock disponible
        const maxQuantity = product.stock || 0;
        const currentQuantity = Math.min(newItems[index].quantity, maxQuantity);
        
        newItems[index] = {
          ...newItems[index],
          product_id: productId,
          unit_price: product.price,
          quantity: currentQuantity > 0 ? currentQuantity : 1
        };
        return newItems;
      });
    }
  };

  const handleOCRCapture = async (index: number, file: File) => {
    if (!file) return;

    try {
      setOcrLoading(true);
      const result = await SaleService.extractSerialNumber(file);
      handleItemChange(index, 'serial_number', result.serial_number);
      toast.success(`Serial capturado: ${result.serial_number}`);
    } catch (err: any) {
      toast.error('Error al procesar OCR: ' + (err?.message || 'Intente nuevamente'));
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerData.customer_name.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    const validItems = items.filter((item) => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un producto a la venta');
      return;
    }

    // Validar stock disponible
    for (const item of validItems) {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) {
        toast.error('Producto no encontrado');
        return;
      }
      if (item.quantity > (product.stock || 0)) {
        toast.error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock || 0}`);
        return;
      }
    }

    try {
      setLoading(true);
      const saleData = {
        ...customerData,
        items: validItems,
        warranty_months: warrantyMonths || undefined,
        notes,
        payment_method: paymentMethod,
        sales_platform: salesPlatform,
      };

      const sale = await SaleService.createSale(saleData);
      toast.success('Venta creada correctamente');
      
      // Generate receipt (opcional, no bloquea la venta)
      if (sale && sale.id) {
        try {
          await SaleService.generateReceipt(sale.id);
          toast.success('Recibo generado');
        } catch (err) {
          console.error('Error generando recibo:', err);
          // No mostrar error al usuario, la venta ya fue creada
        }
      }

      navigate('/sales');
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Nueva Venta</h1>
        <button
          onClick={() => navigate('/sales')}
          type="button"
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium w-full sm:w-auto"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Customer Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Información del Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Nombre del cliente *"
              value={customerData.customer_name}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_name: e.target.value })
              }
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={customerData.customer_email}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_email: e.target.value })
              }
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={customerData.customer_phone}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_phone: e.target.value })
              }
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
            />
            <select
              value={salesPlatform}
              onChange={(e) => setSalesPlatform(e.target.value as typeof salesPlatform)}
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all"
            >
              <option value="direct">Venta Directa</option>
              <option value="amazon">Amazon</option>
              <option value="ebay">eBay</option>
              <option value="shopify">Shopify</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="marketplace">Marketplace</option>
              <option value="otros">Otros</option>
            </select>
            <textarea
              placeholder="Dirección"
              value={customerData.customer_address}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_address: e.target.value })
              }
              rows={2}
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all md:col-span-2"
            />
          </div>
        </div>

        {/* Sale Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Productos de la Venta</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition-colors font-medium w-full sm:w-auto"
            >
              Agregar Producto
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Producto</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Cantidad</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Precio</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Descuento</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Serial</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Total</th>
                  <th className="px-2 sm:px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item, index) => (
                  <Fragment key={`item-${index}`}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-2 sm:px-3 py-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        >
                          <option value="">Seleccionar</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 sm:px-3 py-2">
                        {(() => {
                          const product = products.find((p) => p.id === item.product_id);
                          const maxStock = product?.stock || 0;
                          return (
                            <div>
                              <input
                                type="number"
                                min="1"
                                max={maxStock}
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  const limitedValue = Math.min(value, maxStock);
                                  handleItemChange(index, 'quantity', limitedValue);
                                  if (value > maxStock && maxStock > 0) {
                                    toast.error(`Stock máximo: ${maxStock}`);
                                  }
                                }}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              {product && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Stock: {maxStock}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-2 sm:px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 sm:px-3 py-2 hidden lg:table-cell">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount || 0}
                          onChange={(e) =>
                            handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-2 sm:px-3 py-2 hidden lg:table-cell">
                        <SerialNumberInput
                          value={item.serial_number || ''}
                          onChange={(value) => handleItemChange(index, 'serial_number', value)}
                          onOCRCapture={async (file) => {
                            await handleOCRCapture(index, file);
                          }}
                          disabled={ocrLoading}
                        />
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                        ${((item.quantity * item.unit_price) - (item.discount || 0)).toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-bold text-lg transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                    {/* Mobile expandable section for Discount and Serial */}
                    <tr className="lg:hidden">
                      <td colSpan={7} className="px-2 sm:px-3 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                        <div className="space-y-3">
                          {/* Discount field for mobile */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Descuento
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount || 0}
                              onChange={(e) =>
                                handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0.00"
                            />
                          </div>
                          {/* Serial Number field for mobile */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Número de Serie
                            </label>
                            <SerialNumberInput
                              value={item.serial_number || ''}
                              onChange={(value) => handleItemChange(index, 'serial_number', value)}
                              onOCRCapture={async (file) => {
                                await handleOCRCapture(index, file);
                              }}
                              disabled={ocrLoading}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warranty & Payment */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meses de Garantía
              </label>
              <input
                type="number"
                min="0"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'check' | 'transfer')
                }
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="check">Cheque</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales de la venta..."
            rows={3}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || ocrLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creando venta...' : 'Crear Venta'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewSale;