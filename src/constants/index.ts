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
   MesaPartes: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: false, puedeArchivar: false, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
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
  'Mesa de Partes',
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

export const AREAS_UNICAS = Array.from(
  new Set(
    areas
      .map(area => area.trim())
      .filter(Boolean)
  )
)
export const SUBAREAS_POR_AREA: Record<string, string[]> = {
  'Administración': [
    'Tesorería',
    'Área de Personal',
    'Patrimonio',
    'Logística'
  ]
}

export const getSubareas = (area: string): string[] => {
  return SUBAREAS_POR_AREA[area] || []
}

export const AREA_RESPONSABLES: Record<string, string> = {
  'Unidad Académica': 'Ing. NÓSSER JURADO GUILLÉN',
  'Administración': 'CPC MARICELA OLIVARES MANDUJANO',
  'Mesa de Partes': 'Pilar de la Cruz',
  'Secretaría Académica': 'Ing. AMADEO ANTONIO PAZSOLÁN',
  'Unidad de Bienestar del Estudiante': 'Mag. JOSÉ LUIS RAZO QUISPE',
  'Unidad de Investigación': 'Lic. LUIS RAMÍREZ CHUQUIHUANGA',
  'Unidad de Formación Continua': 'Lic. TEODORO PILLACA DÍAZ',
  'Área de Calidad': 'Ing. JOSÉ GUTIÉRREZ BARAHONA',
  'Electrónica Industrial': 'Ing. LUIS ALBERTO ROJAS CAHUA',
  'Gestión Administrativa': 'Dr. SIDNEY LUCAS TAMAYO',
  'Contabilidad': 'CPC DOMENICA QUISPE DIAZ',
  'Desarrollo de Sistemas de Información': 'Ing. BENJAMÍN HUANCA PACHAURI',
  'Electricidad': 'Lic. LUIS CARHUANCHO PALOMINO',
  'Construcción Civil': 'Arq. VIRGINIA AZAHUANCHE ASMAT',
  'Mecatrónica Automotriz': 'Mag. JIM PALOMARES ANSELMO',
  'Mecánica de Producción': 'Lic. RIGOBERTO HUARACHA CASAS'
}

export const AREA_COPIAS: Record<string, string> = {
  Tesorería: 'Celio Verde Marcelino',
  'Área de Personal': 'Julio García de la Chira',
  Patrimonio: 'Willy Quintana',
  Logística: 'Noa Wilfredo'
}

export const AREA_DESTINO_OPTIONS = Object.keys(AREA_RESPONSABLES).flatMap(
  area => [
    area,
    ...getSubareas(area).map(subarea => `${area} / ${subarea}`)
  ]
)

export const getAreaResponsable = (area: string): string => {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const areaBase = area.split(' / ')[0].trim()
  const areaEncontrada = Object.keys(AREA_RESPONSABLES).find(
    registrada => normalize(registrada) === normalize(areaBase)
  )

  return areaEncontrada ? AREA_RESPONSABLES[areaEncontrada] : ''
}

export const getAreaCopia = (area: string): string => {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const subarea = area.split(' / ')[1]?.trim()
  if (!subarea) return ''

  const subareaEncontrada = Object.keys(AREA_COPIAS).find(
    registrada => normalize(registrada) === normalize(subarea)
  )

  return subareaEncontrada ? AREA_COPIAS[subareaEncontrada] : ''
}

export const MEMORANDOS_MULTIPLES_DESTINATARIOS: Array<{
  categoria: 'Área / Jefatura' | 'Consejo Directivo' | 'Comité' | 'Grupo institucional'
  nombre: string
}> = [
  ...AREA_DESTINO_OPTIONS.map(nombre => ({ categoria: 'Área / Jefatura' as const, nombre })),
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