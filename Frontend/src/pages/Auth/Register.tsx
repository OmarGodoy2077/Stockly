import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { register } from '../../services/authService';
import { loginSuccess } from '../../store/authSlice';

const createCompanySchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
  phone: z.string().regex(/^\+?[\d\s\-()]{9,}$|^$/).optional().or(z.literal('')),
  companyName: z.string().min(3).max(100),
  companyRuc: z.string().regex(/^\d{11}$|^$/).optional().or(z.literal('')),
  companyPhone: z.string().regex(/^\+?[\d\s\-()]{9,}$|^$/).optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const joinCompanySchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
  phone: z.string().regex(/^\+?[\d\s\-()]{9,}$|^$/).optional().or(z.literal('')),
  invitationCode: z.string().length(12).regex(/^[A-Z0-9]{12}$/),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerForm,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreate,
  } = useForm({
    resolver: zodResolver(createCompanySchema),
    mode: 'onBlur',
  });

  const {
    register: joinForm,
    handleSubmit: handleSubmitJoin,
    formState: { errors: joinErrors },
    reset: resetJoin,
  } = useForm({
    resolver: zodResolver(joinCompanySchema),
    mode: 'onBlur',
  });

  const handleCreateSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        companyName: data.companyName,
        companyRuc: data.companyRuc || undefined,
        companyPhone: data.companyPhone || undefined,
      });

      dispatch(loginSuccess({
        accessToken: response.token,
        refreshToken: response.refreshToken,
        user: { ...response.user, companies: response.user.companies || [] },
      }));

      toast.success('¡Registro exitoso! Bienvenido a Stockly.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en registro:', error);
      toast.error(error.message || 'Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        invitationCode: data.invitationCode,
      });

      dispatch(loginSuccess({
        accessToken: response.token,
        refreshToken: response.refreshToken,
        user: { ...response.user, companies: response.user.companies || [] },
      }));

      toast.success('¡Te has unido a la empresa exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en unirse:', error);
      toast.error(error.message || 'Error al unirse a la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm';
  const errorClass = 'border-red-300 placeholder-red-300';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crea tu cuenta en Stockly
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">inicia sesión</Link>
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => { setActiveTab('create'); resetCreate(); }}
              className={activeTab === 'create' ? 'py-4 px-1 border-b-2 border-indigo-500 text-indigo-600 font-medium text-sm' : 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm'}
            >
              Crear Empresa
            </button>
            <button
              onClick={() => { setActiveTab('join'); resetJoin(); }}
              className={activeTab === 'join' ? 'py-4 px-1 border-b-2 border-indigo-500 text-indigo-600 font-medium text-sm' : 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm'}
            >
              Unirse con Código
            </button>
          </nav>
        </div>

        {activeTab === 'create' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmitCreate(handleCreateSubmit)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <input {...registerForm('name')} type="text" className={inputClass + ' rounded-t-md' + (createErrors.name ? ' ' + errorClass : '')} placeholder="Nombre completo" />
              {createErrors.name && <p className="text-red-500 text-xs mt-1">{createErrors.name.message}</p>}
              
              <input {...registerForm('email')} type="email" className={inputClass + (createErrors.email ? ' ' + errorClass : '')} placeholder="Email" />
              {createErrors.email && <p className="text-red-500 text-xs mt-1">{createErrors.email.message}</p>}
              
              <input {...registerForm('password')} type="password" className={inputClass + (createErrors.password ? ' ' + errorClass : '')} placeholder="Contraseña" />
              {createErrors.password && <p className="text-red-500 text-xs mt-1">{createErrors.password.message}</p>}
              
              <input {...registerForm('confirmPassword')} type="password" className={inputClass + (createErrors.confirmPassword ? ' ' + errorClass : '')} placeholder="Confirmar contraseña" />
              {createErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{createErrors.confirmPassword.message}</p>}
              
              <input {...registerForm('phone')} type="tel" className={inputClass + (createErrors.phone ? ' ' + errorClass : '')} placeholder="Teléfono (opcional)" />
              {createErrors.phone && <p className="text-red-500 text-xs mt-1">{createErrors.phone.message}</p>}
              
              <div className="my-4 px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700">Datos de la Empresa</div>
              
              <input {...registerForm('companyName')} type="text" className={inputClass + (createErrors.companyName ? ' ' + errorClass : '')} placeholder="Nombre de la empresa" />
              {createErrors.companyName && <p className="text-red-500 text-xs mt-1">{createErrors.companyName.message}</p>}
              
              <input {...registerForm('companyRuc')} type="text" maxLength={11} className={inputClass + (createErrors.companyRuc ? ' ' + errorClass : '')} placeholder="RUC (opcional)" />
              {createErrors.companyRuc && <p className="text-red-500 text-xs mt-1">{createErrors.companyRuc.message}</p>}
              
              <input {...registerForm('companyPhone')} type="tel" className={inputClass + ' rounded-b-md' + (createErrors.companyPhone ? ' ' + errorClass : '')} placeholder="Teléfono empresa (opcional)" />
              {createErrors.companyPhone && <p className="text-red-500 text-xs mt-1">{createErrors.companyPhone.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
              {isLoading ? 'Registrando...' : 'Crear Cuenta y Empresa'}
            </button>
          </form>
        )}

        {activeTab === 'join' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmitJoin(handleJoinSubmit)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <input {...joinForm('name')} type="text" className={inputClass + ' rounded-t-md' + (joinErrors.name ? ' ' + errorClass : '')} placeholder="Nombre completo" />
              {joinErrors.name && <p className="text-red-500 text-xs mt-1">{joinErrors.name.message}</p>}
              
              <input {...joinForm('email')} type="email" className={inputClass + (joinErrors.email ? ' ' + errorClass : '')} placeholder="Email" />
              {joinErrors.email && <p className="text-red-500 text-xs mt-1">{joinErrors.email.message}</p>}
              
              <input {...joinForm('password')} type="password" className={inputClass + (joinErrors.password ? ' ' + errorClass : '')} placeholder="Contraseña" />
              {joinErrors.password && <p className="text-red-500 text-xs mt-1">{joinErrors.password.message}</p>}
              
              <input {...joinForm('confirmPassword')} type="password" className={inputClass + (joinErrors.confirmPassword ? ' ' + errorClass : '')} placeholder="Confirmar contraseña" />
              {joinErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{joinErrors.confirmPassword.message}</p>}
              
              <input {...joinForm('phone')} type="tel" className={inputClass + (joinErrors.phone ? ' ' + errorClass : '')} placeholder="Teléfono (opcional)" />
              {joinErrors.phone && <p className="text-red-500 text-xs mt-1">{joinErrors.phone.message}</p>}
              
              <input {...joinForm('invitationCode')} type="text" maxLength={12} className={inputClass + ' rounded-b-md' + (joinErrors.invitationCode ? ' ' + errorClass : '')} placeholder="Código de invitación (12 caracteres)" />
              {joinErrors.invitationCode && <p className="text-red-500 text-xs mt-1">{joinErrors.invitationCode.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
              {isLoading ? 'Registrando...' : 'Crear Cuenta y Unirse'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">Necesitas un código de invitación válido para unirte.</p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
