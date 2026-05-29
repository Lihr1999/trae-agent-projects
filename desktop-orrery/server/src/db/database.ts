import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Body, SimulationConfig, SavedSimulation } from '../physics/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '../../data/orrery.db')

let db: any = null
let SQL: any = null

async function initDatabase() {
  if (db) return db

  SQL = await initSqlJs()

  let dbData: Uint8Array | null = null
  if (fs.existsSync(dbPath)) {
    dbData = new Uint8Array(fs.readFileSync(dbPath))
  }

  db = new SQL.Database(dbData)

  db.run(`
    CREATE TABLE IF NOT EXISTS simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      bodies_json TEXT NOT NULL,
      config_json TEXT NOT NULL
    )
  `)

  saveDatabase()
  return db
}

function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(dbPath, buffer)
  }
}

export interface SimulationRecord {
  id: number
  name: string
  created_at: string
  updated_at: string
  bodies_json: string
  config_json: string
}

export async function saveSimulation(
  name: string,
  bodies: Body[],
  config: SimulationConfig
): Promise<number> {
  await initDatabase()

  const stmt = db.prepare(
    'INSERT INTO simulations (name, bodies_json, config_json) VALUES (?, ?, ?)'
  )
  stmt.run([name, JSON.stringify(bodies), JSON.stringify(config)])
  const result = db.exec('SELECT last_insert_rowid() as id')
  saveDatabase()
  return result[0]?.values[0]?.[0] || 1
}

export async function updateSimulation(
  id: number,
  name: string,
  bodies: Body[],
  config: SimulationConfig
): Promise<boolean> {
  await initDatabase()

  const stmt = db.prepare(
    'UPDATE simulations SET name = ?, bodies_json = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
  const result = stmt.run([name, JSON.stringify(bodies), JSON.stringify(config), id])
  saveDatabase()
  return result.changes > 0
}

export async function getSimulation(id: number): Promise<SavedSimulation | null> {
  await initDatabase()

  const stmt = db.prepare('SELECT * FROM simulations WHERE id = ?')
  stmt.bind([id])
  const row = stmt.getAsObject() as SimulationRecord | undefined

  if (!row || !row.id) return null

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bodies: JSON.parse(row.bodies_json),
    config: JSON.parse(row.config_json)
  }
}

export async function getAllSimulations(): Promise<SavedSimulation[]> {
  await initDatabase()

  const result = db.exec('SELECT * FROM simulations ORDER BY updated_at DESC')
  if (!result.length) return []

  return result[0].values.map((row: any[]) => ({
    id: row[0],
    name: row[1],
    createdAt: row[2],
    updatedAt: row[3],
    bodies: JSON.parse(row[4]),
    config: JSON.parse(row[5])
  }))
}

export async function deleteSimulation(id: number): Promise<boolean> {
  await initDatabase()

  const stmt = db.prepare('DELETE FROM simulations WHERE id = ?')
  const result = stmt.run([id])
  saveDatabase()
  return result.changes > 0
}

export { initDatabase }
