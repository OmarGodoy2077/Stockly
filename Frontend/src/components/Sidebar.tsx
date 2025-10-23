import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiGrid,
  FiArchive,
  FiDollarSign,
  FiShoppingCart,
  FiTruck,
  FiFileText,
  FiTool,
  FiShield,
  FiUsers,
  FiMail,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';
import { logout } from '../store/authSlice';
import type { RootState } from '../store';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: FiGrid },
    { path: '/inventory', label: 'Inventario', icon: FiArchive },
    { path: '/sales', label: 'Ventas', icon: FiDollarSign },
    { path: '/purchases', label: 'Compras', icon: FiShoppingCart },
    { path: '/suppliers', label: 'Proveedores', icon: FiTruck },
    { path: '/invoices', label: 'Recibos', icon: FiFileText },
    { path: '/services', label: 'Servicios', icon: FiTool },
    { path: '/warranties', label: 'Garantías', icon: FiShield },
    { path: '/users', label: 'Usuarios', icon: FiUsers },
    { path: '/invitations', label: 'Invitaciones', icon: FiMail },
    { path: '/settings', label: 'Configuración', icon: FiSettings },
  ];

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-y-auto bg-gray-900 text-white duration-300 ease-linear lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* SIDEBAR HEADER */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <Link to="/">
          <h1 className="text-xl font-bold">Stockly</h1>
        </Link>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.5875 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>
      {/* SIDEBAR HEADER */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* Sidebar Menu */}
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
          {/* Menu Group */}
          <div>
            <h3 className="mb-4 ml-4 text-sm font-semibold text-gray-400">MENU</h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-gray-300 duration-300 ease-in-out hover:bg-gray-800 ${
                        isActive(item.path) && 'bg-gray-700'
                      }`}
                    >
                      <Icon className="text-lg" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        {/* Sidebar Menu */}
      </div>
       {/* User & Logout */}
       <div className="border-t border-gray-700 p-4 space-y-3">
          {isExpanded && user && (
            <div className="text-sm text-gray-400 truncate">
              <p className="font-semibold text-white truncate">{user.name}</p>
              <p className="truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white"
            title={!isExpanded ? 'Cerrar sesión' : ''}
          >
            <FiLogOut />
            {isExpanded && <span>Cerrar sesión</span>}
          </button>
        </div>
    </aside>
  );
};

export default Sidebar;
