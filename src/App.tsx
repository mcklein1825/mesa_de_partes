import React, { useEffect, useState } from 'react';
import { expedientesService } from './services/expedientesService';
import { ExpedienteList } from './components/ExpedienteList';
import { ExpedienteForm } from './components/ExpedienteForm';
import { ModalTrazabilidad } from './components/ModalTrazabilidad';
import { ModalAccion } from './components/ModalAccion';
import { Expediente, AccionMovimiento } from './types/expediente';

export default function App() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'reportes'>('list');
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);
  const [modalAccionType, setModalAccionType] = useState<AccionMovimiento | 'Anulación' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const currentUser = { nombre: 'Administrador Sistema' };

  useEffect(() => {
    cargarExpedientes();
  }, []);

  const cargarExpedientes = async () => {
    const data = await expedientesService.getAll();
    if (data) setExpedientes(data);
  };

  const handleCreate = async (formData: any) => {
    setIsSaving(true);
    try {
      const nuevo = {
        id: `EXP-${Date.now()}`,
        ...formData,
        usuarioRegistro: currentUser.nombre
      };
      const res = await expedientesService.create(nuevo);
      if (res) {
        setExpedientes(prev => [res, ...prev]);
        setCurrentView('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const ejecutarAccion = async (data: { areaDestino?: string; observacion: string }) => {
    if (!selectedExpediente || !modalAccionType) return;
    let actualizado: Expediente | null = null;

    if (modalAccionType === 'Derivación' && data.areaDestino) {
      actualizado = await expedientesService.derivar(selectedExpediente.id, data.areaDestino, currentUser.nombre, data.observacion);
    } else if (modalAccionType === 'Atención') {
      actualizado = await expedientesService.atender(selectedExpediente.id, currentUser.nombre, data.observacion);
    } else if (modalAccionType === 'Archivo') {
      actualizado = await expedientesService.archivar(selectedExpediente.id, currentUser.nombre, data.observacion);
    } else if (modalAccionType === 'Anulación') {
      actualizado = await expedientesService.anular(selectedExpediente.id, currentUser.nombre, data.observacion);
    }

    if (actualizado) {
      setExpedientes(prev => prev.map(e => e.id === actualizado!.id ? actualizado! : e));
      setSelectedExpediente(actualizado);
      setModalAccionType(null);
    }
  };

  return (
    <div className="app-shell flex min-h-screen bg-gray-50">
      <aside className="sidebar w-64 bg-slate-900 text-slate-200 flex flex-col p-6 shrink-0">
        <div className="brand flex items-center gap-3 mb-8">
          <div className="brand-mark w-9 h-9 rounded-lg bg-teal-500 grid place-items-center font-bold text-white">TD</div>
          <div>
            <strong className="text-white text-sm block">Trámite Documentario</strong>
            <span className="text-xs text-slate-400">Mesa de Partes</span>
          </div>
        </div>

        <div className="menu-label text-[10px] tracking-wider text-slate-400 font-bold mb-3 uppercase">Menú Principal</div>
        <nav className="nav-menu flex flex-col gap-1">
          <button 
            onClick={() => setCurrentView('list')}
            className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'list' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <span className="nav-icon">📁</span> Expedientes
          </button>
          <button 
            onClick={() => setCurrentView('form')}
            className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'form' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <span className="nav-icon">➕</span> Nuevo Expediente
          </button>
          <button 
            onClick={() => setCurrentView('reportes')}
            className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'reportes' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <span className="nav-icon">📊</span> Reportes y Estadísticas
          </button>
        </nav>

        <div className="sidebar-footer mt-auto pt-6 border-t border-slate-800">
          <div className="user-mini flex items-center gap-3">
            <div className="avatar w-8 h-8 rounded-full bg-amber-500 text-slate-900 grid place-items-center font-bold text-xs">AS</div>
            <div>
              <b className="text-xs text-white block">{currentUser.nombre}</b>
              <small className="text-[10px] text-slate-400 block">Administrador</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content flex-1 min-w-0 flex flex-col">
        <header className="topbar h-20 border-b border-gray-200 bg-white flex items-center justify-between px-8">
          <div className="breadcrumbs flex items-center gap-2 text-sm text-gray-500">
            <span>Sistema</span>
            <b>/</b>
            <strong className="text-gray-800 font-semibold">
              {currentView === 'list' && 'Gestión de Expedientes'}
              {currentView === 'form' && 'Registro de Nuevo Expediente'}
              {currentView === 'reportes' && 'Reportes del Sistema'}
            </strong>
          </div>
          <div className="top-actions flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Usuario: {currentUser.nombre}</span>
          </div>
        </header>

        <div className="page p-8 max-w-7xl mx-auto w-full flex-1">
          {currentView === 'list' && (
            <ExpedienteList 
              expedientes={expedientes} 
              onSelect={(exp: Expediente) => setSelectedExpediente(exp)} 
              onNew={() => setCurrentView('form')} 
            />
          )}

          {currentView === 'form' && (
            <ExpedienteForm 
              onSubmit={handleCreate} 
              onCancel={() => setCurrentView('list')} 
              isSaving={isSaving} 
            />
          )}

          {currentView === 'reportes' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Reportes y Estadísticas del Sistema</h2>
                <p className="text-sm text-gray-500 mt-1">Resumen general del flujo documental y estado de expedientes.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <span className="text-xs font-bold text-blue-600 uppercase">Total Expedientes</span>
                  <h3 className="text-2xl font-extrabold text-blue-900 mt-2">{expedientes.length}</h3>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Atendidos / Finalizados</span>
                  <h3 className="text-2xl font-extrabold text-emerald-900 mt-2">
                    {expedientes.filter(e => e.estado === 'Atendido' || e.estado === 'Archivado').length}
                  </h3>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-5">
                  <span className="text-xs font-bold text-amber-600 uppercase">En Trámite / Pendientes</span>
                  <h3 className="text-2xl font-extrabold text-amber-900 mt-2">
                    {expedientes.filter(e => e.estado !== 'Atendido' && e.estado !== 'Archivado').length}
                  </h3>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setCurrentView('list')} 
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  Volver al listado
                </button>
              </div>
            </div>
          )}

          {selectedExpediente && (
            <ModalTrazabilidad 
              expediente={selectedExpediente} 
              onClose={() => setSelectedExpediente(null)} 
              onOpenAction={(accion: AccionMovimiento | 'Anulación') => setModalAccionType(accion)} 
            />
          )}

          {modalAccionType && (
            <ModalAccion 
              accion={modalAccionType} 
              onClose={() => setModalAccionType(null)} 
              onSubmit={ejecutarAccion} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
