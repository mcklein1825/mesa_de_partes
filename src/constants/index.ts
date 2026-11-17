import { Role, Status } from '../types'

export const ROLE_PERMISSIONS: Record<Role, {
  puedeRegistrar: boolean
  puedeDerivar: boolean
  puedeAtender: boolean
  puedeArchivar: boolean
  puedeEditar: boolean
  puedeVerReportes: boolean
  puedeVerTodos: boolean
}> = {
  DireccionGeneral: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: true, puedeArchivar: true, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  AreaOperativa: { puedeRegistrar: true, puedeDerivar: false, puedeAtender: true, puedeArchivar: false, puedeEditar: false, puedeVerReportes: false, puedeVerTodos: false },
  Administrador: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: true, puedeArchivar: true, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  Auditor: { puedeRegistrar: true, puedeDerivar: false, puedeAtender: false, puedeArchivar: false, puedeEditar: false, puedeVerReportes: true, puedeVerTodos: true }
}

export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['Sin respuesta', 'Atendido'],
  'Sin respuesta': ['Atendido', 'Archivado'],
  'Atendido': [],
  'Archivado': []
}

export const areas = [
  'Unidad Académica',
  'Administración',
  'Administración / Tesorería',
  'Administración / Área de Personal',
  'Administración / Patrimonio',
  'Administración / Logística',
  'Secretaría Académica',
  'Unidad de Bienestar Estudiantil',
  'Unidad de Investigación',
  'Unidad de Formación Continua',
  'Área de Calidad',
  'Dirección General',
  'Electrónica Industrial',
  'Gestión Administrativa',
  'Contabilidad',
  'Desarrollo de Sistemas de Información',
  'Electricidad',
  'Construcción Civil',
  'Mecatrónica Automotriz',
  'Mecánica de Producción',
  'Dirección General'
]

// Áreas, jefes y subáreas: se administran desde la pantalla "Jefaturas" (tabla
// `areas_responsables` en Supabase). Los valores iniciales están en ./areasDefaults.
import {
  getAreaDestinoOptions,
  getAreaCopia,
  getAreaResponsable,
  getAreasPrincipales,
  getSubareas,
  useAreasCatalog
} from './areasCatalog'

export {
  getAreaDestinoOptions,
  getAreaCopia,
  getAreaResponsable,
  getAreasPrincipales,
  getSubareas,
  useAreasCatalog
}

/** Áreas "históricas" (`areas`) más las áreas y subáreas vigentes del catálogo, sin repetir. */
export const getAreasUnicas = (): string[] => {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
  const vistas = new Set<string>()
  return [...areas, ...getAreaDestinoOptions()]
    .map(area => area.trim())
    .filter(area => {
      const key = normalize(area)
      if (!key || vistas.has(key)) return false
      vistas.add(key)
      return true
    })
}

export type MemorandoMultipleDestinatarioOption = {
  categoria: 'Área / Jefatura' | 'Consejo Directivo' | 'Comité' | 'Grupo institucional'
  nombre: string
}

const MEMORANDOS_MULTIPLES_OTROS_DESTINATARIOS: MemorandoMultipleDestinatarioOption[] = [
  { categoria: 'Consejo Directivo', nombre: 'Consejo Directivo' },
  { categoria: 'Comité', nombre: 'Comité de Gestión' },
  { categoria: 'Comité', nombre: 'Comité de Intervención frente al Hostigamiento Sexual' },
  { categoria: 'Comité', nombre: 'Comité de Hostigamiento' },
  { categoria: 'Comité', nombre: 'Comité de Evaluación' },
  { categoria: 'Grupo institucional', nombre: 'Coordinadores de Electricidad y Electrónica' },
  { categoria: 'Grupo institucional', nombre: 'Docentes firmantes' },
  { categoria: 'Grupo institucional', nombre: 'Docentes de Contabilidad' },
  { categoria: 'Grupo institucional', nombre: 'Todo el personal docente y administrativo' },
  { categoria: 'Grupo institucional', nombre: 'Delegados' },
  { categoria: 'Grupo institucional', nombre: 'Docentes nombrados y contratados' },
  { categoria: 'Grupo institucional', nombre: 'Jefes' }
]

export const getMemorandosMultiplesDestinatarios = (): MemorandoMultipleDestinatarioOption[] => [
  ...getAreaDestinoOptions().map(nombre => ({ categoria: 'Área / Jefatura' as const, nombre })),
  ...MEMORANDOS_MULTIPLES_OTROS_DESTINATARIOS
]
