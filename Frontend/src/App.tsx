import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useState } from 'react'
import './App.css'

// Layouts
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import GuestLayout from './layouts/GuestLayout'
import type { RootState } from './store'
import { loginSuccess } from './store/authSlice'
import * as authService from './services/authService'

// Auth Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Main Pages
import Dashboard from './pages/Dashboard'
import ProductList from './pages/Inventory/ProductList'
import ProductDetail from './pages/Inventory/ProductDetail'
import ProductAdd from './pages/Inventory/ProductAdd'
import NewSale from './pages/Sales/NewSale'
import PurchaseList from './pages/Purchases/PurchaseList'
import InvoiceList from './pages/Invoices/InvoiceList'
import CreateInvoice from './pages/Invoices/CreateInvoice'
import NewPurchase from './pages/Purchases/NewPurchase'
import ServiceBoard from './pages/Services/ServiceBoard'
import CompanySettings from './pages/Settings/CompanySettings'
import SupplierList from './pages/Suppliers/SupplierList'
import UserList from './pages/Users/UserList'
import WarrantyList from './pages/Warranties/WarrantyList'
import InvitationList from './pages/Invitations/InvitationList'

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getStoredToken();
        const refreshToken = authService.getStoredRefreshToken();
        
        if (token && refreshToken) {
          // Tokens exist, user is potentially logged in
          // The dashboard will load the actual user data if needed
          if (!authService.isTokenExpired()) {
            // Token is still valid, mark as authenticated
            // User data will be fetched when needed
            dispatch(loginSuccess({
              accessToken: token,
              refreshToken: refreshToken,
              user: {
                id: '',
                email: '',
                name: '',
                phone: '',
                companies: []
              }
            }));
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  if (isInitializing) {
    return <div className="flex items-center justify-center min-h-screen">Inicializando...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Guest Routes */}
        <Route element={<GuestLayout />}>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
          />
        </Route>

        {/* Protected Routes */}
        <Route element={<AuthenticatedLayout />}>
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route path="/inventory">
            <Route index element={<ProductList />} />
            <Route path="new" element={<ProductAdd />} />
            <Route path=":id" element={<ProductDetail />} />
          </Route>
          <Route path="/sales">
            <Route index element={<NewSale />} />
          </Route>
          <Route path="/purchases">
            <Route index element={<PurchaseList />} />
            <Route path="new" element={<NewPurchase />} />
            <Route path="edit/:id" element={<NewPurchase />} />
          </Route>
          <Route path="/invoices">
            <Route index element={<InvoiceList />} />
            <Route path="new" element={<CreateInvoice />} />
          </Route>
          <Route path="/services" element={<ServiceBoard />} />
          <Route path="/settings" element={<CompanySettings />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/warranties" element={<WarrantyList />} />
          <Route path="/invitations" element={<InvitationList />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App
