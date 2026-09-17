/* Table floor model — T1 to T12 across three sections.
   x/y are percentages of the floor-plan canvas; the node is centred on them. */

export const SECTION_BOUNDS = [
  { name: 'Main Floor', left: 3, top: 4, width: 94, height: 36 },
  { name: 'Patio', left: 3, top: 44, width: 94, height: 20 },
  { name: 'Balcony', left: 3, top: 68, width: 94, height: 26 },
]

export const mockTables = [
  { id: 'T1', seats: 4, section: 'Main Floor', x: 16, y: 14, shape: 'square' },
  { id: 'T2', seats: 4, section: 'Main Floor', x: 44, y: 14, shape: 'square' },
  { id: 'T3', seats: 2, section: 'Main Floor', x: 72, y: 14, shape: 'round' },
  { id: 'T4', seats: 6, section: 'Main Floor', x: 16, y: 30, shape: 'square' },
  { id: 'T5', seats: 4, section: 'Main Floor', x: 44, y: 30, shape: 'square' },
  { id: 'T6', seats: 6, section: 'Main Floor', x: 72, y: 30, shape: 'square' },
  { id: 'T7', seats: 4, section: 'Patio', x: 16, y: 54, shape: 'round' },
  { id: 'T8', seats: 2, section: 'Patio', x: 39, y: 54, shape: 'round' },
  { id: 'T9', seats: 4, section: 'Patio', x: 62, y: 54, shape: 'round' },
  { id: 'T10', seats: 2, section: 'Patio', x: 85, y: 54, shape: 'round' },
  { id: 'T11', seats: 4, section: 'Balcony', x: 32, y: 81, shape: 'square' },
  { id: 'T12', seats: 2, section: 'Balcony', x: 68, y: 81, shape: 'round' },
]

export const TABLE_IDS = mockTables.map((table) => table.id)

export function sectionOf(tableId) {
  return mockTables.find((table) => table.id === tableId)?.section || 'Main Floor'
}

/** Accepts "T5", "t5", "5" or a QR payload and returns a valid table id. */
export function normalizeTableId(value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim().toUpperCase()
  const match = raw.match(/T?(\d{1,2})/)
  if (!match) return null
  const id = `T${Number(match[1])}`
  return TABLE_IDS.includes(id) ? id : null
}
