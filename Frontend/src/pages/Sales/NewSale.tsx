import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../../services/productService';
import { SaleService } from '../../services/saleService';
import type { Product } from '../../types';

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
      handleItemChange(index, 'product_id', productId);
      handleItemChange(index, 'unit_price', product.price);
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
      
      // Generate receipt
      try {
        await SaleService.generateReceipt(sale.id);
        toast.success('Recibo generado');
      } catch (err) {
        console.error('Error generando recibo:', err);
      }

      navigate('/sales');
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Venta</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información del Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre del cliente *"
              value={customerData.customer_name}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_name: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={customerData.customer_email}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_email: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={customerData.customer_phone}
              onChange={(e) =>
                setCustomerData({ ...customerData, customer_phone: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <select
              value={salesPlatform}
              onChange={(e) => setSalesPlatform(e.target.value as typeof salesPlatform)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none md:col-span-2"
            />
          </div>
        </div>

        {/* Sale Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Productos de la Venta</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Agregar Producto
            </button>
          </div>

          <div className="space-y-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Producto</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Cantidad</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Precio</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Descuento</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Serial</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      >
                        <option value="">Seleccionar producto</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount || 0}
                        onChange={(e) =>
                          handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2 space-y-1">
                      <input
                        type="text"
                        value={item.serial_number || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'serial_number', e.target.value)
                        }
                        placeholder="Serial"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleOCRCapture(index, file);
                            }
                          }}
                          disabled={ocrLoading}
                          className="w-full text-xs"
                        />
                      </label>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      ${((item.quantity * item.unit_price) - (item.discount || 0)).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warranty & Payment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meses de Garantía
              </label>
              <input
                type="number"
                min="0"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'check' | 'transfer')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between text-xl font-bold text-gray-900">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales de la venta..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || ocrLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando venta...' : 'Crear Venta'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewSale;
