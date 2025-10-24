import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const setupCompanySchema = z.object({
  companyName: z.string()
    .min(3, 'El nombre de la empresa debe tener al menos 3 caracteres')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  ruc: z.string()
    .regex(/^\d{11}$|^$/, 'El RUC debe tener 11 dígitos (opcional)')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^\+?[\d\s\-()]{9,}$|^$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .url('URL del sitio web inválida')
    .optional()
    .or(z.literal('')),
});

type SetupCompanySchema = z.infer<typeof setupCompanySchema>;

const SetupCompany = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const user = useSelector((state: any) => state.auth.user);
  
  // Si no hay usuario logueado, redirigir a login
  if (!user) {
    navigate('/login');
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupCompanySchema>({
    mode: 'onBlur',
  });

  const onSubmit = async (data: SetupCompanySchema) => {
    setIsLoading(true);
    try {
      // IMPORTANTE: Aquí iría la llamada a crear la empresa
      // const response = await createCompany({
      //   name: data.companyName,
      //   ruc: data.ruc || undefined,
      //   address: data.address || undefined,
      //   phone: data.phone || undefined,
      //   email: data.email || undefined,
      //   website: data.website || undefined,
      // });

      // Simulación por ahora
      console.log('Crear empresa:', data);
      
      toast.success('¡Empresa creada exitosamente!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear tu Empresa
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bienvenido, {user.name}. Vamos a configurar tu empresa.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px space-y-4">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa *
              </label>
              <input
                {...register('companyName')}
                id="companyName"
                type="text"
                className={`${inputClass} ${errors.companyName ? 'border-red-300' : ''}`}
                placeholder="Mi Empresa SA"
              />
              {errors.companyName && (
                <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>
              )}
            </div>

            {/* RUC */}
            <div>
              <label htmlFor="ruc" className="block text-sm font-medium text-gray-700 mb-1">
                RUC (opcional)
              </label>
              <input
                {...register('ruc')}
                id="ruc"
                type="text"
                maxLength={11}
                placeholder="12345678901"
                className={`${inputClass} ${errors.ruc ? 'border-red-300' : ''}`}
              />
              {errors.ruc && (
                <p className="text-red-500 text-xs mt-1">{errors.ruc.message}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">Si no lo tienes, el sistema generará uno temporal.</p>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección (opcional)
              </label>
              <input
                {...register('address')}
                id="address"
                type="text"
                placeholder="Calle Principal 123"
                className={`${inputClass} ${errors.address ? 'border-red-300' : ''}`}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (opcional)
              </label>
              <input
                {...register('phone')}
                id="phone"
                type="tel"
                placeholder="+502 1234 5678"
                className={`${inputClass} ${errors.phone ? 'border-red-300' : ''}`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email de la Empresa (opcional)
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                placeholder="contacto@empresa.com"
                className={`${inputClass} ${errors.email ? 'border-red-300' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Sitio Web (opcional)
              </label>
              <input
                {...register('website')}
                id="website"
                type="url"
                placeholder="https://miempresa.com"
                className={`${inputClass} ${errors.website ? 'border-red-300' : ''}`}
              />
              {errors.website && (
                <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Saltear por Ahora
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando...' : 'Crear Empresa'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            Puedes actualizar estos datos después en la configuración de la empresa.
          </p>
        </form>
      </div>
    </div>
  );
};

export default SetupCompany;
