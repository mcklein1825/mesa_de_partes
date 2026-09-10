import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, FileText, PlusCircle, BarChart3, Menu, X, Bell, 
  Search, Filter, Download, ChevronLeft, CheckCircle, Clock, 
  Archive, AlertTriangle, User, LogOut, MoreVertical, Paperclip,
  Calendar, Mail, Phone, MapPin, Building, FileCheck, Send
} from 'lucide-react';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = "https://tvrogbemtzdhcqjvfvdj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cm9nYmVtdHpkaGNxanZmdmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NTYzNTIsImV4cCI6MjEwNDUzMjM1Mn0.z0vwH9xwyBHWo8ea5GbNx1XHAHXF3ApwBpqfbqiF9aM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- TIPOS ---
type Estado = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado';
type Prioridad = 'Normal' | 'Urgente' | 'Muy Urgente';

interface Expediente {
  id: string;
  numeroExpediente: string;
  fechaIngreso: string;
  asunto: string;
  remitente: string;
  estado: Estado;
  areaDestino: string;
  prioridad: Prioridad;
  fechaLimite?: string;
  historial?: any[];
  [key: string]: any; // Para otros campos dinámicos
}

// --- DATOS INICIALES (Fallback si falla la carga) ---
const INITIAL_EXPEDIENTES: Expediente[] = [];

function App() {
  // --- ESTADOS ---
  const [expedientes, setExpedientes] = useState<Expediente[]>(INITIAL_EXPEDIENTES);
  const [vista, setVista] = useState<'dashboard' | 'expedientes' | 'registro' | 'reportes'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formularios y modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<Expediente | null>(null);
  const [accionPendiente, setAccionPendiente] = useState<{ tipo: 'derivar' | 'atender' | 'archivar', id: string, areaDestino?: string } | null>(null);

  // Formulario de registro
  const [nuevoExpediente, setNuevoExpediente] = useState({
    asunto: '',
    remitente: '',
    areaDestino: 'Mesa de Partes',
    prioridad: 'Normal' as Prioridad,
    descripcion: ''
  });

  // --- EFECTOS ---
  useEffect(() => {
    cargarExpedientes();
  }, []);

  // --- FUNCIONES DE DATOS (SUPABASE) ---
  const cargarExpedientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear datos de Supabase (payload) al formato local
      if (data) {
        const expedientesMapeados = data.map((item: any) => {
          // Si usas columna 'payload', desestructúralo. Si los campos están planos, úsalos directo.
          const expData = item.payload ? item.payload : item;
          return {
            ...expData,
            id: item.id, // Asegurar tener el ID de BD
            created_at: item.created_at
          };
        });
        setExpedientes(expedientesMapeados);
      } else {
        setExpedientes([]);
      }
    } catch (err: any) {
      console.error("Error cargando expedientes:", err);
      setError("No se pudo conectar con la base de datos. Mostrando datos locales.");
      // Fallback a datos vacíos o locales si existieran
      setExpedientes(INITIAL_EXPEDIENTES);
    } finally {
      setLoading(false);
    }
  };

  const guardarExpedienteEnBD = async (expediente: Partial<Expediente>) => {
    try {
      // Separamos el ID si existe para update, sino es insert
      const { id, ...rest } = expediente;
      
      // Estrategia: Guardamos todo el objeto en 'payload' para flexibilidad
      // O guardamos campos planos si tu tabla tiene columnas específicas.
      // Asumiendo estructura flexible con payload:
      const payloadData = {
        ...rest,
        updatedAt: new Date().toISOString()
      };

      let query;
      if (id) {
        // Actualizar existente
        query = supabase.from('expedientes').update({ payload: payloadData }).eq('id', id);
      } else {
        // Insertar nuevo
        query = supabase.from('expedientes').insert({ payload: payloadData });
      }

      const { error } = await query.select();
      if (error) throw error;
      
      return true;
    } catch (err: any) {
      console.error("Error guardando en BD:", err);
      throw err;
    }
  };

  // --- ACCIONES DE USUARIO ---
  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nuevoExp: Partial<Expediente> = {
        ...nuevoExpediente,
        numeroExpediente: `EXP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        fechaIngreso: new Date().toISOString(),
        estado: 'Pendiente',
        historial: [{
          fecha: new Date().toISOString(),
          accion: 'Registro',
          usuario: 'Usuario Actual',
          nota: 'Expediente creado desde Mesa de Partes'
        }]
      };

      await guardarExpedienteEnBD(nuevoExp);
      
      // Recargar lista
      await cargarExpedientes();
      
      // Resetear formulario y vista
      setNuevoExpediente({ asunto: '', remitente: '', areaDestino: 'Mesa de Partes', prioridad: 'Normal', descripcion: '' });
      setVista('expedientes');
      alert("Expediente registrado exitosamente en la base de datos.");
    } catch (error) {
      alert("Error al registrar. Revisa la consola para más detalles.");
    }
  };

  const confirmarAccion = (tipo: 'derivar' | 'atender' | 'archivar', id: string, areaDestino?: string) => {
    setAccionPendiente({ tipo, id, areaDestino });
    setModalAbierto(true);
  };

  const ejecutarAccionPendiente = async () => {
    if (!accionPendiente) return;

    const exp = expedientes.find(e => e.id === accionPendiente.id);
    if (!exp) return;

    try {
      let cambios: Partial<Expediente> = {};
      let notaHistorial = '';

      if (accionPendiente.tipo === 'derivar') {
        cambios.estado = 'En atención';
        cambios.areaDestino = accionPendiente.areaDestino;
        notaHistorial = `Derivado a ${accionPendiente.areaDestino}`;
      } else if (accionPendiente.tipo === 'atender') {
        cambios.estado = 'Atendido';
        notaHistorial = 'Expediente atendido';
      } else if (accionPendiente.tipo === 'archivar') {
        cambios.estado = 'Archivado';
        notaHistorial = 'Expediente archivado';
      }

      const historialActual = exp.historial || [];
      cambios.historial = [...historialActual, {
        fecha: new Date().toISOString(),
        accion: accionPendiente.tipo === 'derivar' ? 'Derivación' : (accionPendiente.tipo === 'atender' ? 'Atención' : 'Archivo'),
        usuario: 'Usuario Actual',
        nota: notaHistorial
      }];

      await guardarExpedienteEnBD({ id: exp.id, ...cambios });
      await cargarExpedientes();
      
      setModalAbierto(false);
      setAccionPendiente(null);
    } catch (error) {
      alert("Error al ejecutar la acción.");
      console.error(error);
    }
  };

  // --- RENDERIZADO ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando expedientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700 h-16">
          {sidebarOpen && <span className="font-bold text-lg tracking-wide">MESA PARTES</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-700 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavItem icon={<Home size={20} />} label="Inicio" active={vista === 'dashboard'} onClick={() => setVista('dashboard')} expanded={sidebarOpen} />
          <NavItem icon={<FileText size={20} />} label="Expedientes" active={vista === 'expedientes'} onClick={() => setVista('expedientes')} expanded={sidebarOpen} />
          <NavItem icon={<PlusCircle size={20} />} label="Nuevo" active={vista === 'registro'} onClick={() => setVista('registro')} expanded={sidebarOpen} />
          <NavItem icon={<BarChart3 size={20} />} label="Reportes" active={vista === 'reportes'} onClick={() => setVista('reportes')} expanded={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">LR</div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">Lucía Ramírez</p>
                <p className="text-xs text-gray-400 truncate">Mesa de Partes</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <h2 className="text-xl font-semibold text-gray-700 capitalize">{vista}</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
                <div className="ml-3"><p className="text-sm text-red-700">{error}</p></div>
              </div>
            </div>
          )}

          {vista === 'dashboard' && (
            <div className="space-y-6">
              {/* Estadísticas - CORREGIDO */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total Expedientes" 
                  value={expedientes.length.toString()} 
                  subtitle={`${expedientes.filter(e => e.estado === 'Pendiente').length} pendientes`}
                  icon={<FileText size={24} className="text-orange-500" />} 
                  color="bg-orange-100"
                />
                <StatCard 
                  title="En Atención" 
                  value={expedientes.filter(e => e.estado === 'En atención').length.toString()} 
                  subtitle="Requieren acción"
                  icon={<Clock size={24} className="text-blue-500" />} 
                  color="bg-blue-100"
                />
                <StatCard 
                  title="Atendidos" 
                  value={expedientes.filter(e => e.estado === 'Atendido').length.toString()} 
                  subtitle="+12% vs mes anterior"
                  icon={<CheckCircle size={24} className="text-green-500" />} 
                  color="bg-green-100"
                />
                <StatCard 
                  title="Archivados" 
                  value={expedientes.filter(e => e.estado === 'Archivado').length.toString()} 
                  subtitle="Historial completo"
                  icon={<Archive size={24} className="text-purple-500" />} 
                  color="bg-purple-100"
                />
              </div>

              {/* Tabla Recientes */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Expedientes Recientes</h3>
                  <button onClick={() => setVista('expedientes')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Expediente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expedientes.slice(0, 5).map((exp) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{exp.numeroExpediente}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exp.asunto}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={exp.estado} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(exp.fechaIngreso).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {vista === 'expedientes' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por número, asunto o remitente..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  <Filter size={18} /> Filtros
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  <Download size={18} /> Exportar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remitente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expedientes.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{exp.numeroExpediente}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(exp.fechaIngreso).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exp.remitente}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{exp.asunto}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.areaDestino}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={exp.estado} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {exp.estado === 'Pendiente' && (
                              <button onClick={() => confirmarAccion('derivar', exp.id)} className="text-blue-600 hover:text-blue-900">Derivar</button>
                            )}
                            {exp.estado === 'En atención' && (
                              <button onClick={() => confirmarAccion('atender', exp.id)} className="text-green-600 hover:text-green-900">Atender</button>
                            )}
                            {(exp.estado === 'Atendido' || exp.estado === 'Archivado') && (
                               <span className="text-gray-400 cursor-not-allowed">Finalizado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vista === 'registro' && (
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center gap-2">
                <PlusCircle className="text-blue-600" /> Nuevo Expediente
              </h3>
              <form onSubmit={handleRegistrar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asunto</label>
                  <input 
                    required
                    type="text" 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    value={nuevoExpediente.asunto}
                    onChange={(e) => setNuevoExpediente({...nuevoExpediente, asunto: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Remitente</label>
                    <input 
                      required
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={nuevoExpediente.remitente}
                      onChange={(e) => setNuevoExpediente({...nuevoExpediente, remitente: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Área Destino</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={nuevoExpediente.areaDestino}
                      onChange={(e) => setNuevoExpediente({...nuevoExpediente, areaDestino: e.target.value})}
                    >
                      <option>Mesa de Partes</option>
                      <option>Gerencia General</option>
                      <option>Administración</option>
                      <option>Logística</option>
                      <option>Recursos Humanos</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                  <div className="mt-2 flex gap-4">
                    {['Normal', 'Urgente', 'Muy Urgente'].map((p) => (
                      <label key={p} className="inline-flex items-center">
                        <input 
                          type="radio" 
                          className="form-radio text-blue-600" 
                          name="prioridad"
                          value={p}
                          checked={nuevoExpediente.prioridad === p}
                          onChange={(e) => setNuevoExpediente({...nuevoExpediente, prioridad: e.target.value as Prioridad})}
                        />
                        <span className="ml-2 text-sm text-gray-700">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción Detallada</label>
                  <textarea 
                    rows={4} 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    value={nuevoExpediente.descripcion}
                    onChange={(e) => setNuevoExpediente({...nuevoExpediente, descripcion: e.target.value})}
                  ></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setVista('dashboard')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Registrar Expediente
                  </button>
                </div>
              </form>
            </div>
          )}

          {vista === 'reportes' && (
            <div className="text-center py-20">
              <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Módulo de Reportes</h3>
              <p className="text-gray-500 mt-2">Próximamente: Gráficos de rendimiento y exportación avanzada.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Confirmación */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Acción</h3>
            <p className="text-gray-600 mb-6">
              {accionPendiente?.tipo === 'derivar' && "¿Estás seguro de que quieres derivar este expediente? Esta acción cambiará su estado a 'En atención'."}
              {accionPendiente?.tipo === 'atender' && "¿Estás seguro de que quieres marcar este expediente como atendido?"}
              {accionPendiente?.tipo === 'archivar' && "¿Estás seguro de que quieres archivar este expediente? Esta acción es irreversible."}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setModalAbierto(false); setAccionPendiente(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={ejecutarAccionPendiente}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                {accionPendiente?.tipo === 'derivar' ? 'Confirmar Derivación' : (accionPendiente?.tipo === 'atender' ? 'Confirmar Atención' : 'Confirmar Archivo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function NavItem({ icon, label, active, onClick, expanded }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'} ${!expanded && 'justify-center'}`}
    >
      {icon}
      {expanded && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'En atención': 'bg-blue-100 text-blue-800',
    'Atendido': 'bg-green-100 text-green-800',
    'Archivado': 'bg-gray-100 text-gray-800'
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default App;
