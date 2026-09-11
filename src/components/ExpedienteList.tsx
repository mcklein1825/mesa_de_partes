import React from 'react';
import { Expediente } from '../types/expediente';

interface ExpedienteListProps {
  expedientes: Expediente[];
  onSelect: (exp: Expediente) => void;
}

export const ExpedienteList: React.FC<ExpedienteListProps> = ({ expedientes, onSelect }) => {
  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-3">ID</th>
            <th className="p-3">Remitente</th>
            <th className="p-3">Asunto</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {expedientes.map(exp => (
            <tr key={exp.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-mono text-sm">{exp.id}</td>
              <td className="p-3">{exp.remitente}</td>
              <td className="p-3">{exp.asunto}</td>
              <td className="p-3">
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  {exp.estado || 'Pendiente'}
                </span>
              </td>
              <td className="p-3">
                <button 
                  onClick={() => onSelect(exp)} 
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver detalles
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
