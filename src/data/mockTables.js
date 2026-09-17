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

/** Accepts "T5", "t5", "5", "T11", "11" or a QR payload and returns a valid normalized table id. */
export function normalizeTableId(value, tables = []) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null

  // 1. Match against dynamic tables in store/DB if provided
  if (Array.isArray(tables) && tables.length > 0) {
    const direct = tables.find((t) => t.id.toLowerCase() === raw.toLowerCase())
    if (direct) return direct.id
    const prefixed = tables.find((t) => t.id.toLowerCase() === `t${raw}`.toLowerCase())
    if (prefixed) return prefixed.id
  }

  // 2. Standard table ID pattern (e.g. "T11", "t11", "11", "T5")
  const match = raw.toUpperCase().match(/T?(\d{1,4})/)
  if (match) {
    return `T${Number(match[1])}`
  }

  return raw
}
