import React, { useState } from 'react';
import { AccionMovimiento } from '../types/expediente';

interface ModalAccionProps {
  accion: AccionMovimiento | 'Anulación' | null;
  onClose: () => void;
  onSubmit: (data: { areaDestino?: string; observacion: string }) => void;
}

export const ModalAccion: React.FC<ModalAccionProps> = ({ accion, onClose, onSubmit }) => {
  const [areaDestino, setAreaDestino] = useState('');
  const [observacion, setObservacion] = useState('');

  if (!accion) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ areaDestino, observacion });
  };

  const titulos: Record<string, string> = {
    'Derivación': 'Derivar Expediente a otra Área',
    'Atención': 'Registrar Atención del Expediente',
    'Archivo': 'Archivar Expediente',
    'Anulación': 'Anular Expediente'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">{titulos[accion] || 'Acción sobre Expediente'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {accion === 'Derivación' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Área de Destino</label>
              <input 
                type="text" 
                value={areaDestino} 
                onChange={(e) => setAreaDestino(e.target.value)} 
                className="w-full border p-2 rounded mt-1" 
                placeholder="Ej. Área Legal, Tesorería..."
                required 
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Motivo / Observación</label>
            <textarea 
              value={observacion} 
              onChange={(e) => setObservacion(e.target.value)} 
              rows={3} 
              className="w-full border p-2 rounded mt-1" 
              placeholder="Detalla el motivo de esta acción..."
              required 
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded text-sm">Cancelar</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
