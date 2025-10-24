import React, { useState } from 'react';
import { Menu, Moon, Sun, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    dispatch(logout());
    navigate('/login');
  };

  const handleThemeToggle = () => {
    console.log('Theme toggle - current:', theme);
    toggleTheme();
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    window.location.href = '/settings/company';
  };

  return (
    <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30 shadow-md transition-colors duration-200">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Header: Left side */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Hamburger button */}
            <button
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white lg:hidden transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle menu"
            >
              <span className="sr-only">Open sidebar</span>
              <Menu size={24} />
            </button>

            {/* Logo on mobile */}
            <div className="lg:hidden flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            </div>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 ml-auto flex-shrink-0">
            {/* Notifications */}
            <button 
              className="relative text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 flex-shrink-0"
              title="Notificaciones"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 flex-shrink-0"
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
              aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            >
              {theme === 'light' ? <Moon size={20} className="text-blue-600" /> : <Sun size={20} className="text-yellow-400" />}
            </button>

            {/* User menu */}
            <div className="relative ml-2 md:ml-4 flex-shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-300 dark:hover:border-gray-600 min-w-0"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0 shadow-md">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline text-xs md:text-sm font-medium truncate max-w-[80px] sm:max-w-[100px] md:max-w-none">
                  {user?.name || 'Usuario'}
                </span>
                <ChevronDown size={16} className={`hidden md:inline transition-transform flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-slideDown">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
                    <p className="text-sm font-bold text-white">{user?.name}</p>
                    <p className="text-xs text-blue-100 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all font-medium"
                    >
                      <User size={18} />
                      <span>Mi Perfil</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-medium mt-1"
                    >
                      <LogOut size={18} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
