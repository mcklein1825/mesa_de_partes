import { useState, FormEvent } from 'react';
import { User, Role, areas } from '../App';

interface UserSelectModalProps {
  onSelectUser: (user: User) => void;
}

export default function UserSelectModal({ onSelectUser }: UserSelectModalProps) {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mesa-partes-users-list');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignorar error */ }
    }
    // Usuarios por defecto si no hay ninguno guardado
    return [
      { id: 'USR-001', nombre: 'Lucía Ramírez', email: 'lucia.ramirez@institucion.gob.pe', rol: 'MesaPartes', area: 'Mesa de Partes', activo: true },
      { id: 'USR-002', nombre: 'Carlos Mendoza', email: 'carlos.mendoza@institucion.gob.pe', rol: 'AreaOperativa', area: 'Dirección General', activo: true },
      { id: 'USR-003', nombre: 'Ana Torres', email: 'ana.torres@institucion.gob.pe', rol: 'Administrador', area: 'Administración', activo: true }
    ];
  });

  const [showCreate, setShowCreate] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState<Role>('MesaPartes');
  const [nuevaArea, setNuevaArea] = useState('Mesa de Partes');

  const handleSelect = (user: User) => {
    localStorage.setItem('mesa-partes-user', JSON.stringify(user));
    onSelectUser(user);
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    const newUser: User = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      nombre: nuevoNombre.trim(),
      email: `${nuevoNombre.toLowerCase().replace(/\s+/g, '.')}@institucion.gob.pe`,
      rol: nuevoRol,
      area: nuevaArea,
      activo: true
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('mesa-partes-users-list', JSON.stringify(updatedUsers));
    
    // Autologuear al usuario recién creado
    handleSelect(newUser);
  };

  return (
    <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '450px', padding: '32px', margin: '20px' }}>
        
        {!showCreate ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div className="brand-mark" style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', fontSize: '24px' }}>MP</div>
              <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Mesa de Partes Virtual</h2>
              <p className="muted" style={{ margin: 0 }}>Seleccione su usuario para iniciar jornada</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#0284c7'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div className="avatar">{u.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ display: 'block', color: '#1e293b', fontSize: '15px' }}>{u.nombre}</b>
                    <small style={{ color: '#64748b' }}>{u.area} • {u.rol}</small>
                  </div>
                  <span style={{ color: '#0284c7', fontWeight: 'bold' }}>→</span>
                </button>
              ))}
            </div>

            <button className="outline-button" style={{ width: '100%' }} onClick={() => setShowCreate(true)}>
              ＋ Registrar nuevo usuario
            </button>
          </>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Nuevo Usuario</h2>
              <p className="muted" style={{ margin: 0 }}>Registre los datos del trabajador</p>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Nombre y Apellidos
              <input 
                type="text" 
                required 
                placeholder="Ej. Juan Pérez" 
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Área Asignada
              <select 
                value={nuevaArea} 
                onChange={(e) => setNuevaArea(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="Mesa de Partes">Mesa de Partes</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Rol del sistema
              <select 
                value={nuevoRol} 
                onChange={(e) => setNuevoRol(e.target.value as Role)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="MesaPartes">Mesa de Partes</option>
                <option value="AreaOperativa">Área Operativa</option>
                <option value="Administrador">Administrador</option>
                <option value="Auditor">Auditor</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" className="legacy-light-button" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" style={{ flex: 1 }}>
                Guardar e Ingresar
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
