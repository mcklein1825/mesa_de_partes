import React, { useState } from 'react';
import { Expediente } from '../types/expediente';

interface ExpedienteListProps {
  expedientes: Expediente[];
  onSelect: (exp: Expediente) => void;
  onNew: () => void;
}

export const ExpedienteList: React.FC<ExpedienteListProps> = ({ expedientes, onSelect, onNew }) => {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');

  const filtered = expedientes.filter(exp => {
    const matchSearch = exp.asunto?.toLowerCase().includes(search.toLowerCase()) || 
                        exp.remitente?.toLowerCase().includes(search.toLowerCase()) ||
                        exp.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'Todos' || exp.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <input 
          type="text" 
          placeholder="Buscar por ID, remitente o asunto..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-1 bg-white"
        />
        <div className="flex gap-2 items-center">
          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border p-2 rounded bg-white"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En atención">En atención</option>
            <option value="Atendido">Atendido</option>
            <option value="Archivado">Archivado</option>
            <option value="Anulado">Anulado</option>
          </select>
          <button 
            onClick={onNew} 
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            Nuevo Expediente
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b text-sm text-gray-600">
              <th className="p-3">ID</th>
              <th className="p-3">Remitente</th>
              <th className="p-3">Asunto</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Fecha Ingreso</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">No se encontraron expedientes.</td>
              </tr>
            ) : (
              filtered.map(exp => (
                <tr key={exp.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3 font-mono font-medium">{exp.id}</td>
                  <td className="p-3">{exp.remitente}</td>
                  <td className="p-3 max-w-xs truncate">{exp.asunto}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      exp.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      exp.estado === 'En atención' ? 'bg-blue-100 text-blue-800' :
                      exp.estado === 'Atendido' ? 'bg-green-100 text-green-800' :
                      exp.estado === 'Archivado' ? 'bg-gray-200 text-gray-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {exp.estado || 'Pendiente'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{exp.fechaIngreso ? new Date(exp.fechaIngreso).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => onSelect(exp)} 
                      className="bg-gray-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 text-xs font-medium"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
