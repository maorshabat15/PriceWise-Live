import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'chats.sqlite');

export function saveDbToFile(database: Database) {
  try {
    const data = database.export();
    const buffer = Buffer.from(data);
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[SQLite] Error saving database file:', err);
  }
}

export async function getSqliteDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (readErr) {
      console.warn('[SQLite] Failed to load existing database file, creating fresh one:', readErr);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys for cascade delete
  db.run('PRAGMA foreign_keys = ON;');

  // Create chats and messages tables if they do not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);

  saveDbToFile(db);
  return db;
}

/**
 * Delete a chat session and all its associated messages from SQLite.
 * Ensures cascade deletion of associated messages.
 */
export async function deleteChatFromDb(chatId: string): Promise<boolean> {
  if (!chatId) {
    throw new Error('Missing chatId parameter for deletion');
  }

  const database = await getSqliteDb();
  database.run('PRAGMA foreign_keys = ON;');

  // Explicitly delete messages first for double safety, then the chat record
  database.run('DELETE FROM chat_messages WHERE chat_id = ?;', [chatId]);
  database.run('DELETE FROM chats WHERE id = ?;', [chatId]);

  saveDbToFile(database);
  console.log(`[SQLite] Successfully deleted chat ${chatId} and its associated messages.`);
  return true;
}

/**
 * Delete all chats and all chat messages from SQLite
 */
export async function clearAllChatsFromDb(): Promise<boolean> {
  const database = await getSqliteDb();
  database.run('DELETE FROM chat_messages;');
  database.run('DELETE FROM chats;');
  saveDbToFile(database);
  console.log('[SQLite] All chats and messages cleared.');
  return true;
}

/**
 * Save or update a chat session in SQLite
 */
export async function upsertChatInDb(session: {
  id: string;
  title: string;
  category?: string;
  createdAt?: number;
  updatedAt?: number;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    timestamp?: string;
  }>;
}) {
  const database = await getSqliteDb();
  database.run('PRAGMA foreign_keys = ON;');

  const now = Date.now();
  const cId = session.id;
  const cTitle = session.title || 'שיחה';
  const cCategory = session.category || 'general';
  const cCreated = session.createdAt || now;
  const cUpdated = session.updatedAt || now;

  database.run(
    `INSERT OR REPLACE INTO chats (id, title, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
    [cId, cTitle, cCategory, cCreated, cUpdated]
  );

  if (session.messages && Array.isArray(session.messages)) {
    for (const msg of session.messages) {
      database.run(
        `INSERT OR REPLACE INTO chat_messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?);`,
        [msg.id, cId, msg.role, msg.content, msg.timestamp || '']
      );
    }
  }

  saveDbToFile(database);
}

/**
 * Get all chats from SQLite
 */
export async function getAllChatsFromDb() {
  const database = await getSqliteDb();
  const stmt = database.prepare('SELECT id, title, category, created_at, updated_at FROM chats ORDER BY updated_at DESC;');
  const chats: any[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    chats.push({
      id: row.id,
      title: row.title,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: [],
    });
  }
  stmt.free();

  for (const chat of chats) {
    const msgStmt = database.prepare('SELECT id, role, content, timestamp FROM chat_messages WHERE chat_id = ? ORDER BY id ASC;');
    msgStmt.bind([chat.id]);
    const msgs: any[] = [];
    while (msgStmt.step()) {
      const mRow = msgStmt.getAsObject();
      msgs.push({
        id: mRow.id,
        role: mRow.role,
        content: mRow.content,
        timestamp: mRow.timestamp,
      });
    }
    msgStmt.free();
    chat.messages = msgs;
  }

  return chats;
}
