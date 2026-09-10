import { useState, useEffect } from 'react';
import { createClient } from './supabaseClient';
import { Expediente, Status } from './types/expediente';
import { 
  Home, FileText, PlusCircle, BarChart3, Menu, X, Bell, Search, 
  Filter, ChevronLeft, ChevronRight, MoreVertical, CheckCircle, 
  Clock, Archive, AlertTriangle, User, LogOut, Edit, Trash2, 
  Eye, Download, Upload, Calendar, MapPin, Phone, Mail, Building,
  FileCheck, Send, Shield, Activity, TrendingUp, Users, FolderOpen
} from 'lucide-react';
import './index.css';

// Inicializar cliente de Supabase
const supabase = createClient();

// Tipos auxiliares
type View = 'dashboard' | 'expedientes' | 'registro' | 'reportes';
type PendingAction = { type: 'derive' | 'complete' | 'archive'; id: string; areaDestino?: string } | null;

// Datos estáticos para áreas (se pueden mover a una tabla luego)
const AREAS = [
  { id: '1', nombre: 'Mesa de Partes' },
  { id: '2', nombre: 'Gerencia General' },
  { id: '3', nombre: 'Asesoría Jurídica' },
  { id: '4', nombre: 'Administración' },
  { id: '5', nombre: 'Recursos Humanos' },
  { id: '6', nombre: 'Obras' },
  { id: '7', nombre: 'Contabilidad' }
];

// Usuario mock (se puede reemplazar con auth real de Supabase)
const USUARIO_ACTUAL = {
  nombre: 'Lucía Ramírez',
  cargo: 'Mesa de Partes',
  area: 'Mesa de Partes',
  avatar: 'LR'
};

function App() {
  // Estados principales
  const [view, setView] = useState<View>('dashboard');
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [modalTrazabilidad, setModalTrazabilidad] = useState<Expediente | null>(null);
  
  // Estados de formulario
  const [formData, setFormData] = useState<any>({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombre: '',
    cargo: '',
    representante: '',
    cargoRepresentante: '',
    asunto: '',
    contenido: '',
    direccion: '',
    correo: '',
    celular: '',
    folios: 1,
    anexos: 0,
    prioridad: 'Normal',
    canalRecepcion: 'Presencial',
    entregadoA: '',
    documentoSeguimiento: '',
    archivos: [] as File[]
  });

  // Cargar expedientes desde Supabase al iniciar
  useEffect(() => {
    cargarExpedientes();
  }, []);

  const cargarExpedientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar datos: extraer del payload o usar campos directos si existieran
      const expedientesData = (data || []).map((item: any) => {
        // Si la tabla usa columna 'payload' (jsonb), extraemos los datos de ahí
        // Si usa columnas planas, usamos el item directo
        const expData = item.payload ? item.payload : item;
        
        return {
          ...expData,
          id: item.id, // Asegurar que el ID de la BD se mantenga
          createdAt: item.created_at
        } as Expediente;
      });

      setExpedientes(expedientesData);
    } catch (err: any) {
      console.error('Error cargando expedientes:', err);
      setError('No se pudo cargar los expedientes desde la base de datos. Verifica tu conexión a Supabase.');
      // Fallback vacío para no romper la UI
      setExpedientes([]);
    } finally {
      setLoading(false);
    }
  };

  const guardarExpedienteEnSupabase = async (expediente: Partial<Expediente>) => {
    try {
      // Determinar si es insert o update
      const isUpdate = !!expediente.id;
      
      // Preparar payload: guardamos todo el objeto expediente en la columna 'payload'
      // Esto coincide con tu esquema simple de Supabase
      const payload = {
        ...expediente,
        updatedAt: new Date().toISOString()
      };

      let query;
      if (isUpdate) {
        query = supabase
          .from('expedientes')
          .update({ payload })
          .eq('id', expediente.id);
      } else {
        query = supabase
          .from('expedientes')
          .insert({ payload });
      }

      const { data, error } = await query.select();

      if (error) throw error;
      
      return data?.[0];
    } catch (err: any) {
      console.error('Error guardando en Supabase:', err);
      throw err;
    }
  };

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nuevoExpediente: Partial<Expediente> = {
        numeroExpediente: `EXP-${new Date().getFullYear()}-${String(expedientes.length + 1).padStart(4, '0')}`,
        anio: new Date().getFullYear(),
        correlativo: expedientes.length + 1,
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.numeroDocumento,
        remitenteNombre: formData.nombre,
        remitenteCargo: formData.cargo,
        representante: formData.representante,
        cargoRepresentante: formData.cargoRepresentante,
        asunto: formData.asunto,
        contenido: formData.contenido,
        direccion: formData.direccion,
        correo: formData.correo,
        celular: formData.celular,
        folios: parseInt(formData.folios),
        anexos: parseInt(formData.anexos),
        prioridad: formData.prioridad,
        estado: 'Pendiente',
        areaOrigen: 'Mesa de Partes',
        areaDestino: 'Mesa de Partes', // Inicialmente en mesa de partes
        ubicacionActual: 'Mesa de Partes',
        fechaIngreso: new Date().toISOString(),
        registradoPor: USUARIO_ACTUAL.nombre,
        historial: [{
          accion: 'Registro',
          fecha: new Date().toISOString(),
          responsable: USUARIO_ACTUAL.nombre,
          area: 'Mesa de Partes',
          observacion: 'Expediente registrado en mesa de partes'
        }]
      };

      const guardado = await guardarExpedienteEnSupabase(nuevoExpediente);
      
      if (guardado) {
        // Recargar lista para obtener el ID real y datos actualizados
        await cargarExpedientes();
        alert('✅ Expediente registrado correctamente en la base de datos');
        setView('expedientes');
        resetForm();
      }
    } catch (err) {
      alert('❌ Error al registrar: ' + (err as any).message);
    }
  };

  const handleDerivar = async () => {
    if (!pendingAction || pendingAction.type !== 'derive') return;

    try {
      const expediente = expedientes.find(e => e.id === pendingAction.id);
      if (!expediente) throw new Error('Expediente no encontrado');

      const actualizado: Partial<Expediente> = {
        ...expediente,
        estado: 'En atención',
        areaDestino: pendingAction.areaDestino,
        ubicacionActual: pendingAction.areaDestino,
        historial: [
          ...(expediente.historial || []),
          {
            accion: 'Derivación',
            fecha: new Date().toISOString(),
            responsable: USUARIO_ACTUAL.nombre,
            areaOrigen: expediente.areaDestino,
            areaDestino: pendingAction.areaDestino,
            observacion: `Derivado a ${pendingAction.areaDestino}`
          }
        ]
      };

      await guardarExpedienteEnSupabase(actualizado);
      await cargarExpedientes();
      alert('✅ Expediente derivado correctamente');
    } catch (err) {
      alert('❌ Error al derivar: ' + (err as any).message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleAtender = async () => {
    if (!pendingAction || pendingAction.type !== 'complete') return;

    try {
      const expediente = expedientes.find(e => e.id === pendingAction.id);
      if (!expediente) throw new Error('Expediente no encontrado');

      const actualizado: Partial<Expediente> = {
        ...expediente,
        estado: 'Atendido',
        fechaAtencion: new Date().toISOString(),
        historial: [
          ...(expediente.historial || []),
          {
            accion: 'Atención',
            fecha: new Date().toISOString(),
            responsable: USUARIO_ACTUAL.nombre,
            area: expediente.areaDestino,
            observacion: 'Expediente atendido'
          }
        ]
      };

      await guardarExpedienteEnSupabase(actualizado);
      await cargarExpedientes();
      alert('✅ Expediente atendido correctamente');
    } catch (err) {
      alert('❌ Error al atender: ' + (err as any).message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleArchivar = async () => {
    if (!pendingAction || pendingAction.type !== 'archive') return;

    try {
      const expediente = expedientes.find(e => e.id === pendingAction.id);
      if (!expediente) throw new Error('Expediente no encontrado');

      const actualizado: Partial<Expediente> = {
        ...expediente,
        estado: 'Archivado',
        fechaArchivo: new Date().toISOString(),
        historial: [
          ...(expediente.historial || []),
          {
            accion: 'Archivado',
            fecha: new Date().toISOString(),
            responsable: USUARIO_ACTUAL.nombre,
            area: expediente.areaDestino,
            observacion: 'Expediente archivado'
          }
        ]
      };

      await guardarExpedienteEnSupabase(actualizado);
      await cargarExpedientes();
      alert('✅ Expediente archivado correctamente');
    } catch (err) {
      alert('❌ Error al archivar: ' + (err as any).message);
    } finally {
      setPendingAction(null);
    }
  };

  const resetForm = () => {
    setFormData({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombre: '',
      cargo: '',
      representante: '',
      cargoRepresentante: '',
      asunto: '',
      contenido: '',
      direccion: '',
      correo: '',
      celular: '',
      folios: 1,
      anexos: 0,
      prioridad: 'Normal',
      canalRecepcion: 'Presencial',
      entregadoA: '',
      documentoSeguimiento: '',
      archivos: []
    });
  };

  // Helpers de UI
  const getStatusBadgeClass = (estado: Status) => {
    switch (estado) {
      case 'Pendiente': return 'pendiente';
      case 'En atención': return 'en-atención';
      case 'Atendido': return 'atendido';
      case 'Archivado': return 'archivado';
      default: return '';
    }
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#ef4444';
      case 'Media': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  // Renderizado condicional de vistas
  const renderDashboard = () => {
    const total = expedientes.length;
    const pendientes = expedientes.filter(e => e.estado === 'Pendiente').length;
    const enAtencion = expedientes.filter(e => e.estado === 'En atención').length;
    const atendidos = expedientes.filter(e => e.estado === 'Atendido').length;
    
    // Calcular vencimientos reales
    const hoy = new Date();
    const proximosVencimientos = expedientes
      .filter(e => e.estado !== 'Archivado' && e.estado !== 'Atendido')
      .filter(e => {
        if (!e.fechaLimite) return false;
        const limite = new Date(e.fechaLimite);
        const diffDays = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      })
      .sort((a, b) => {
        const dateA = a.fechaLimite ? new Date(a.fechaLimite).getTime() : 0;
        const dateB = b.fechaLimite ? new Date(b.fechaLimite).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 5);

    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">RESUMEN GENERAL</div>
            <h1>Dashboard de Gestión</h1>
            <p className="muted">Estado actual de los expedientes institucionales</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon orange"><FileText size={20} /></div>
            <div>
              <span>Total Expedientes</span>
              <strong>{total}</strong>
              <small className="positive">+12% vs mes anterior</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Clock size={20} /></div>
            <div>
              <span>Pendientes</span>
              <strong>{pendientes}</strong>
              <small>{Math.round((pendientes/total)*100) || 0}% del total</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={20} /></div>
            <div>
              <span>Atendidos</span>
              <strong>{atendidos}</strong>
              <small className="positive">Tiempo prom: 2.4 días</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><AlertTriangle size={20} /></div>
            <div>
              <span>Próx. Vencimiento</span>
              <strong>{proximosVencimientos.length}</strong>
              <small style={{color: '#ef4444'}}>Requieren atención</small>
            </div>
          </div>
        </div>

        <div className="content-grid">
          <div className="panel list-panel">
            <div className="panel-header">
              <div>
                <h2>Expedientes Recientes</h2>
                <p>Últimos registros ingresados al sistema</p>
              </div>
              <button className="text-button" onClick={() => setView('expedientes')}>
                Ver todos <span>→</span>
              </button>
            </div>
            
            {loading ? (
              <div className="empty-state">Cargando datos...</div>
            ) : expedientes.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} style={{margin: '0 auto 16px', opacity: 0.3}} />
                No hay expedientes registrados
                <br />
                <button className="primary-button" style={{marginTop: 16}} onClick={() => setView('registro')}>
                  Registrar primero
                </button>
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>N° Expediente</th>
                        <th>Fecha</th>
                        <th>Remitente</th>
                        <th>Asunto</th>
                        <th>Estado</th>
                        <th>Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expedientes.slice(0, 5).map(exp => (
                        <tr key={exp.id}>
                          <td>
                            <span className="exp-id">{exp.numeroExpediente}</span>
                          </td>
                          <td>{new Date(exp.fechaIngreso!).toLocaleDateString()}</td>
                          <td>
                            <div className="person-cell">
                              <div className="small-avatar">
                                {exp.remitenteNombre?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <b>{exp.remitenteNombre || 'Sin nombre'}</b>
                                <small>{exp.tipoDocumento}: {exp.numeroDocumento}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="table-cell-text">{exp.asunto}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(exp.estado)}`}>
                              <i></i> {exp.estado}
                            </span>
                          </td>
                          <td>{exp.ubicacionActual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  Mostrando 5 de {total}
                  <span>•</span>
                </div>
              </>
            )}
          </div>

          <div className="panel deadlines-panel">
            <div className="panel-header">
              <div>
                <h2>Próximos Vencimientos</h2>
                <p>Expedientes que vencen en los próximos 5 días</p>
              </div>
            </div>
            
            <div className="deadline-list">
              {proximosVencimientos.length === 0 ? (
                <div style={{padding: '20px', textAlign: 'center', color: '#9aa8b1'}}>
                  <CheckCircle size={32} style={{margin: '0 auto 8px', opacity: 0.3}} />
                  No hay vencimientos próximos
                </div>
              ) : (
                proximosVencimientos.map(exp => {
                  const limite = new Date(exp.fechaLimite!);
                  const hoy = new Date();
                  const diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={exp.id} className="deadline-item">
                      <div className={`deadline-date ${diasRestantes <= 2 ? 'urgent' : ''}`}>
                        <b>{limite.getDate()}</b>
                        <span>{limite.toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div>
                        <b>{exp.numeroExpediente}</b>
                        <p>{exp.asunto}</p>
                        <small>
                          {diasRestantes === 0 ? 'Vence hoy' : 
                           diasRestantes === 1 ? 'Vence mañana' : 
                           `Vence en ${diasRestantes} días`}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button className="outline-button" style={{width: 'calc(100% - 44px)', margin: '0 22px'}} onClick={() => setView('expedientes')}>
              Ver todos los plazos
            </button>
            
            <div className="quick-tip">
              <span>💡</span>
              <div>
                <b>Consejo rápido</b>
                <p>Revisa los expedientes en rojo prioritario primero.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpedientes = () => (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">GESTIÓN DOCUMENTAL</div>
          <h1>Expedientes</h1>
          <p className="muted">Consulta y gestión de todos los expedientes registrados</p>
        </div>
        <button className="primary-button" onClick={() => setView('registro')}>
          <PlusCircle size={16} style={{marginRight: 8}} />
          Nuevo expediente
        </button>
      </div>

      <div className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Buscar por número, asunto o remitente..." />
          </div>
          <select>
            <option>Todos los estados</option>
            <option>Pendiente</option>
            <option>En atención</option>
            <option>Atendido</option>
            <option>Archivado</option>
          </select>
          <select>
            <option>Todas las áreas</option>
            {AREAS.map(area => (
              <option key={area.id}>{area.nombre}</option>
            ))}
          </select>
          <button className="filter-button">
            <Filter size={14} style={{marginRight: 6}} />
            Filtrar
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Cargando expedientes...</div>
        ) : expedientes.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} style={{margin: '0 auto 16px', opacity: 0.3}} />
            No se encontraron expedientes
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° Expediente</th>
                    <th>Fecha</th>
                    <th>Remitente</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Ubicación Actual</th>
                    <th>Prioridad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <span className="exp-id">{exp.numeroExpediente}</span>
                        <small>{exp.tipoDocumento}: {exp.numeroDocumento}</small>
                      </td>
                      <td>{new Date(exp.fechaIngreso!).toLocaleDateString()}</td>
                      <td>
                        <div className="person-cell">
                          <div className="small-avatar">
                            {exp.remitenteNombre?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <b>{exp.remitenteNombre || 'Sin nombre'}</b>
                            <small>{exp.cargo || 'Sin cargo'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-cell-text">{exp.asunto}</span>
                        <small>{exp.contenido?.substring(0, 60)}...</small>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(exp.estado)}`}>
                          <i></i> {exp.estado}
                        </span>
                      </td>
                      <td>{exp.ubicacionActual}</td>
                      <td>
                        <span style={{color: getPriorityColor(exp.prioridad || 'Normal'), fontWeight: 600}}>
                          {exp.prioridad}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-link" onClick={() => setModalTrazabilidad(exp)}>
                            <Eye size={14} style={{marginRight: 4}} />
                            Trazabilidad
                          </button>
                          {exp.estado === 'Pendiente' && (
                            <button 
                              className="action-link" 
                              style={{color: '#2563eb'}}
                              onClick={() => setPendingAction({type: 'derive', id: exp.id!})}
                            >
                              <Send size={14} style={{marginRight: 4}} />
                              Derivar
                            </button>
                          )}
                          {exp.estado === 'En atención' && (
                            <button 
                              className="action-link" 
                              style={{color: '#059669'}}
                              onClick={() => setPendingAction({type: 'complete', id: exp.id!})}
                            >
                              <CheckCircle size={14} style={{marginRight: 4}} />
                              Atender
                            </button>
                          )}
                          {(exp.estado === 'Atendido' || exp.estado === 'En atención') && (
                            <button 
                              className="action-link" 
                              style={{color: '#6b7280'}}
                              onClick={() => setPendingAction({type: 'archive', id: exp.id!})}
                            >
                              <Archive size={14} style={{marginRight: 4}} />
                              Archivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              Mostrando {expedientes.length} de {expedientes.length}
              <span>•</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderRegistro = () => (
    <div className="page">
      <div className="page-heading compact">
        <button className="back-button" onClick={() => setView('expedientes')}>
          <ChevronLeft size={16} style={{marginRight: 4}} />
          Volver a expedientes
        </button>
      </div>

      <div className="form-layout">
        <div className="saving-notice">
          📡 Guardado directo en Base de Datos (Supabase)
        </div>

        <form onSubmit={handleRegistrar}>
          <div className="form-panel">
            <div className="panel-header">
              <h2>📋 Datos del trámite</h2>
              <p>Complete los datos solicitados para registrar el expediente.</p>
            </div>
            <div className="form-grid">
              <div>
                <label>Fecha de ingreso</label>
                <input 
                  type="date" 
                  value={new Date().toISOString().split('T')[0]} 
                  disabled 
                />
              </div>
              <div>
                <label>Trámite</label>
                <select required>
                  <option value="">Seleccione el tipo</option>
                  <option>Solicitud</option>
                  <option>Recurso de Apelación</option>
                  <option>Recurso de Reconsideración</option>
                  <option>Queja</option>
                  <option>Denuncia</option>
                </select>
              </div>
              <div className="wide">
                <label>Nombre / apellido o razón social *</label>
                <input 
                  type="text" 
                  placeholder="Ingrese el nombre completo o razón social."
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label>Cargo del remitente</label>
                <input 
                  type="text" 
                  placeholder="Cargo o función del remitente"
                  value={formData.cargo}
                  onChange={e => setFormData({...formData, cargo: e.target.value})}
                />
              </div>
              <div>
                <label>Representante (si aplica)</label>
                <input 
                  type="text" 
                  placeholder="Nombre del representante"
                  value={formData.representante}
                  onChange={e => setFormData({...formData, representante: e.target.value})}
                />
              </div>
              <div className="wide">
                <label>Asunto de la solicitud *</label>
                <input 
                  type="text" 
                  placeholder="Registre en forma clara el asunto por el cual ingresa el documento."
                  value={formData.asunto}
                  onChange={e => setFormData({...formData, asunto: e.target.value})}
                  required 
                />
              </div>
              <div className="wide">
                <label>Contenido</label>
                <textarea 
                  rows={4}
                  placeholder="Ingrese en forma detallada el contenido de su solicitud, procedimiento o trámite."
                  value={formData.contenido}
                  onChange={e => setFormData({...formData, contenido: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-panel">
            <div className="section-strip">👤 Datos del administrado</div>
            <div className="form-grid">
              <div>
                <label>Tipo de documento</label>
                <select 
                  value={formData.tipoDocumento}
                  onChange={e => setFormData({...formData, tipoDocumento: e.target.value})}
                >
                  <option>DNI</option>
                  <option>RUC</option>
                  <option>CE</option>
                  <option>Pasaporte</option>
                </select>
              </div>
              <div>
                <label>Número de documento *</label>
                <div className="inline-field">
                  <input 
                    type="text" 
                    placeholder="Número de documento"
                    value={formData.numeroDocumento}
                    onChange={e => setFormData({...formData, numeroDocumento: e.target.value})}
                    required 
                  />
                  <button type="button" className="legacy-blue-button">⌕ Validar</button>
                </div>
                <small style={{display: 'block', marginTop: 4, fontSize: 10, color: '#666'}}>
                  Si su documento corresponde a un contribuyente, recuerde que deberá autenticarse con RUC.
                </small>
              </div>
              <div className="wide">
                <label>Dirección</label>
                <input 
                  type="text" 
                  placeholder="Ingrese la Dirección"
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                />
              </div>
              <div>
                <label>Correo electrónico</label>
                <input 
                  type="email" 
                  placeholder="Necesario para notificación electrónica"
                  value={formData.correo}
                  onChange={e => setFormData({...formData, correo: e.target.value})}
                />
              </div>
              <div>
                <label>Celular</label>
                <input 
                  type="tel" 
                  placeholder="Teléfono de contacto"
                  value={formData.celular}
                  onChange={e => setFormData({...formData, celular: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-panel">
            <div className="section-strip">📎 Archivos a Adjuntar</div>
            <div className="upload-box">
              <Upload size={32} />
              <b>Arrastre archivos aquí o haga clic para seleccionar</b>
              <small>Máximo 5 MB por archivo. Formatos: PDF, JPG, PNG</small>
              <input 
                type="file" 
                multiple 
                onChange={e => setFormData({...formData, archivos: Array.from(e.target.files || [])})}
              />
            </div>
            {formData.archivos.length > 0 && (
              <div style={{padding: '0 22px 16px'}}>
                {formData.archivos.map((file: File, i: number) => (
                  <div key={i} style={{fontSize: 11, padding: '4px 0', borderBottom: '1px solid #eee'}}>
                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="outline-button" onClick={() => setView('expedientes')}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              ✓ Registrar Expediente
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderReportes = () => {
    const total = expedientes.length;
    const porEstado = {
      Pendiente: expedientes.filter(e => e.estado === 'Pendiente').length,
      'En atención': expedientes.filter(e => e.estado === 'En atención').length,
      Atendido: expedientes.filter(e => e.estado === 'Atendido').length,
      Archivado: expedientes.filter(e => e.estado === 'Archivado').length
    };
    
    const porArea: Record<string, number> = {};
    expedientes.forEach(exp => {
      const area = exp.areaDestino || 'Sin asignar';
      porArea[area] = (porArea[area] || 0) + 1;
    });

    return (
      <div className="page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">ANÁLISIS Y ESTADÍSTICAS</div>
            <h1>Reportes</h1>
            <p className="muted">Estadísticas detalladas del sistema de gestión documental</p>
          </div>
          <button className="outline-button">
            <Download size={16} style={{marginRight: 8}} />
            Exportar reporte
          </button>
        </div>

        <div className="report-panel panel">
          <div className="panel-header">
            <h2>Distribución por Estado</h2>
            <p>Estado actual de todos los expedientes</p>
          </div>
          
          {Object.entries(porEstado).map(([estado, count]) => (
            <div key={estado} className="bar-row">
              <b>{estado}</b>
              <div>
                <i style={{width: `${total ? (count/total)*100 : 0}%`}}></i>
              </div>
              <b>{count} ({total ? Math.round((count/total)*100) : 0}%)</b>
            </div>
          ))}
        </div>

        <div className="report-panel panel" style={{marginTop: 20}}>
          <div className="panel-header">
            <h2>Distribución por Área</h2>
            <p>Expedientes derivados por área destino</p>
          </div>
          
          {Object.entries(porArea).map(([area, count]) => (
            <div key={area} className="bar-row">
              <b>{area}</b>
              <div>
                <i style={{width: `${total ? (count/total)*100 : 0}%`}}></i>
              </div>
              <b>{count} ({total ? Math.round((count/total)*100) : 0}%)</b>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="portal-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-mark">MP</div>
          <div>
            <strong>Mesa de Partes</strong>
            <span>Gestión documental</strong>
          </div>
        </div>

        <div className="menu-label">MENÚ PRINCIPAL</div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <span className="nav-icon">⌂</span>
            Inicio
          </button>
          <button 
            className={`nav-item ${view === 'expedientes' ? 'active' : ''}`}
            onClick={() => setView('expedientes')}
          >
            <span className="nav-icon">▤</span>
            Expedientes
            {expedientes.filter(e => e.estado === 'Pendiente').length > 0 && (
              <em>{expedientes.filter(e => e.estado === 'Pendiente').length}</em>
            )}
          </button>
          <button 
            className={`nav-item ${view === 'registro' ? 'active' : ''}`}
            onClick={() => setView('registro')}
          >
            <span className="nav-icon">＋</span>
            Nuevo expediente
          </button>
          <button 
            className={`nav-item ${view === 'reportes' ? 'active' : ''}`}
            onClick={() => setView('reportes')}
          >
            <span className="nav-icon">▥</span>
            Reportes
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="secure-note">
            <span>🛡️</span>
            <div>
              <b>Entorno Seguro</b>
              <small>Conexión SSL cifrada</small>
            </div>
          </div>
          
          <div className="user-mini" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="avatar">{USUARIO_ACTUAL.avatar}</div>
            <div>
              <b>{USUARIO_ACTUAL.nombre}</b>
              <small>{USUARIO_ACTUAL.cargo}</small>
            </div>
            <span>⋮</span>
            
            {userMenuOpen && (
              <div className="profile-popover">
                <b>{USUARIO_ACTUAL.nombre}</b>
                <span>{USUARIO_ACTUAL.cargo}</span>
                <hr />
                <button onClick={() => {
                  setUserMenuOpen(false);
                  alert('Funcionalidad de perfil en desarrollo');
                }}>
                  👤 Mi perfil
                </button>
                <button onClick={() => {
                  setUserMenuOpen(false);
                  alert('Funcionalidad de configuración en desarrollo');
                }}>
                  ⚙️ Configuración
                </button>
                <hr />
                <button onClick={() => alert('Cerrar sesión (demo)')}>
                  <LogOut size={14} style={{marginRight: 8}} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <b>Mesa de Partes Virtual</b>
            <span>/</span>
            <strong>
              {view === 'dashboard' && 'Inicio'}
              {view === 'expedientes' && 'Expedientes'}
              {view === 'registro' && 'Nuevo Expediente'}
              {view === 'reportes' && 'Reportes'}
            </strong>
          </div>
          
          <div className="top-actions">
            <button className="icon-button">
              🔔
              <i></i>
            </button>
            <button className="icon-button">❓</button>
          </div>
        </header>

        {error && (
          <div style={{background: '#fee2e2', color: '#b91c1c', padding: '12px 24px', margin: '20px 42px', borderRadius: 6, border: '1px solid #fecaca'}}>
            ⚠️ {error}
          </div>
        )}

        {view === 'dashboard' && renderDashboard()}
        {view === 'expedientes' && renderExpedientes()}
        {view === 'registro' && renderRegistro()}
        {view === 'reportes' && renderReportes()}
      </main>

      {/* Modal de Confirmación */}
      {pendingAction && (
        <div className="modal-backdrop">
          <div className="tracking-modal" style={{maxWidth: 450}}>
            <div className="tracking-header">
              <div>
                <div className="eyebrow">CONFIRMACIÓN DE SEGURIDAD</div>
                <h2>Confirmar acción</h2>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setPendingAction(null)}
              >
                ×
              </button>
            </div>
            
            <div style={{padding: '24px 28px'}}>
              <div style={{display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20}}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', 
                  background: pendingAction.type === 'derive' ? '#eff6ff' : 
                             pendingAction.type === 'complete' ? '#f0fdf4' : '#f9fafb',
                  display: 'grid', placeItems: 'center', flexShrink: 0
                }}>
                  {pendingAction.type === 'derive' && <Send size={24} style={{color: '#2563eb'}} />}
                  {pendingAction.type === 'complete' && <CheckCircle size={24} style={{color: '#059669'}} />}
                  {pendingAction.type === 'archive' && <Archive size={24} style={{color: '#4b5563'}} />}
                </div>
                <div>
                  <h3 style={{margin: '0 0 8px', fontSize: 16, color: '#1f2937'}}>
                    {pendingAction.type === 'derive' && '¿Derivar expediente?'}
                    {pendingAction.type === 'complete' && '¿Marcar como atendido?'}
                    {pendingAction.type === 'archive' && '¿Archivar expediente?'}
                  </h3>
                  <p style={{margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5}}>
                    {pendingAction.type === 'derive' && 'El expediente será transferido al área seleccionada y cambiará su estado a "En atención". Esta acción quedará registrada en la trazabilidad.'}
                    {pendingAction.type === 'complete' && 'El expediente se marcará como atendido y se registrará la fecha de atención. Esta acción no se puede deshacer.'}
                    {pendingAction.type === 'archive' && 'El expediente será archivado permanentemente. Solo los administradores podrán recuperarlo.'}
                  </p>
                </div>
              </div>
              
              <div style={{background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '12px 14px', marginBottom: 24}}>
                <div style={{display: 'flex', gap: 10, alignItems: 'flex-start'}}>
                  <AlertTriangle size={18} style={{color: '#d97706', flexShrink: 0}} />
                  <small style={{color: '#92400e', fontSize: 12, lineHeight: 1.4}}>
                    <b>Advertencia:</b> Esta acción modificará el estado del expediente y quedará registrada en el historial. Asegúrese de que toda la información sea correcta antes de continuar.
                  </small>
                </div>
              </div>
            </div>
            
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb'}}>
              <button 
                className="outline-button"
                onClick={() => setPendingAction(null)}
              >
                Cancelar
              </button>
              <button 
                className="primary-button"
                onClick={
                  pendingAction.type === 'derive' ? handleDeriver :
                  pendingAction.type === 'complete' ? handleAtender :
                  handleArchivar
                }
              >
                ✓ {pendingAction.type === 'derive' ? 'Derivar' : 
                   pendingAction.type === 'complete' ? 'Atender' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Trazabilidad */}
      {modalTrazabilidad && (
        <div className="modal-backdrop">
          <div className="tracking-modal">
            <div className="tracking-header">
              <div>
                <div className="eyebrow">SEGUIMIENTO DOCUMENTAL</div>
                <h2>Trazabilidad del Expediente</h2>
                <p>{modalTrazabilidad.numeroExpediente}</p>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setModalTrazabilidad(null)}
              >
                ×
              </button>
            </div>
            
            <div className="tracking-summary">
              <span>
                <b>Remitente</b>
                {modalTrazabilidad.remitenteNombre}
              </span>
              <span>
                <b>Asunto</b>
                {modalTrazabilidad.asunto}
              </span>
              <span>
                <b>Estado Actual</b>
                <span className={`status-badge ${getStatusBadgeClass(modalTrazabilidad.estado)}`}>
                  {modalTrazabilidad.estado}
                </span>
              </span>
            </div>
            
            <div className="timeline">
              {modalTrazabilidad.historial?.map((mov, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <strong>{mov.accion}</strong>
                      <time>{new Date(mov.fecha).toLocaleString()}</time>
                    </div>
                    <p>
                      {mov.observacion}
                      {mov.areaOrigen && mov.areaDestino && (
                        <span>
                          De: {mov.areaOrigen} → A: {mov.areaDestino}
                        </span>
                      )}
                    </p>
                    <small>
                      <b className="timeline-responsible">Responsable: {mov.responsable}</b>
                      {mov.area && <span> • Área: {mov.area}</span>}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="outline-button tracking-close"
              onClick={() => setModalTrazabilidad(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
