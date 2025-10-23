import { useEffect, useState } from 'react';
import { getInvitations, createInvitation, deleteInvitation } from '../../services/invitationService';
import { useSelector } from 'react-redux';
import { showToast } from '../../utils/toast';
import type { RootState } from '../../store';

interface Invitation {
  id: string;
  code: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

const InvitationList = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'seller' | 'inventory' | 'employee'>('employee');
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await getInvitations();
      setInvitations(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const companyId = user?.companies?.[0]?.id;
      if (!companyId) {
        showToast.warning('No se pudo obtener el ID de la empresa');
        return;
      }
      
      await createInvitation({
        companyId,
        role: selectedRole,
      });
      showToast.success('Invitación creada correctamente');
      setShowModal(false);
      fetchInvitations();
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Error al crear invitación');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta invitación?')) {
      try {
        await deleteInvitation(id);
        showToast.success('Invitación eliminada correctamente');
        fetchInvitations();
      } catch (err: any) {
        showToast.error(err.response?.data?.message || 'Error al eliminar invitación');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) return <div className="p-4">Cargando invitaciones...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Invitaciones</h1>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva Invitación
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expira
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay invitaciones registradas
                  </td>
                </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-bold text-blue-600">{invitation.code}</div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invitation.role}</div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invitation.expiresAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invitation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invitation.isActive ? 'Activa' : 'Usada'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invitation.isActive && (
                        <button
                          onClick={() => handleDelete(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nueva Invitación</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Empleado</option>
                <option value="seller">Vendedor</option>
                <option value="inventory">Inventario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationList;
