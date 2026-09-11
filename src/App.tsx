import React, { useEffect, useState } from 'react';
import { expedientesService } from './services/expedientesService';
import { ExpedienteList } from './components/ExpedienteList';
import { ExpedienteForm } from './components/ExpedienteForm';
import { ModalTrazabilidad } from './components/ModalTrazabilidad';
import { ModalAccion } from './components/ModalAccion';
import { Expediente, AccionMovimiento } from './types/expediente';

export default function App() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
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
    <div className="portal-shell">
      <header className="topbar">
        <h1 className="text-xl font-bold text-gray-800">Sistema de Trámite Documentario</h1>
        <span className="text-sm text-gray-500">Usuario: {currentUser.nombre}</span>
      </header>

      <main className="page space-y-6">
        {currentView === 'list' ? (
          <ExpedienteList 
            expedientes={expedientes} 
            onSelect={(exp: Expediente) => setSelectedExpediente(exp)} 
            onNew={() => setCurrentView('form')} 
          />
        ) : (
          <ExpedienteForm 
            onSubmit={handleCreate} 
            onCancel={() => setCurrentView('list')} 
            isSaving={isSaving} 
          />
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
      </main>
    </div>
  );
}
