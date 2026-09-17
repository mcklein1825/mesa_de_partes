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
  AreaOperativa: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: true, puedeArchivar: false, puedeEditar: false, puedeVerReportes: false, puedeVerTodos: false },
  Administrador: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: true, puedeArchivar: true, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  Auditor: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: false, puedeArchivar: false, puedeEditar: false, puedeVerReportes: true, puedeVerTodos: true }
}

export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['En atención'],
  'En atención': ['Atendido', 'Archivado'],
  'Atendido': ['Archivado'],
  'Archivado': []
}

export const areas = [
  'Unidad Académica', 'Administración', 'Secretaría Académica',
  'Unidad de Bienestar del Estudiante', 'Unidad de Investigación',
  'Unidad de Formación Continua', 'Área de Calidad', 'Electrónica Industrial',
  'Gestión Administrativa', 'Contabilidad', 'Desarrollo de Sistemas de Información',
  'Electricidad', 'Construcción Civil', 'Mecatrónica Automotriz', 'Mecánica de Producción'
]

export const AREA_RESPONSABLES: Record<string, string> = {
  'Unidad Académica': 'Ing. NÓSSER JURADO GUILLÉN',
  'Administración': 'CPC MARICELA OLIVARES MANDUJANO',
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