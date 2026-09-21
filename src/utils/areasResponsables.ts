export type AreaResponsable = {
  area: string
  responsable: string
  cargo: string
}

export const AREAS_RESPONSABLES: AreaResponsable[] = [
  {
    area: 'Unidad Académica',
    responsable: 'Ing. Nósser Jurado Guillén',
    cargo: 'Jefe de Unidad Académica'
  },
  {
    area: 'Administración',
    responsable: 'CPC Maricela Olivares Mandujano',
    cargo: 'Jefe de Administración'
  },
  {
    area: 'Área de Calidad',
    responsable: 'Ing. José Gutiérrez Barahona',
    cargo: 'Coord. Área de Calidad'
  },
  {
    area: 'Secretaría Académica',
    responsable: 'Ing. Amadeo Antonio Pazsolán',
    cargo: 'Jefe Sec. Académica'
  },
  {
    area: 'Unidad Bienestar de E.',
    responsable: 'Mag. José Luis Razo Quispe',
    cargo: 'Jefe Unidad Bienestar de E.'
  },
  {
    area: 'Unidad de Investigación',
    responsable: 'Lic. Luis Ramírez Chuquihuanga',
    cargo: 'Jefe Unid. Investigación'
  },
  {
    area: 'Unidad de Formación Continua',
    responsable: 'Lic. Teodoro Pillaca Díaz',
    cargo: 'Jefe de Unid. Form. Continua'
  },
  {
    area: 'Electrónica Industrial',
    responsable: 'Ing. Luis Alberto Rojas Cahua',
    cargo: 'Coord. Electrónica Industrial'
  },
  {
    area: 'Gestión Administrativa',
    responsable: 'Dr. Sidney Lucas Tamayo',
    cargo: 'Coord. Gestión Administrativa'
  },
  {
    area: 'Contabilidad',
    responsable: 'CPC Domenica Quispe Díaz',
    cargo: 'Coord. Contabilidad'
  },
  {
    area: 'Desarrollo de Sistemas de Información',
    responsable: 'Ing. Benjamín Huanca Pachauri',
    cargo: 'Coord. Desarrollo Sist. Inf.'
  },
  {
    area: 'Electricidad',
    responsable: 'Lic. Luis Carhuancho Palomino',
    cargo: 'Coord. Electricidad'
  },
  {
    area: 'Construcción Civil',
    responsable: 'Arq. Virginia Azahuanche Asmat',
    cargo: 'Coord. Const. Civil'
  },
  {
    area: 'Mecatrónica Automotriz',
    responsable: 'Mag. Jim Palomares Anselmo',
    cargo: 'Coord. Mecatrónica Autom.'
  },
  {
    area: 'Mecánica de Producción',
    responsable: 'Lic. Rigoberto Huaracha Casas',
    cargo: 'Coord. Mec. de Producción'
  }
]

export const obtenerResponsablePorArea = (
  area: string
): AreaResponsable | undefined => {
  const areaNormalizada = area.trim().toLowerCase()

  return AREAS_RESPONSABLES.find(
    item => item.area.trim().toLowerCase() === areaNormalizada
  )
}