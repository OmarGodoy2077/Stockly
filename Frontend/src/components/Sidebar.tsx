import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
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
  LogOut,
  X,
} from 'lucide-react';
import { logout } from '../store/authSlice';
import { useTheme } from '../context/ThemeContext';
import type { RootState } from '../store';
import * as authService from '../services/authService';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  section?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme: _ } = useTheme();

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { path: '/inventory', label: 'Inventario', icon: Package },
        { path: '/sales', label: 'Ventas', icon: TrendingUp },
        { path: '/purchases', label: 'Compras', icon: ShoppingCart },
        { path: '/suppliers', label: 'Proveedores', icon: Truck },
        { path: '/invoices', label: 'Recibos', icon: FileText },
      ],
    },
    {
      title: 'Administración',
      items: [
        { path: '/services', label: 'Servicios', icon: Wrench },
        { path: '/warranties', label: 'Garantías', icon: Shield },
        { path: '/users', label: 'Usuarios', icon: Users },
        { path: '/invitations', label: 'Invitaciones', icon: Mail },
        { path: '/settings', label: 'Configuración', icon: Settings },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      ref={sidebar}
      className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg duration-300 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* SIDEBAR HEADER */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 sm:py-5.5 lg:py-6.5 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Stockly</h1>
        </Link>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      {/* SIDEBAR MENU */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        <nav className="py-4 px-2 sm:px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 px-2 sm:px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`group relative flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${
                          active
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && (
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* USER & LOGOUT */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
        {user && (
          <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg group text-sm"
        >
          <LogOut size={20} className="flex-shrink-0 group-hover:rotate-6 transition-transform" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
