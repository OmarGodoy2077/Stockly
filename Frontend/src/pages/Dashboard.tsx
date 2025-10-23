import { useEffect, useState } from 'react';
import { getDashboardReport } from '../services/reportService';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardData {
    sales: {
        today: number;
        week: number;
        month: number;
    };
    products: {
        total: number;
        lowStock: number;
    };
    warranties: {
        active: number;
        expiringSoon: number;
    };
    services: {
        pending: number;
        inRepair: number;
    };
}

const Dashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const report = await getDashboardReport();
                setData(report);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Error al cargar el dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, []);

    if (loading) return <div className="p-4">Cargando dashboard...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;
    if (!data) return <div className="p-4">No hay datos disponibles.</div>;

    const salesChartData = {
        labels: ['Hoy', 'Esta Semana', 'Este Mes'],
        datasets: [
            {
                label: 'Ventas ($)',
                data: [data.sales.today, data.sales.week, data.sales.month],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
        ],
    };

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
            
            {/* KPI Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {/* Ventas de Hoy */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">Ventas de Hoy</h3>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">${data.sales.today.toFixed(2)}</p>
                        </div>
                        <div className="text-3xl md:text-4xl">💰</div>
                    </div>
                </div>

                {/* Productos Totales */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">Productos Totales</h3>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.products.total}</p>
                        </div>
                        <div className="text-3xl md:text-4xl">📦</div>
                    </div>
                    {data.products.lowStock > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                            {data.products.lowStock} productos con stock bajo
                        </div>
                    )}
                </div>

                {/* Garantías Activas */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">Garantías Activas</h3>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.warranties.active}</p>
                        </div>
                        <div className="text-3xl md:text-4xl">🛡️</div>
                    </div>
                    {data.warranties.expiringSoon > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                            {data.warranties.expiringSoon} próximas a vencer
                        </div>
                    )}
                </div>

                {/* Servicios Pendientes */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">Servicios Pendientes</h3>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.services.pending}</p>
                        </div>
                        <div className="text-3xl md:text-4xl">🔧</div>
                    </div>
                    {data.services.inRepair > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                            {data.services.inRepair} en reparación
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Sales Chart */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Resumen de Ventas</h3>
                    <div className="h-64 md:h-80">
                        <Bar 
                            data={salesChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">Estadísticas Rápidas</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-600">Ventas Semanales</span>
                            <span className="text-lg font-bold text-green-600">${data.sales.week.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-600">Ventas Mensuales</span>
                            <span className="text-lg font-bold text-blue-600">${data.sales.month.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-600">Productos con Stock Bajo</span>
                            <span className="text-lg font-bold text-red-600">{data.products.lowStock}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium text-gray-600">Servicios en Reparación</span>
                            <span className="text-lg font-bold text-orange-600">{data.services.inRepair}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
