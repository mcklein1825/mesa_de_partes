export const formatDocumentNumber = (
  number: string | number | null | undefined,
  createdAt?: string | null
): string => {
  const documentNumber = String(number ?? '').trim()
  if (!documentNumber || !createdAt) return documentNumber

  const registeredAt = new Date(createdAt)
  if (Number.isNaN(registeredAt.getTime())) return documentNumber

  const year = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric'
  }).format(registeredAt)

  return `${documentNumber}-${year}`
}
