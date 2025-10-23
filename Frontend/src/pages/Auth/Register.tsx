import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { register, joinCompany } from '../../services/authService';
import { loginSuccess } from '../../store/authSlice';

const createCompanySchema = z.object({
  userName: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder los 50 caracteres'),
  email: z.string()
    .email('Email inválido')
    .toLowerCase(),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(72, 'La contraseña no puede exceder los 72 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{6,}$/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  confirmPassword: z.string(),
  companyName: z.string()
    .min(3, 'El nombre de la empresa debe tener al menos 3 caracteres')
    .max(100, 'El nombre de la empresa no puede exceder los 100 caracteres'),
  companyRuc: z.string()
    .regex(/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos numéricos'),
  phone: z.string()
    .regex(/^\+?[\d\s-]{9,}$/, 'Ingrese un número de teléfono válido')
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const joinCompanySchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase(),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(72, 'La contraseña no puede exceder los 72 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{6,}$/, 
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  confirmPassword: z.string(),
  invitationCode: z.string()
    .length(8, 'El código de invitación debe tener 8 caracteres')
    .regex(/^[A-Z0-9]{8}$/, 'El código de invitación solo puede contener letras mayúsculas y números'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type CreateCompanySchema = z.infer<typeof createCompanySchema>;
type JoinCompanySchema = z.infer<typeof joinCompanySchema>;

const Register = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register: registerCreateForm,
        handleSubmit: handleSubmitCreate,
        formState: { errors: createErrors },
    } = useForm<CreateCompanySchema>({
        resolver: zodResolver(createCompanySchema),
        mode: 'onBlur',
    });

    const {
        register: registerJoinForm,
        handleSubmit: handleSubmitJoin,
        formState: { errors: joinErrors },
    } = useForm<JoinCompanySchema>({
        resolver: zodResolver(joinCompanySchema),
        mode: 'onBlur',
    });

    const handleCreateSubmit = async (data: CreateCompanySchema) => {
        setIsLoading(true);
        try {
            const response = await register({
                name: data.userName,
                email: data.email,
                password: data.password,
                phone: data.phone,
            });

            dispatch(loginSuccess({
                accessToken: response.token,
                refreshToken: response.refreshToken,
                user: {
                    ...response.user,
                    companies: response.user.companies || [],
                },
            }));

            toast.success('¡Registro exitoso! Bienvenido.');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar la empresa');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinSubmit = async (data: JoinCompanySchema) => {
        setIsLoading(true);
        try {
            const response = await joinCompany(data.invitationCode);
            
            dispatch(loginSuccess({
                accessToken: response.token,
                refreshToken: response.refreshToken,
                user: {
                    ...response.user,
                    is_active: true,
                    created_at: new Date().toISOString(),
                },
            }));

            toast.success('¡Te has unido a la empresa exitosamente!');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Error al unirse a la empresa');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm";

    return (
        <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">Crea tu cuenta</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
                O{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    inicia sesión si ya tienes una
                </Link>
            </p>
            <div className="mt-6">
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('create')} className={`w-1/2 py-4 text-center font-medium text-sm ${activeTab === 'create' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Crear Empresa
                    </button>
                    <button onClick={() => setActiveTab('join')} className={`w-1/2 py-4 text-center font-medium text-sm ${activeTab === 'join' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Unirse con Código
                    </button>
                </div>
            </div>

            {activeTab === 'create' && (
                <form className="mt-8 space-y-6" onSubmit={handleSubmitCreate(handleCreateSubmit)}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                {...registerCreateForm('userName')}
                                id="userName"
                                type="text"
                                className={`${inputClass} rounded-t-md ${createErrors.userName ? 'border-red-300' : ''}`}
                                placeholder="Tu nombre"
                            />
                            {createErrors.userName && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.userName.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('email')}
                                id="email"
                                type="email"
                                className={`${inputClass} ${createErrors.email ? 'border-red-300' : ''}`}
                                placeholder="Tu correo electrónico"
                            />
                            {createErrors.email && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.email.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('password')}
                                id="password"
                                type="password"
                                className={`${inputClass} ${createErrors.password ? 'border-red-300' : ''}`}
                                placeholder="Contraseña"
                            />
                            {createErrors.password && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.password.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('confirmPassword')}
                                id="confirmPassword"
                                type="password"
                                className={`${inputClass} ${createErrors.confirmPassword ? 'border-red-300' : ''}`}
                                placeholder="Confirmar contraseña"
                            />
                            {createErrors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.confirmPassword.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('companyName')}
                                id="companyName"
                                type="text"
                                className={`${inputClass} ${createErrors.companyName ? 'border-red-300' : ''}`}
                                placeholder="Nombre de la empresa"
                            />
                            {createErrors.companyName && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.companyName.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('companyRuc')}
                                id="companyRuc"
                                type="text"
                                className={`${inputClass} ${createErrors.companyRuc ? 'border-red-300' : ''}`}
                                placeholder="RUC de la empresa"
                            />
                            {createErrors.companyRuc && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.companyRuc.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerCreateForm('phone')}
                                id="phone"
                                type="tel"
                                className={`${inputClass} rounded-b-md ${createErrors.phone ? 'border-red-300' : ''}`}
                                placeholder="Teléfono (opcional)"
                            />
                            {createErrors.phone && (
                                <p className="text-red-500 text-xs mt-1">{createErrors.phone.message}</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            </span>
                        ) : null}
                        {isLoading ? 'Registrando...' : 'Crear Empresa'}
                    </button>
                </form>
            )}

            {activeTab === 'join' && (
                <form className="mt-8 space-y-6" onSubmit={handleSubmitJoin(handleJoinSubmit)}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                {...registerJoinForm('email')}
                                id="join-email"
                                type="email"
                                className={`${inputClass} rounded-t-md ${joinErrors.email ? 'border-red-300' : ''}`}
                                placeholder="Tu correo electrónico"
                            />
                            {joinErrors.email && (
                                <p className="text-red-500 text-xs mt-1">{joinErrors.email.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerJoinForm('password')}
                                id="join-password"
                                type="password"
                                className={`${inputClass} ${joinErrors.password ? 'border-red-300' : ''}`}
                                placeholder="Contraseña"
                            />
                            {joinErrors.password && (
                                <p className="text-red-500 text-xs mt-1">{joinErrors.password.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerJoinForm('confirmPassword')}
                                id="join-confirm-password"
                                type="password"
                                className={`${inputClass} ${joinErrors.confirmPassword ? 'border-red-300' : ''}`}
                                placeholder="Confirmar contraseña"
                            />
                            {joinErrors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">{joinErrors.confirmPassword.message}</p>
                            )}
                        </div>
                        <div>
                            <input
                                {...registerJoinForm('invitationCode')}
                                id="invitationCode"
                                type="text"
                                className={`${inputClass} rounded-b-md ${joinErrors.invitationCode ? 'border-red-300' : ''}`}
                                placeholder="Código de invitación"
                            />
                            {joinErrors.invitationCode && (
                                <p className="text-red-500 text-xs mt-1">{joinErrors.invitationCode.message}</p>
                            )}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            </span>
                        ) : null}
                        {isLoading ? 'Uniéndose...' : 'Unirse a la Empresa'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Register;
