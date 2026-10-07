import { useEffect, useState } from 'react';
import { User, Role } from '../types'
import { areas } from '../constants'
import { usuariosService } from '../services/usuarioService';

interface UserSelectModalProps {
  onSelectUser: (user: User) => void;
}

export default function UserSelectModal({
  onSelectUser
}: UserSelectModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState<Role>('MesaPartes');
  const [nuevaArea, setNuevaArea] = useState('Mesa de Partes');

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);

      const usuarios = await usuariosService.getAll();

    setUsers(
      usuarios.map((usuario) => ({
        id: usuario.id,
        nombre: usuario.nombre,
        email: '',
        rol: usuario.rol as Role,
        area: usuario.area,
        secretaria: usuario.secretaria,
        activo: usuario.activo
      }))
    );
    } catch (error) {
      console.error('No se pudieron cargar los usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user: User) => {
    // Solo recuerda el usuario seleccionado en esta computadora.
    // La lista de usuarios viene de Supabase.
    localStorage.setItem(
  'mesa-partes-user',
  JSON.stringify(user)
)

localStorage.setItem(
  'mesa-partes-session-start',
  String(Date.now())
)

    onSelectUser(user);
  };
  const handleDelete = async (user: User) => {
  const confirmar = window.confirm(
    `¿Está seguro de eliminar la cuenta de ${user.nombre}?\n\n` +
    `Esta acción eliminará la cuenta de la lista de usuarios disponibles.`
  )

  if (!confirmar) {
    return
  }

  const eliminado = await usuariosService.delete(user.id)

  if (!eliminado) {
    alert('No se pudo eliminar la cuenta.')
    return
  }

  setUsers(actuales =>
    actuales.filter(actual => actual.id !== user.id)
  )

  const usuarioGuardado = localStorage.getItem('mesa-partes-user')

if (usuarioGuardado) {
  try {
    const guardado = JSON.parse(usuarioGuardado)

    if (guardado?.id === user.id) {
      localStorage.removeItem('mesa-partes-user')
    }
  } catch {
    localStorage.removeItem('mesa-partes-user')
  }
}
}
  const generarIdUsuario = () => {
    const numeros = users
      .map((user) => {
        const match = user.id.match(/^USR-(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((numero) => numero > 0);

    const siguienteNumero =
      numeros.length > 0 ? Math.max(...numeros) + 1 : 1;

    return `USR-${String(siguienteNumero).padStart(3, '0')}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = nuevoNombre.trim();

    if (!nombre) {
      return;
    }

    const nuevoUsuario = {
      id: generarIdUsuario(),
      nombre,
      rol: nuevoRol,
      area: nuevaArea,
      secretaria: 'Dirección General',
      activo: true
    };

    const usuarioCreado = await usuariosService.create(nuevoUsuario);

    if (!usuarioCreado) {
      alert('No se pudo crear el usuario.');
      return;
    }

    const usuarioParaApp: User = {
      id: usuarioCreado.id,
      nombre: usuarioCreado.nombre,
      email: '',
      rol: usuarioCreado.rol as Role,
      area: usuarioCreado.area,
      secretaria: usuarioCreado.secretaria,
      activo: usuarioCreado.activo
    };

    setUsers((actuales) => [...actuales, usuarioParaApp]);

    setNuevoNombre('');
    setNuevoRol('MesaPartes');
    setNuevaArea('Mesa de Partes');
    setShowCreate(false);

    // Entrar automáticamente con el usuario creado
    handleSelect(usuarioParaApp);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9'
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '32px',
          margin: '20px'
        }}
      >
        {!showCreate ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div
                className="brand-mark"
                style={{
                  margin: '0 auto 16px auto',
                  width: '56px',
                  height: '56px',
                  fontSize: '24px'
                }}
              >
                MP
              </div>

              <h2
                style={{
                  margin: '0 0 8px 0',
                  color: '#0f172a'
                }}
              >
                Mesa de Partes Virtual
              </h2>

              <p className="muted" style={{ margin: 0 }}>
                Seleccione su usuario para iniciar jornada
              </p>
            </div>

            {loading ? (
              <p
                style={{
                  textAlign: 'center',
                  color: '#64748b',
                  marginBottom: '24px'
                }}
              >
                Cargando usuarios...
              </p>
            ) : users.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  color: '#64748b',
                  marginBottom: '24px'
                }}
              >
                No hay usuarios registrados.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginBottom: '24px'
                }}
              >
             {users.map((u) => (
  <div
    key={u.id}
    style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      overflow: 'visible'
    }}
  >
    <button
      type="button"
      onClick={() => handleSelect(u)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s'
      }}
    >
      <div className="avatar">
        {u.nombre
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')}
      </div>

      <div style={{ flex: 1 }}>
        <b
          style={{
            display: 'block',
            color: '#0f172a',
            fontSize: '15px'
          }}
        >
          {u.nombre}
        </b>

        <small
          style={{
            display: 'block',
            marginTop: '4px',
            color: '#64748b'
          }}
        >
          {u.area} • {u.rol}
        </small>
      </div>
    </button>

    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        paddingRight: '8px'
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()

          setMenuUsuario(
            menuUsuario === u.id
              ? null
              : u.id
          )
        }}
        title="Opciones"
        style={{
          width: '32px',
          height: '32px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ⋮
      </button>

      {menuUsuario === u.id && (
        <div
          style={{
            position: 'absolute',
            top: '36px',
            right: 0,
            width: '140px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow:
              '0 8px 20px rgba(0,0,0,0.12)',
            zIndex: 20,
            overflow: 'hidden'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMenuUsuario(null)
              alert(
                'La edición de usuarios la agregaremos en el siguiente paso.'
              )
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              backgroundColor: '#fff',
              color: '#334155',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuUsuario(null)
              handleDelete(u)
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#fff',
              color: '#dc2626',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  </div>
))}
              </div>
            )}

            <button
              className="outline-button"
              style={{ width: '100%' }}
              onClick={() => setShowCreate(true)}
            >
              ＋ Registrar nuevo usuario
            </button>
          </>
        ) : (
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <h2
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '20px'
                }}
              >
                Nuevo Usuario
              </h2>

              <p className="muted" style={{ margin: 0 }}>
                Registre los datos del trabajador
              </p>
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Nombre y Apellidos

              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Área Asignada

              <select
                value={nuevaArea}
                onChange={(e) => setNuevaArea(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}
              >
                <option value="Mesa de Partes">
                  Mesa de Partes
                </option>

                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Rol del sistema

              <select
                value={nuevoRol}
                onChange={(e) =>
                  setNuevoRol(e.target.value as Role)
                }
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}
              >
                <option value="MesaPartes">
                  Mesa de Partes
                </option>

                <option value="AreaOperativa">
                  Área Operativa
                </option>

                <option value="Administrador">
                  Administrador
                </option>

                <option value="Auditor">
                  Auditor
                </option>
              </select>
            </label>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '16px'
              }}
            >
              <button
                type="button"
                className="legacy-light-button"
                style={{ flex: 1 }}
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
                style={{ flex: 1 }}
              >
                Guardar e Ingresar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
