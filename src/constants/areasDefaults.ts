/**
 * Valores iniciales de áreas, jefes y subáreas.
 *
 * Son solo el respaldo: la fuente de verdad es la tabla `areas_responsables` de Supabase,
 * que se edita desde la pantalla "Jefaturas". Estos datos se usan únicamente si esa tabla
 * todavía no existe o no se pudo leer, y como valores iniciales del parche SQL
 * `supabase/patches/20261112_areas_responsables.sql`.
 */

export const DEFAULT_AREA_RESPONSABLES: Record<string, string> = {
  'Unidad Académica': 'Ing. NÓSSER JURADO GUILLÉN',
  'Administración': 'CPC MARICELA OLIVARES MANDUJANO',
  'Dirección General': 'Pilar de la Cruz',
  'Secretaría Académica': 'Ing. AMADEO ANTONIO PAZSOLÁN',
  'Unidad de Bienestar Estudiantil': 'Mag. JOSÉ LUIS RAZO QUISPE',
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

/** Subáreas de cada área, con la persona a quien se envía copia. */
export const DEFAULT_SUBAREAS: Record<string, Record<string, string>> = {
  'Administración': {
    'Tesorería': 'Celio Verde Marcelino',
    'Área de Personal': 'Julio García de la Chira',
    'Patrimonio': 'Willy Quintana',
    'Logística': 'Noa Wilfredo'
  }
}

/**
 * Nombres antiguos que aún pueden estar guardados en documentos ya emitidos,
 * asociados al nombre vigente. Clave y valor en minúsculas y sin tildes.
 */
export const LEGACY_AREA_ALIASES: Record<string, string> = {
  'unidad de bienestar del estudiante': 'unidad de bienestar estudiantil'
}
