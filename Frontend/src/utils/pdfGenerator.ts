/**
 * PDF Generation Utilities
 * 
 * This file provides helper functions for generating PDFs for receipts and invoices
 * using HTML + Print to PDF functionality (no external PDF library needed)
 */

import type { Sale, Invoice } from '../types';

export interface CompanyInfo {
  name: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

/**
 * Generate a simple HTML string for receipt printing
 * Can be printed directly via window.print() or converted to PDF
 */
export const generateSaleReceiptHTML = (sale: Sale, company: CompanyInfo): string => {
  const saleDate = new Date(sale.created_at).toLocaleDateString('es-ES');
  const items = sale.items || [];
  const subtotal = sale.subtotal || items.reduce(
    (sum, item) => sum + (item.line_total || item.quantity * item.unit_price),
    0
  );
  const total = sale.total || subtotal;

  const itemsHTML = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product?.name || 'Producto'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unit_price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.unit_price).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Venta</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .receipt {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }
        .company-name {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        .receipt-details {
          margin-bottom: 20px;
          font-size: 12px;
          color: #666;
        }
        .customer-info {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #2980b9;
        }
        .customer-info h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 14px;
        }
        .customer-info p {
          margin: 5px 0;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f0f0f0;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #333;
          font-size: 12px;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
          font-size: 12px;
        }
        .totals {
          margin-bottom: 20px;
          text-align: right;
        }
        .totals-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 5px;
          font-size: 12px;
        }
        .total-label {
          width: 150px;
          text-align: right;
        }
        .total-value {
          width: 80px;
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          color: #2980b9;
          border-top: 2px solid #333;
          padding-top: 10px;
          margin-top: 10px;
        }
        .warranty-info {
          padding: 10px;
          background-color: #e8f4f8;
          border-left: 4px solid #3498db;
          margin-bottom: 20px;
          font-size: 12px;
          color: #2c3e50;
        }
        .footer {
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          font-size: 11px;
          color: #666;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .receipt {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>RECIBO DE VENTA</h1>
          <p class="company-name">${company.name}</p>
          ${company.ruc ? `<p class="company-name">RUC: ${company.ruc}</p>` : ''}
        </div>

        <div class="receipt-details">
          <p><strong>Fecha:</strong> ${saleDate}</p>
          <p><strong>ID Venta:</strong> ${sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div class="customer-info">
          <h3>Información del Cliente</h3>
          <p><strong>${sale.customer_name}</strong></p>
          ${sale.customer_email ? `<p>Email: ${sale.customer_email}</p>` : ''}
          ${sale.customer_phone ? `<p>Teléfono: ${sale.customer_phone}</p>` : ''}
          ${sale.customer_address ? `<p>Dirección: ${sale.customer_address}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: right;">Cantidad</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">$${subtotal.toFixed(2)}</span>
          </div>
          <div class="grand-total totals-row">
            <span class="total-label">TOTAL:</span>
            <span class="total-value">$${total.toFixed(2)}</span>
          </div>
        </div>

        ${
          sale.warranty_months && sale.warranty_months > 0
            ? `
          <div class="warranty-info">
            <strong>Garantía:</strong> ${sale.warranty_months} meses hasta ${new Date(sale.warranty_expiry || Date.now()).toLocaleDateString('es-ES')}
          </div>
        `
            : ''
        }

        <div class="footer">
          <p>Gracias por su compra</p>
          <p>Thank you for your purchase</p>
          <p style="margin-top: 10px; font-size: 10px; color: #999;">Generado por Stockly - ${new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a simple HTML string for invoice printing
 */
export const generateInvoiceHTML = (invoice: Invoice, company: CompanyInfo): string => {
  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString('es-ES');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .invoice {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 3px solid #2980b9;
          padding-bottom: 20px;
        }
        .header-left h1 {
          margin: 0;
          font-size: 32px;
          color: #2980b9;
        }
        .header-right {
          text-align: right;
          font-size: 13px;
        }
        .header-right p {
          margin: 5px 0;
        }
        .invoice-number {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        .company-info {
          margin-bottom: 30px;
        }
        .company-info h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 12px;
        }
        .company-info p {
          margin: 3px 0;
          font-size: 11px;
          color: #666;
        }
        .customer-section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #2980b9;
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
        }
        .amount {
          text-align: right;
        }
        .totals {
          margin-bottom: 30px;
          text-align: right;
        }
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
          font-size: 12px;
        }
        .total-label {
          width: 200px;
          text-align: right;
          padding-right: 20px;
        }
        .total-value {
          width: 100px;
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          font-size: 16px;
          color: #2980b9;
          border-top: 2px solid #2980b9;
          border-bottom: 2px solid #2980b9;
          padding-top: 10px;
          padding-bottom: 10px;
          margin-top: 10px;
        }
        .notes {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #2980b9;
          font-size: 11px;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .invoice {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="header-left">
            <h1>FACTURA</h1>
          </div>
          <div class="header-right">
            <div class="invoice-number">#${invoice.invoice_number}</div>
            <p><strong>Fecha:</strong> ${invoiceDate}</p>
            <p><strong>Estado:</strong> <span style="color: ${invoice.payment_status === 'paid' ? '#27ae60' : '#e74c3c'}">${invoice.payment_status.toUpperCase()}</span></p>
          </div>
        </div>

        <div class="company-info">
          <h3>EMPRESA</h3>
          <p><strong>${company.name}</strong></p>
          ${company.ruc ? `<p>RUC: ${company.ruc}</p>` : ''}
          ${company.address ? `<p>${company.address}</p>` : ''}
          ${company.phone ? `<p>Tel: ${company.phone}</p>` : ''}
          ${company.email ? `<p>Email: ${company.email}</p>` : ''}
        </div>

        <div class="customer-section">
          <div class="section-title">CLIENTE</div>
          <p><strong>${invoice.customer_name}</strong></p>
          ${invoice.customer_email ? `<p>Email: ${invoice.customer_email}</p>` : ''}
          ${invoice.customer_phone ? `<p>Teléfono: ${invoice.customer_phone}</p>` : ''}
          ${invoice.customer_address ? `<p>Dirección: ${invoice.customer_address}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="amount">Cantidad</th>
              <th class="amount">Precio Unit.</th>
              <th class="amount">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Productos y Servicios</td>
              <td class="amount">1</td>
              <td class="amount">$${invoice.subtotal.toFixed(2)}</td>
              <td class="amount">$${invoice.subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">$${invoice.subtotal.toFixed(2)}</span>
          </div>
          ${invoice.tax && invoice.tax > 0 ? `
          <div class="total-row">
            <span class="total-label">Impuestos (12%):</span>
            <span class="total-value">$${invoice.tax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="grand-total total-row">
            <span class="total-label">TOTAL A PAGAR:</span>
            <span class="total-value">$${invoice.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div class="notes">
          <p><strong>Términos de Pago:</strong> Pago ${invoice.payment_status === 'paid' ? 'Realizado' : 'Pendiente'}</p>
          <p style="margin-top: 10px; margin-bottom: 0;">Gracias por su negocio - Thank you for your business</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print HTML content
 */
export const printHTML = (htmlContent: string, title: string = 'Document') => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

/**
 * Download HTML as PDF using browser print to PDF feature
 */
export const downloadHTMLAsPDF = (htmlContent: string, filename: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.title = filename;
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
