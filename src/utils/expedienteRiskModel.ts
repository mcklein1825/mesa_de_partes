import type { Expediente, HistoryEntry } from '../types'
import { getAreaDestino, parseDate } from './expedienteHelpers'

export type DocumentoExpediente = {
  expedienteId: string
  tipoDocumento: 'Memo' | 'Oficio'
}

export type ExpedienteRiskCase = {
  id: string
  nroExp: string
  fechaIngreso?: string
  asunto: string
  area: string
  tipoDocumento: string
  estimatedDays: number
  availableDays: number
  daysRemaining: number
  riskPercentage: number
  deadline: string
}

export type ExpedienteRiskAnalysis = {
  status: 'ready' | 'insufficient-data' | 'underperforming'
  historicalCases: number
  validationCases: number
  meanAbsoluteError: number | null
  baselineMeanAbsoluteError: number | null
  highRiskCases: number
  unscorableCases: number
  predictions: ExpedienteRiskCase[]
}

type TrainingExample = {
  expediente: Expediente
  startDate: Date
  completedDate: Date
  durationDays: number
  area: string
  documentType: string
  receptionChannel: string
}

type ModelContext = {
  areas: string[]
  receptionChannels: string[]
}

const MIN_HISTORICAL_CASES = 50
const MAX_AREA_FEATURES = 10
const MAX_RECEPTION_CHANNEL_FEATURES = 4
const RIDGE_PENALTY = 0.1

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const daysBetween = (start: Date, end: Date) =>
  Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000
  )

const dateOrdinal = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

const documentTypeFor = (
  expedienteId: string,
  documents: DocumentoExpediente[]
) => documents.find(item => item.expedienteId === expedienteId)?.tipoDocumento || 'Expediente'

const receptionChannelFor = (expediente: Expediente) =>
  normalize(expediente.canalRecepcion || expediente.modalidadRecepcion || '') ||
  'no especificado'

const logCountFeature = (value: number | undefined) => {
  const count = Number(value)
  return Number.isFinite(count) ? Math.log1p(Math.max(0, count)) : 0
}

const isRealCompletionEntry = (entry: HistoryEntry) => {
  const action = normalize(entry.accion)
  const observation = normalize(entry.observacion)
  const isCompletion = /^(atendido|atendida|archivado|archivada)\b/.test(action)
  const isGeneratedPlaceholder =
    observation.startsWith('la oficina responsable registro la atencion del expediente') ||
    observation.startsWith('expediente archivado luego de su atencion')

  return isCompletion && !isGeneratedPlaceholder
}

const getCompletionDate = (expediente: Expediente, startDate: Date) => {
  const completedEntries = (expediente.historial || [])
    .filter(isRealCompletionEntry)
    .map(entry => ({
      entry,
      date: parseDate(entry.fechaHora || entry.fechaSalida || '')
    }))
    .filter(
      (item): item is { entry: HistoryEntry; date: Date } =>
        item.date !== null && dateOrdinal(item.date) >= dateOrdinal(startDate)
    )
    .sort((left, right) => dateOrdinal(left.date) - dateOrdinal(right.date))

  return completedEntries[completedEntries.length - 1]?.date || null
}

const getTrainingExamples = (
  expedientes: Expediente[],
  documents: DocumentoExpediente[],
  today: Date
): TrainingExample[] =>
  expedientes.flatMap(expediente => {
    if (
      expediente.esDuplicado ||
      (expediente.estado !== 'Atendido' && expediente.estado !== 'Archivado')
    ) {
      return []
    }

    const startDate = parseDate(expediente.fechaHoraRecepcion || expediente.fechaIngreso || '')
    if (!startDate) return []

    const completedDate = getCompletionDate(expediente, startDate)
    if (!completedDate || dateOrdinal(completedDate) > dateOrdinal(today)) return []

    const durationDays = daysBetween(startDate, completedDate)
    if (durationDays < 0 || durationDays > 3650) return []

    return [{
      expediente,
      startDate,
      completedDate,
      durationDays,
      area: getAreaDestino(expediente),
      documentType: documentTypeFor(expediente.id, documents),
      receptionChannel: receptionChannelFor(expediente)
    }]
  }).sort((left, right) => dateOrdinal(left.startDate) - dateOrdinal(right.startDate))

const createModelContext = (examples: TrainingExample[]): ModelContext => {
  const areaCounts = new Map<string, number>()
  const receptionChannelCounts = new Map<string, number>()

  examples.forEach(example => {
    areaCounts.set(example.area, (areaCounts.get(example.area) || 0) + 1)
    receptionChannelCounts.set(
      example.receptionChannel,
      (receptionChannelCounts.get(example.receptionChannel) || 0) + 1
    )
  })

  return {
    areas: [...areaCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, MAX_AREA_FEATURES)
      .map(([area]) => area),
    receptionChannels: [...receptionChannelCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, MAX_RECEPTION_CHANNEL_FEATURES)
      .map(([channel]) => channel)
  }
}

const buildFeatures = (
  example: Pick<TrainingExample, 'startDate' | 'area' | 'documentType' | 'expediente'>,
  context: ModelContext
) => {
  const date = example.startDate
  const dayOfMonth = date.getDate()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const monthAngle = (2 * Math.PI * date.getMonth()) / 12
  const weekAngle = (2 * Math.PI * date.getDay()) / 7
  const areaIndex = context.areas.indexOf(example.area)
  const channelIndex = context.receptionChannels.indexOf(
    receptionChannelFor(example.expediente)
  )
  const documentType = ['Memo', 'Oficio', 'Expediente'].includes(example.documentType)
    ? example.documentType
    : 'Expediente'

  return [
    1,
    ...context.areas.map((_, index) => Number(index === areaIndex)),
    Number(areaIndex === -1),
    ...context.receptionChannels.map((_, index) => Number(index === channelIndex)),
    Number(channelIndex === -1),
    Number(documentType === 'Memo'),
    Number(documentType === 'Oficio'),
    Number(documentType === 'Expediente'),
    Number(example.expediente.prioridad === 'Alta'),
    logCountFeature(example.expediente.folios),
    logCountFeature(example.expediente.anexos),
    Number(dayOfMonth >= daysInMonth - 2),
    dayOfMonth / daysInMonth,
    Math.sin(monthAngle),
    Math.cos(monthAngle),
    Math.sin(weekAngle),
    Math.cos(weekAngle)
  ]
}

const solveRidgeRegression = (features: number[][], targets: number[]) => {
  const columnCount = features[0]?.length || 0
  if (!columnCount || features.length !== targets.length) return null

  const matrix = Array.from({ length: columnCount }, () => Array(columnCount + 1).fill(0))

  features.forEach((row, rowIndex) => {
    for (let column = 0; column < columnCount; column += 1) {
      for (let otherColumn = 0; otherColumn < columnCount; otherColumn += 1) {
        matrix[column][otherColumn] += row[column] * row[otherColumn]
      }
      matrix[column][columnCount] += row[column] * targets[rowIndex]
    }
  })

  for (let column = 1; column < columnCount; column += 1) {
    matrix[column][column] += RIDGE_PENALTY
  }

  for (let pivot = 0; pivot < columnCount; pivot += 1) {
    let bestRow = pivot
    for (let row = pivot + 1; row < columnCount; row += 1) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[bestRow][pivot])) {
        bestRow = row
      }
    }

    if (Math.abs(matrix[bestRow][pivot]) < 1e-10) return null
    ;[matrix[pivot], matrix[bestRow]] = [matrix[bestRow], matrix[pivot]]

    const divisor = matrix[pivot][pivot]
    for (let column = pivot; column <= columnCount; column += 1) {
      matrix[pivot][column] /= divisor
    }

    for (let row = 0; row < columnCount; row += 1) {
      if (row === pivot) continue
      const factor = matrix[row][pivot]
      for (let column = pivot; column <= columnCount; column += 1) {
        matrix[row][column] -= factor * matrix[pivot][column]
      }
    }
  }

  return matrix.map(row => row[columnCount])
}

const predictDuration = (features: number[], coefficients: number[]) =>
  Math.max(
    0,
    Math.expm1(features.reduce((sum, feature, index) => sum + feature * coefficients[index], 0))
  )

const emptyAnalysis = (
  status: ExpedienteRiskAnalysis['status'],
  historicalCases = 0
): ExpedienteRiskAnalysis => ({
  status,
  historicalCases,
  validationCases: 0,
  meanAbsoluteError: null,
  baselineMeanAbsoluteError: null,
  highRiskCases: 0,
  unscorableCases: 0,
  predictions: []
})

export const analyzeExpedienteRisk = (
  expedientes: Expediente[],
  documents: DocumentoExpediente[],
  today = new Date()
): ExpedienteRiskAnalysis => {
  const todayDate = startOfDay(today)
  const examples = getTrainingExamples(expedientes, documents, todayDate)
  if (examples.length < MIN_HISTORICAL_CASES) {
    return emptyAnalysis('insufficient-data', examples.length)
  }

  const validationCount = Math.max(10, Math.ceil(examples.length * 0.2))
  const trainingExamples = examples.slice(0, examples.length - validationCount)
  const validationExamples = examples.slice(-validationCount)
  const context = createModelContext(trainingExamples)
  const coefficients = solveRidgeRegression(
    trainingExamples.map(example => buildFeatures(example, context)),
    trainingExamples.map(example => Math.log1p(example.durationDays))
  )

  if (!coefficients) return emptyAnalysis('insufficient-data', examples.length)

  const validationResiduals = validationExamples.map(example => {
    const prediction = predictDuration(buildFeatures(example, context), coefficients)
    return {
      prediction,
      actual: example.durationDays,
      residual: example.durationDays - prediction
    }
  })
  const meanAbsoluteError =
    validationResiduals.reduce((sum, item) => sum + Math.abs(item.residual), 0) /
    validationResiduals.length
  const baselineDuration = trainingExamples
    .map(example => example.durationDays)
    .sort((left, right) => left - right)[Math.floor(trainingExamples.length / 2)]
  const baselineMeanAbsoluteError =
    validationExamples.reduce(
      (sum, example) => sum + Math.abs(example.durationDays - baselineDuration),
      0
    ) / validationExamples.length

  if (meanAbsoluteError >= baselineMeanAbsoluteError) {
    return {
      ...emptyAnalysis('underperforming', examples.length),
      validationCases: validationExamples.length,
      meanAbsoluteError: Math.round(meanAbsoluteError * 10) / 10,
      baselineMeanAbsoluteError: Math.round(baselineMeanAbsoluteError * 10) / 10
    }
  }

  let unscorableCases = 0
  const predictions = expedientes.flatMap(expediente => {
    if (expediente.estado === 'Atendido' || expediente.estado === 'Archivado') return []

    const startDate = parseDate(expediente.fechaHoraRecepcion || expediente.fechaIngreso || '')
    const deadline = parseDate(expediente.plazo || '')
    if (
      !startDate ||
      !deadline ||
      dateOrdinal(startDate) > dateOrdinal(todayDate) ||
      dateOrdinal(deadline) < dateOrdinal(todayDate)
    ) {
      return []
    }

    const availableDays = daysBetween(startDate, deadline)
    if (availableDays < 0) return []
    const elapsedDays = daysBetween(startDate, todayDate)

    const area = getAreaDestino(expediente)
    const documentType = documentTypeFor(expediente.id, documents)
    const estimatedDays = predictDuration(
      buildFeatures({ expediente, startDate, area, documentType }, context),
      coefficients
    )
    const daysLateAtResidual = availableDays - estimatedDays
    const daysOngoingAtResidual = elapsedDays - estimatedDays
    const residualsForOngoingCases = validationResiduals.filter(
      item => item.residual > daysOngoingAtResidual
    )
    if (residualsForOngoingCases.length < 5) {
      unscorableCases += 1
      return []
    }

    const riskPercentage = Math.round(
      (residualsForOngoingCases.filter(
        item => item.residual > daysLateAtResidual
      ).length / residualsForOngoingCases.length) *
        100
    )

    return [{
      id: expediente.id,
      nroExp: expediente.nroExp,
      fechaIngreso: expediente.fechaIngreso,
      asunto: expediente.asunto,
      area,
      tipoDocumento: documentType,
      estimatedDays: Math.round(estimatedDays * 10) / 10,
      availableDays,
      daysRemaining: daysBetween(todayDate, deadline),
      riskPercentage,
      deadline: expediente.plazo
    }]
  })
    .filter(item => item.riskPercentage >= 30)
    .sort((left, right) =>
      right.riskPercentage - left.riskPercentage ||
      dateOrdinal(parseDate(left.deadline) || todayDate) -
        dateOrdinal(parseDate(right.deadline) || todayDate)
    )

  return {
    status: 'ready',
    historicalCases: examples.length,
    validationCases: validationExamples.length,
    meanAbsoluteError: Math.round(meanAbsoluteError * 10) / 10,
    baselineMeanAbsoluteError: Math.round(baselineMeanAbsoluteError * 10) / 10,
    highRiskCases: predictions.filter(item => item.riskPercentage >= 60).length,
    unscorableCases,
    predictions: predictions.slice(0, 8)
  }
}
