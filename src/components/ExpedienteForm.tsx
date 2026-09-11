import React, { useState } from 'react';

interface ExpedienteFormProps {
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const ExpedienteForm: React.FC<ExpedienteFormProps> = ({ onSubmit, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    remitente: '',
    tipo: 'Oficio',
    asunto: '',
    contenido: '',
    areaDestino: 'Mesa de Partes'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Registrar Nuevo Expediente</h2>
      <div>
        <label className="block text-sm font-medium">Remitente</label>
        <input 
          type="text" 
          name="remitente" 
          value={formData.remitente} 
          onChange={handleChange} 
          className="w-full border p-2 rounded" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Asunto</label>
        <input 
          type="text" 
          name="asunto" 
          value={formData.asunto} 
          onChange={handleChange} 
          className="w-full border p-2 rounded" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Contenido</label>
        <textarea 
          name="contenido" 
          value={formData.contenido} 
          onChange={handleChange} 
          className="w-full border p-2 rounded" 
        />
      </div>
      <div className="flex space-x-2">
        <button 
          type="submit" 
          disabled={isSaving} 
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {isSaving ? 'Guardando...' : 'Guardar Expediente'}
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
