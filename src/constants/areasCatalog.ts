import { useSyncExternalStore } from 'react'
import {
  DEFAULT_AREA_RESPONSABLES,
  DEFAULT_SUBAREAS,
  LEGACY_AREA_ALIASES
} from './areasDefaults'

/**
 * Catálogo de áreas, jefes y subáreas.
 *
 * Los datos viven en la tabla `areas_responsables` de Supabase (se editan en la pantalla
 * "Jefaturas"). Este módulo los guarda en memoria para que el resto de la app pueda
 * consultarlos con funciones síncronas (getAreaResponsable, getSubareas, ...).
 * Mientras no se hayan cargado, usa los valores iniciales de `areasDefaults.ts`.
 */

export type AreaResponsableRow = {
  id: number
  area: string
  /** null = fila de un área principal; con valor = fila de una subárea */
  subarea: string | null
  /** Jefe del área, o persona que recibe la copia en el caso de una subárea */
  responsable: string
  actualizadoEn: string | null
}

export type AreasCatalog = {
  /** true cuando los datos vienen de Supabase; false mientras se usan los valores iniciales */
  loaded: boolean
  rows: AreaResponsableRow[]
  /** área -> jefe, en el orden de la lista */
  responsables: Record<string, string>
  /** clave normalizada del área -> subáreas */
  subareasPorArea: Record<string, string[]>
  /** clave normalizada "área|subárea" -> persona en copia */
  copias: Record<string, string>
}

export const normalizeAreaText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

const copiaKey = (area: string, subarea: string) =>
  `${normalizeAreaText(area)}|${normalizeAreaText(subarea)}`

type AreaEntry = { area: string; responsable: string }
type SubareaEntry = { area: string; subarea: string; responsable: string }

const buildCatalog = (
  areaEntries: AreaEntry[],
  subareaEntries: SubareaEntry[],
  rows: AreaResponsableRow[],
  loaded: boolean
): AreasCatalog => {
  const responsables: Record<string, string> = {}
  const subareasPorArea: Record<string, string[]> = {}
  const copias: Record<string, string> = {}

  areaEntries.forEach(({ area, responsable }) => {
    responsables[area] = responsable
  })
  subareaEntries.forEach(({ area, subarea, responsable }) => {
    const key = normalizeAreaText(area)
    subareasPorArea[key] = [...(subareasPorArea[key] ?? []), subarea]
    copias[copiaKey(area, subarea)] = responsable
  })

  return { loaded, rows, responsables, subareasPorArea, copias }
}

const buildDefaultCatalog = (): AreasCatalog =>
  buildCatalog(
    Object.entries(DEFAULT_AREA_RESPONSABLES).map(([area, responsable]) => ({ area, responsable })),
    Object.entries(DEFAULT_SUBAREAS).flatMap(([area, subareas]) =>
      Object.entries(subareas).map(([subarea, responsable]) => ({ area, subarea, responsable }))
    ),
    [],
    false
  )

const buildCatalogFromRows = (rows: AreaResponsableRow[]): AreasCatalog =>
  buildCatalog(
    rows.filter(row => !row.subarea).map(({ area, responsable }) => ({ area, responsable })),
    rows
      .filter(row => row.subarea)
      .map(({ area, subarea, responsable }) => ({ area, subarea: subarea as string, responsable })),
    rows,
    true
  )

let snapshot: AreasCatalog = buildDefaultCatalog()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(listener => listener())

export const setAreasCatalog = (rows: AreaResponsableRow[]) => {
  snapshot = buildCatalogFromRows(rows)
  emit()
}

/** Vuelve a los valores iniciales (por ejemplo, al cerrar sesión). */
export const resetAreasCatalog = () => {
  if (!snapshot.loaded) return
  snapshot = buildDefaultCatalog()
  emit()
}

export const getAreasCatalog = (): AreasCatalog => snapshot

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Hook para componentes que muestran datos del catálogo: se vuelven a dibujar cuando cambia.
 * El valor devuelto también sirve como dependencia de useMemo/useEffect.
 */
export const useAreasCatalog = (): AreasCatalog =>
  useSyncExternalStore(subscribe, getAreasCatalog, getAreasCatalog)

const areaBase = (area: string) => area.split(' / ')[0].trim()

/** Nombre vigente de un área: acepta también nombres antiguos de documentos ya emitidos. */
const resolveAreaKey = (area: string): string[] => {
  const wanted = normalizeAreaText(areaBase(area))
  const alias = LEGACY_AREA_ALIASES[wanted]
  return alias ? [wanted, alias] : [wanted]
}

export const getAreaResponsable = (area: string): string => {
  if (!area) return ''
  const candidates = resolveAreaKey(area)
  const found = Object.keys(snapshot.responsables).find(registrada =>
    candidates.includes(normalizeAreaText(registrada))
  )
  return found ? snapshot.responsables[found] : ''
}

export const getSubareas = (area: string): string[] => {
  if (!area) return []
  for (const candidate of resolveAreaKey(area)) {
    const subareas = snapshot.subareasPorArea[candidate]
    if (subareas) return subareas
  }
  return []
}

export const getAreaCopia = (area: string): string => {
  if (!area) return ''
  const subarea = area.split(' / ')[1]?.trim()
  if (!subarea) return ''
  for (const candidate of resolveAreaKey(area)) {
    const copia = snapshot.copias[copiaKey(candidate, subarea)]
    if (copia) return copia
  }
  return ''
}

/** Áreas principales, en el orden de la lista. */
export const getAreasPrincipales = (): string[] => Object.keys(snapshot.responsables)

/** Áreas principales y sus subáreas ("Administración / Tesorería"). */
export const getAreaDestinoOptions = (): string[] =>
  getAreasPrincipales().flatMap(area => [
    area,
    ...getSubareas(area).map(subarea => `${area} / ${subarea}`)
  ])
