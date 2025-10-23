import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductService } from '../../services/productService';
import { InvoiceService } from '../../services/invoiceService';
import type { Product } from '../../types';

interface InvoiceItem {
  item_type: 'product' | 'shipping' | 'commission' | 'discount' | 'tax';
  item_name: string;
  quantity: number;
  unit_price: number;
  is_taxable?: boolean;
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerData, setCustomerData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { item_type: 'product', item_name: '', quantity: 1, unit_price: 0, is_taxable: true },
  ]);
  const [notes, setNotes] = useState('');
  const [isDraft, setIsDraft] = useState(false);

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
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateTax = () => {
    const taxItems = items.filter((item) => item.is_taxable && item.item_type === 'product');
    return taxItems.reduce((sum, item) => sum + item.quantity * item.unit_price * 0.19, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax;
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { item_type: 'product', item_name: '', quantity: 1, unit_price: 0, is_taxable: true },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerData.customer_name.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    if (items.length === 0 || items.every((item) => !item.item_name)) {
      toast.error('Debe agregar al menos un item a la factura');
      return;
    }

    try {
      setLoading(true);
      const invoiceData = {
        ...customerData,
        items,
        notes,
        is_draft: isDraft,
      };

      await InvoiceService.createInvoice(invoiceData);
      toast.success('Factura creada correctamente');
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Factura</h1>
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
              onChange={(e) => setCustomerData({ ...customerData, customer_name: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={customerData.customer_email}
              onChange={(e) => setCustomerData({ ...customerData, customer_email: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={customerData.customer_phone}
              onChange={(e) => setCustomerData({ ...customerData, customer_phone: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <textarea
              placeholder="Dirección"
              value={customerData.customer_address}
              onChange={(e) => setCustomerData({ ...customerData, customer_address: e.target.value })}
              rows={2}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none md:col-span-2"
            />
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Items de la Factura</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Agregar Item
            </button>
          </div>

          <div className="space-y-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Descripción</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Cantidad</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Precio Unitario</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <select
                        value={item.item_type}
                        onChange={(e) =>
                          handleItemChange(index, 'item_type', e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="product">Producto</option>
                        <option value="shipping">Envío</option>
                        <option value="discount">Descuento</option>
                        <option value="tax">Impuesto</option>
                        <option value="commission">Comisión</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {item.item_type === 'product' ? (
                        <select
                          value={item.item_name}
                          onChange={(e) => {
                            const selected = products.find((p) => p.name === e.target.value);
                            if (selected) {
                              handleItemChange(index, 'item_name', selected.name);
                              handleItemChange(index, 'unit_price', selected.price);
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Seleccionar producto</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemChange(index, 'item_name', e.target.value)
                          }
                          placeholder="Descripción"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      )}
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
                    <td className="px-3 py-2 text-right font-semibold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
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

        {/* Totals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA (19%):</span>
              <span className="font-semibold">${calculateTax().toFixed(2)}</span>
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
            placeholder="Notas adicionales para la factura..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDraft(true);
              handleSubmit({ preventDefault: () => {} } as React.FormEvent);
            }}
            disabled={loading}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Guardar como Borrador
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Factura'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
