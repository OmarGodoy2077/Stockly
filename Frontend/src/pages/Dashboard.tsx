import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardReport } from '../services/reportService';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  FileText,
  Wrench,
  Shield,
  Users,
  Mail,
  Settings,
  ArrowRight,
} from 'lucide-react';

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

interface NavCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllCards, setShowAllCards] = useState(false);

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

    const navCards: NavCard[] = [
        {
          title: 'Inventario',
          description: 'Gestiona tu inventario de productos',
          icon: Package,
          path: '/inventory',
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          title: 'Ventas',
          description: 'Registra y monitorea tus ventas',
          icon: TrendingUp,
          path: '/sales',
          color: 'from-green-500 to-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
          title: 'Compras',
          description: 'Gestiona compras a proveedores',
          icon: ShoppingCart,
          path: '/purchases',
          color: 'from-purple-500 to-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
          title: 'Proveedores',
          description: 'Administra tus proveedores',
          icon: Truck,
          path: '/suppliers',
          color: 'from-orange-500 to-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        },
        {
          title: 'Recibos',
          description: 'Genera y visualiza recibos',
          icon: FileText,
          path: '/invoices',
          color: 'from-yellow-500 to-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
          title: 'Servicios',
          description: 'Gestiona servicios técnicos',
          icon: Wrench,
          path: '/services',
          color: 'from-indigo-500 to-indigo-600',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
          title: 'Garantías',
          description: 'Control de garantías',
          icon: Shield,
          path: '/warranties',
          color: 'from-red-500 to-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
        {
          title: 'Usuarios',
          description: 'Gestiona usuarios del sistema',
          icon: Users,
          path: '/users',
          color: 'from-cyan-500 to-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
        {
          title: 'Invitaciones',
          description: 'Invita a nuevos usuarios',
          icon: Mail,
          path: '/invitations',
          color: 'from-pink-500 to-pink-600',
          bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        },
        {
          title: 'Configuración',
          description: 'Ajusta los parámetros del sistema',
          icon: Settings,
          path: '/settings',
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        },
      ];

    const displayedCards = showAllCards ? navCards : navCards.slice(0, 6);

    if (loading) return <div className="p-4">Cargando dashboard...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    const salesChartData = data ? {
        labels: ['Hoy', 'Esta Semana', 'Este Mes'],
        datasets: [
            {
                label: 'Ventas ($)',
                data: [data.sales.today, data.sales.week, data.sales.month],
                backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0.4)'],
                borderColor: ['rgb(59, 130, 246)', 'rgb(59, 130, 246)', 'rgb(59, 130, 246)'],
                borderWidth: 1,
                borderRadius: 8,
            },
        ],
    } : null;

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="mb-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Bienvenido a tu panel de control</p>
            </div>

            {/* KPI Cards - Quick Stats */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    {/* Ventas de Hoy */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Ventas de Hoy</h3>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">${data.sales.today.toFixed(2)}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg ml-2 flex-shrink-0">
                                <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    {/* Productos Totales */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Productos</h3>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{data.products.total}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg ml-2 flex-shrink-0">
                                <Package size={24} className="text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        {data.products.lowStock > 0 && (
                            <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                ⚠️ {data.products.lowStock} con stock bajo
                            </div>
                        )}
                    </div>

                    {/* Garantías Activas */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Garantías</h3>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{data.warranties.active}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 rounded-lg ml-2 flex-shrink-0">
                                <Shield size={24} className="text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        {data.warranties.expiringSoon > 0 && (
                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                ⚠️ {data.warranties.expiringSoon} por vencer
                            </div>
                        )}
                    </div>

                    {/* Servicios Pendientes */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Servicios</h3>
                                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{data.services.pending}</p>
                            </div>
                            <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg ml-2 flex-shrink-0">
                                <Wrench size={24} className="text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        {data.services.inRepair > 0 && (
                            <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                                🔧 {data.services.inRepair} en reparación
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Cards */}
            <div className="space-y-6 md:space-y-8">
                <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">Módulos Principales</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {displayedCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <button
                                    key={card.path}
                                    onClick={() => navigate(card.path)}
                                    className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                >
                                    {/* Background gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} />

                                    {/* Content */}
                                    <div className="relative z-10">
                                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${card.color} mb-4 shadow-lg`}>
                                            <Icon size={28} className="text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors">{card.title}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-200">{card.description}</p>
                                        <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                                            <span className="text-sm">Ir</span>
                                            <ArrowRight size={16} className="ml-2" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {navCards.length > 6 && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => setShowAllCards(!showAllCards)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
                            >
                                {showAllCards ? 'Ver menos módulos' : 'Ver todos los módulos'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Section */}
            {salesChartData && (
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-6">Ventas por Período</h2>
                    <div className="overflow-x-auto">
                        <Bar 
                            data={salesChartData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: {
                                        labels: {
                                            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        ticks: {
                                            color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                                        },
                                        grid: {
                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                                        }
                                    },
                                    y: {
                                        ticks: {
                                            color: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                                        },
                                        grid: {
                                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                                        }
                                    }
                                }
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
