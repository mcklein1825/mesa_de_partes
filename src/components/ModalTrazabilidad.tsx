import React from 'react';
import { Expediente, AccionMovimiento } from '../types/expediente';

interface ModalTrazabilidadProps {
  expediente: Expediente;
  onClose: () => void;
  onOpenAction: (accion: AccionMovimiento | 'Anulación') => void;
}

export const ModalTrazabilidad: React.FC<ModalTrazabilidadProps> = ({ expediente, onClose, onOpenAction }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">Expediente: {expediente.id}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">×</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">Remitente:</span> {expediente.remitente}</div>
            <div><span className="font-semibold">Tipo:</span> {expediente.tipo}</div>
            <div><span className="font-semibold">Estado:</span> {expediente.estado}</div>
            <div><span className="font-semibold">Área Actual:</span> {expediente.areaDestino || expediente.area || 'Mesa de Partes'}</div>
            <div className="col-span-2"><span className="font-semibold">Asunto:</span> {expediente.asunto}</div>
            <div className="col-span-2"><span className="font-semibold">Contenido:</span> {expediente.contenido || 'Sin contenido adicional'}</div>
          </div>

          <div>
            <h4 className="font-bold text-gray-700 mb-2">Historial de Trazabilidad</h4>
            <div className="border-l-2 border-blue-500 pl-4 space-y-4">
              {(!expediente.historial || expediente.historial.length === 0) ? (
                <p className="text-sm text-gray-500">Sin movimientos registrados aún.</p>
              ) : (
                expediente.historial.map((h, index) => (
                  <div key={index} className="text-sm space-y-1">
                    <div className="font-semibold text-blue-600">{h.accion} {h.areaDestino ? `➔ ${h.areaDestino}` : ''}</div>
                    <div className="text-gray-600">{h.observacion}</div>
                    <div className="text-xs text-gray-400">{new Date(h.fechaHora || Date.now()).toLocaleString()} por {h.responsable}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={() => onOpenAction('Derivación')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700">Derivar</button>
            <button onClick={() => onOpenAction('Atención')} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700">Atender</button>
            <button onClick={() => onOpenAction('Archivo')} className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-700">Archivar</button>
            <button onClick={() => onOpenAction('Anulación')} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700">Anular</button>
          </div>
          <button onClick={onClose} className="border border-gray-300 px-4 py-1.5 rounded text-sm hover:bg-gray-100">Cerrar</button>
        </div>
      </div>
    </div>
  );
};
