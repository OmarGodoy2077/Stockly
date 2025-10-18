import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Report service - Handles Excel, PDF, and CSV report generation
 */
class ReportService {

    /**
     * Generate Excel report from data
     * @param {Array} data - Data to include in report
     * @param {Object} options - Report options
     * @returns {Buffer} Excel file buffer
     */
    static async generateExcel(data, options = {}) {
        try {
            const {
                title = 'Reporte',
                sheetName = 'Datos',
                columns = [],
                includeTimestamp = true,
                companyName = ''
            } = options;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(sheetName);

            // Add title
            if (title) {
                worksheet.mergeCells('A1:F1');
                const titleRow = worksheet.getCell('A1');
                titleRow.value = title;
                titleRow.font = { size: 16, bold: true };
                titleRow.alignment = { horizontal: 'center' };
            }

            // Add company name
            if (companyName) {
                worksheet.mergeCells('A2:F2');
                const companyRow = worksheet.getCell('A2');
                companyRow.value = `Empresa: ${companyName}`;
                companyRow.font = { size: 12 };
                companyRow.alignment = { horizontal: 'center' };
            }

            // Add timestamp
            if (includeTimestamp) {
                worksheet.mergeCells('A3:F3');
                const timestampRow = worksheet.getCell('A3');
                timestampRow.value = `Generado el: ${new Date().toLocaleString('es-GT')}`;
                timestampRow.font = { size: 10, italic: true };
                timestampRow.alignment = { horizontal: 'center' };
            }

            // Calculate starting row for data
            const dataStartRow = title || companyName || includeTimestamp ? 5 : 1;

            // Add headers if columns are specified
            if (columns.length > 0) {
                const headerRow = worksheet.getRow(dataStartRow);
                columns.forEach((col, index) => {
                    const cell = headerRow.getCell(index + 1);
                    cell.value = col.header;
                    cell.font = { bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE6E6FA' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }

            // Add data
            if (data.length > 0) {
                data.forEach((row, rowIndex) => {
                    const excelRow = worksheet.getRow(dataStartRow + rowIndex + (columns.length > 0 ? 1 : 0));

                    if (columns.length > 0) {
                        // Use column mapping
                        columns.forEach((col, colIndex) => {
                            const cell = excelRow.getCell(colIndex + 1);
                            let value = row[col.key];

                            // Format value based on type
                            if (col.type === 'currency' && value !== null) {
                                value = `Q${parseFloat(value).toFixed(2)}`;
                            } else if (col.type === 'date' && value !== null) {
                                value = new Date(value).toLocaleDateString('es-GT');
                            } else if (col.type === 'number' && value !== null) {
                                value = parseFloat(value).toLocaleString('es-GT');
                            }

                            cell.value = value;
                        });
                    } else {
                        // Use row data directly
                        Object.values(row).forEach((value, colIndex) => {
                            const cell = excelRow.getCell(colIndex + 1);
                            cell.value = value;
                        });
                    }
                });
            }

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                column.width = 15;
            });

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            logger.business('excel_report_generated', 'report', 'system', {
                title,
                rowCount: data.length,
                columnCount: columns.length || Object.keys(data[0] || {}).length
            });

            return buffer;

        } catch (error) {
            logger.error('Error generating Excel report:', error);
            throw new Error(`Failed to generate Excel report: ${error.message}`);
        }
    }

    /**
     * Generate PDF report from data
     * @param {Array} data - Data to include in report
     * @param {Object} options - Report options
     * @returns {Buffer} PDF file buffer
     */
    static async generatePDF(data, options = {}) {
        try {
            const {
                title = 'Reporte',
                columns = [],
                includeTimestamp = true,
                companyName = '',
                orientation = 'landscape'
            } = options;

            const doc = new jsPDF({
                orientation,
                unit: 'mm',
                format: 'a4'
            });

            let yPosition = 20;

            // Add title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 20, yPosition);
            yPosition += 10;

            // Add company name
            if (companyName) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`Empresa: ${companyName}`, 20, yPosition);
                yPosition += 7;
            }

            // Add timestamp
            if (includeTimestamp) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text(`Generado el: ${new Date().toLocaleString('es-GT')}`, 20, yPosition);
                yPosition += 10;
            }

            // Prepare table data
            const headers = columns.map(col => col.header);
            const tableData = data.map(row => {
                return columns.map(col => {
                    let value = row[col.key];

                    // Format value based on type
                    if (col.type === 'currency' && value !== null) {
                        return `Q${parseFloat(value).toFixed(2)}`;
                    } else if (col.type === 'date' && value !== null) {
                        return new Date(value).toLocaleDateString('es-GT');
                    } else if (col.type === 'number' && value !== null) {
                        return parseFloat(value).toLocaleString('es-GT');
                    }

                    return value || '';
                });
            });

            // Add table
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: yPosition,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [230, 230, 250],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { top: yPosition }
            });

            logger.business('pdf_report_generated', 'report', 'system', {
                title,
                rowCount: data.length,
                columnCount: columns.length
            });

            return Buffer.from(doc.output('arraybuffer'));

        } catch (error) {
            logger.error('Error generating PDF report:', error);
            throw new Error(`Failed to generate PDF report: ${error.message}`);
        }
    }

    /**
     * Generate CSV report from data
     * @param {Array} data - Data to include in report
     * @param {Object} options - Report options
     * @returns {Buffer} CSV file buffer
     */
    static generateCSV(data, options = {}) {
        try {
            const {
                title = 'Reporte',
                columns = [],
                includeTimestamp = true,
                companyName = '',
                delimiter = ','
            } = options;

            let csvContent = '';

            // Add BOM for UTF-8
            csvContent += '\uFEFF';

            // Add title
            if (title) {
                csvContent += `"${title}"\n`;
            }

            // Add company name
            if (companyName) {
                csvContent += `"Empresa: ${companyName}"\n`;
            }

            // Add timestamp
            if (includeTimestamp) {
                csvContent += `"Generado el: ${new Date().toLocaleString('es-GT')}"\n`;
            }

            // Add empty line
            csvContent += '\n';

            // Add headers if columns are specified
            if (columns.length > 0) {
                const headers = columns.map(col => `"${col.header}"`);
                csvContent += headers.join(delimiter) + '\n';
            } else if (data.length > 0) {
                // Use object keys as headers
                const headers = Object.keys(data[0]).map(key => `"${key}"`);
                csvContent += headers.join(delimiter) + '\n';
            }

            // Add data
            if (data.length > 0) {
                data.forEach(row => {
                    let rowData;

                    if (columns.length > 0) {
                        // Use column mapping
                        rowData = columns.map(col => {
                            let value = row[col.key];

                            // Format value based on type
                            if (col.type === 'currency' && value !== null) {
                                value = `Q${parseFloat(value).toFixed(2)}`;
                            } else if (col.type === 'date' && value !== null) {
                                value = new Date(value).toLocaleDateString('es-GT');
                            } else if (col.type === 'number' && value !== null) {
                                value = parseFloat(value).toLocaleString('es-GT');
                            }

                            return `"${value || ''}"`;
                        });
                    } else {
                        // Use row data directly
                        rowData = Object.values(row).map(value => `"${value || ''}"`);
                    }

                    csvContent += rowData.join(delimiter) + '\n';
                });
            }

            logger.business('csv_report_generated', 'report', 'system', {
                title,
                rowCount: data.length,
                columnCount: columns.length || Object.keys(data[0] || {}).length
            });

            return Buffer.from(csvContent, 'utf8');

        } catch (error) {
            logger.error('Error generating CSV report:', error);
            throw new Error(`Failed to generate CSV report: ${error.message}`);
        }
    }

    /**
     * Generate sales report
     * @param {Array} sales - Sales data
     * @param {Object} options - Report options
     * @returns {Buffer} Report file buffer
     */
    static async generateSalesReport(sales, options = {}) {
        const columns = [
            { key: 'id', header: 'ID Venta', type: 'string' },
            { key: 'sale_date', header: 'Fecha', type: 'date' },
            { key: 'customer_name', header: 'Cliente', type: 'string' },
            { key: 'customer_email', header: 'Email', type: 'string' },
            { key: 'total_amount', header: 'Total', type: 'currency' },
            { key: 'serial_number', header: 'Número de Serie', type: 'string' },
            { key: 'warranty_months', header: 'Garantía (meses)', type: 'number' }
        ];

        const reportOptions = {
            title: 'Reporte de Ventas',
            sheetName: 'Ventas',
            columns,
            ...options
        };

        return await this.generateExcel(sales, reportOptions);
    }

    /**
     * Generate inventory report
     * @param {Array} products - Products data
     * @param {Object} options - Report options
     * @returns {Buffer} Report file buffer
     */
    static async generateInventoryReport(products, options = {}) {
        const columns = [
            { key: 'sku', header: 'SKU', type: 'string' },
            { key: 'name', header: 'Producto', type: 'string' },
            { key: 'category_name', header: 'Categoría', type: 'string' },
            { key: 'stock', header: 'Stock', type: 'number' },
            { key: 'min_stock', header: 'Stock Mínimo', type: 'number' },
            { key: 'price', header: 'Precio', type: 'currency' },
            { key: 'stock_status', header: 'Estado', type: 'string' }
        ];

        const reportOptions = {
            title: 'Reporte de Inventario',
            sheetName: 'Inventario',
            columns,
            ...options
        };

        return await this.generateExcel(products, reportOptions);
    }

    /**
     * Generate warranty report
     * @param {Array} warranties - Warranties data
     * @param {Object} options - Report options
     * @returns {Buffer} Report file buffer
     */
    static async generateWarrantyReport(warranties, options = {}) {
        const columns = [
            { key: 'serial_number', header: 'Número de Serie', type: 'string' },
            { key: 'product_name', header: 'Producto', type: 'string' },
            { key: 'customer_name', header: 'Cliente', type: 'string' },
            { key: 'customer_email', header: 'Email', type: 'string' },
            { key: 'start_date', header: 'Fecha Inicio', type: 'date' },
            { key: 'expires_at', header: 'Fecha Vencimiento', type: 'date' },
            { key: 'warranty_months', header: 'Meses Garantía', type: 'number' },
            { key: 'is_active', header: 'Activa', type: 'string' }
        ];

        const reportOptions = {
            title: 'Reporte de Garantías',
            sheetName: 'Garantías',
            columns,
            ...options
        };

        return await this.generateExcel(warranties, reportOptions);
    }

    /**
     * Generate service history report
     * @param {Array} services - Service history data
     * @param {Object} options - Report options
     * @returns {Buffer} Report file buffer
     */
    static async generateServiceReport(services, options = {}) {
        const columns = [
            { key: 'serial_number', header: 'Número de Serie', type: 'string' },
            { key: 'product_name', header: 'Producto', type: 'string' },
            { key: 'customer_name', header: 'Cliente', type: 'string' },
            { key: 'entry_date', header: 'Fecha Ingreso', type: 'date' },
            { key: 'status', header: 'Estado', type: 'string' },
            { key: 'reason', header: 'Motivo', type: 'string' },
            { key: 'actual_cost', header: 'Costo', type: 'currency' }
        ];

        const reportOptions = {
            title: 'Reporte de Servicio Técnico',
            sheetName: 'Servicio Técnico',
            columns,
            ...options
        };

        return await this.generateExcel(services, reportOptions);
    }

    /**
     * Get report format from file extension
     * @param {string} fileName - File name with extension
     * @returns {string} Report format (excel, pdf, csv)
     */
    static getReportFormat(fileName) {
        const ext = fileName.toLowerCase().split('.').pop();

        switch (ext) {
            case 'xlsx':
            case 'xls':
                return 'excel';
            case 'pdf':
                return 'pdf';
            case 'csv':
                return 'csv';
            default:
                return 'excel';
        }
    }

    /**
     * Generate comprehensive dashboard statistics
     * @param {Object} stats - Dashboard statistics data
     * @returns {Object} Formatted statistics for report
     */
    static formatDashboardStats(stats) {
        return [
            { Metric: 'Total Productos', Value: stats.totalProducts || 0 },
            { Metric: 'Productos Agotados', Value: stats.outOfStock || 0 },
            { Metric: 'Stock Bajo', Value: stats.lowStock || 0 },
            { Metric: 'Productos Disponibles', Value: stats.available || 0 },
            { Metric: 'Valor Total Inventario', Value: `Q${(stats.totalStockValue || 0).toFixed(2)}` },
            { Metric: 'Precio Promedio', Value: `Q${(stats.averagePrice || 0).toFixed(2)}` },
            { Metric: 'Ventas del Mes', Value: stats.monthlySales || 0 },
            { Metric: 'Ingresos del Mes', Value: `Q${(stats.monthlyRevenue || 0).toFixed(2)}` }
        ];
    }
}

export default ReportService;