import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initMemory() {
  if (db) return;
  const dbPath = path.join(app.getPath('userData'), 'elyra_memory.db');
  console.log('Initializing memory DB at:', dbPath);
  db = new Database(dbPath);

  // Initialize tables safely without destroying data on restart
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      summary TEXT,
      day_of_week TEXT
    );

    CREATE TABLE IF NOT EXISTS user_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      key TEXT UNIQUE,
      value TEXT,
      confidence INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function saveFact(category: string, key: string, value: string) {
  if (!db) throw new Error("DB not initialized");
  const stmt = db.prepare(`
    INSERT INTO user_facts (category, key, value, confidence, updated_at) 
    VALUES (@category, @key, @value, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET 
      category = excluded.category,
      value = excluded.value, 
      confidence = user_facts.confidence + 1,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run({ category, key, value });
}

export function deleteFact(key: string) {
  if (!db) throw new Error("DB not initialized");
  const stmt = db.prepare(`DELETE FROM user_facts WHERE key = @key`);
  stmt.run({ key });
}

export function updateFact(oldKey: string, category: string, key: string, value: string) {
  if (!db) throw new Error("DB not initialized");
  const transaction = db.transaction(() => {
    const delStmt = db.prepare(`DELETE FROM user_facts WHERE key = @oldKey`);
    delStmt.run({ oldKey });

    const insStmt = db.prepare(`
      INSERT INTO user_facts (category, key, value, confidence, updated_at) 
      VALUES (@category, @key, @value, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        category = excluded.category,
        value = excluded.value, 
        confidence = user_facts.confidence + 1,
        updated_at = CURRENT_TIMESTAMP
    `);
    insStmt.run({ category, key, value });
  });
  transaction();
}

export function getAllFacts(): Record<string, string> {
  if (!db) throw new Error("DB not initialized");
  const stmt = db.prepare('SELECT key, value FROM user_facts ORDER BY confidence DESC');
  const rows = stmt.all() as { key: string, value: string }[];
  const facts: Record<string, string> = {};
  for (const row of rows) {
    facts[row.key] = row.value;
  }
  return facts;
}

export function getAllFactsDetailed() {
  if (!db) throw new Error("DB not initialized");
  const stmt = db.prepare('SELECT id, category, key, value, confidence, updated_at FROM user_facts ORDER BY category, confidence DESC');
  return stmt.all();
}

export function saveSessionSummary(summary: string, dayOfWeek: string) {
  if (!db) throw new Error("DB not initialized");
  const id = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO sessions (id, summary, day_of_week) VALUES (@id, @summary, @dayOfWeek)');
  stmt.run({ id, summary, dayOfWeek });
}

// Helper to format relative time
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString + 'Z'); // UTC
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) return "Today";
  if (diffHours < 48) return "Yesterday";
  return Math.floor(diffHours / 24) + " days ago";
}

export function getRecentContext() {
  if (!db) throw new Error("DB not initialized");
  const facts = getAllFacts();

  const stmt = db.prepare('SELECT summary, created_at, day_of_week FROM sessions ORDER BY created_at DESC LIMIT 5');
  const rows = stmt.all() as { summary: string, created_at: string, day_of_week: string }[];

  const recentSessions = rows.map(r => ({
    summary: r.summary,
    day_of_week: r.day_of_week,
    relative_time: formatRelativeTime(r.created_at)
  }));

  return { facts, recentSessions };
}

export function searchFacts(query: string) {
  if (!db) throw new Error("DB not initialized");
  
  const factStmt = db.prepare('SELECT category, key, value FROM user_facts WHERE value LIKE @query OR key LIKE @query OR category LIKE @query ORDER BY confidence DESC LIMIT 10');
  const factRows = factStmt.all({ query: `%${query}%` }) as any[];
  
  const sessStmt = db.prepare('SELECT summary, created_at FROM sessions WHERE summary LIKE @query ORDER BY created_at DESC LIMIT 5');
  const sessRows = sessStmt.all({ query: `%${query}%` }) as any[];

  let resultStr = 'Memory Results:\\n';
  for (const row of factRows) {
    resultStr += `- [${row.category}] ${row.key}: ${row.value}\\n`;
  }
  for (const row of sessRows) {
    resultStr += `- [Past Session] (${formatRelativeTime(row.created_at)}): ${row.summary}\\n`;
  }
  return resultStr === 'Memory Results:\\n' ? 'No matching memory found.' : resultStr;
}

export async function runMemoryWorkerMain(transcript: string, apiKey: string) {
  if (!transcript.trim()) return;
  try {
    console.log('Main Process: Running memory worker...');
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    
    // Fetch existing keys to prevent duplicates
    let existingKeysStr = "";
    try {
      const existingFacts = getAllFacts();
      existingKeysStr = Object.keys(existingFacts).join(", ");
    } catch (e) {}

    const prompt = `Analyze the following conversation transcript. Extract a 2-sentence summary of what happened. Also extract both EXPLICIT facts and IMPLICIT deductions about the user AND their relationships/environment (e.g., tech stack preferences, active projects, habits, names of friends/family, birthdays, important dates).

IMPORTANT: Here are the user's EXISTING memory keys: [${existingKeysStr}]
If a fact you extract is logically the same as or an update to an existing key, you MUST reuse the exact same existing key to overwrite it, rather than creating a duplicate (e.g., if you know 'user_date_of_birth', do not create 'date_of_birth'). Do not extract trivial or temporary details. Only extract permanent facts.

Return ONLY a raw JSON object strictly matching this schema:
{
  "summary": "2-sentence summary of the conversation",
  "facts": [
    {
      "category": "personal | tech_stack | preferences | project_goals",
      "key": "descriptive_snake_case_key",
      "value": "extracted fact or deduction"
    }
  ]
}

Transcript:
${transcript}`;
    
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (apiErr: any) {
      if (apiErr.message && apiErr.message.includes('429')) {
        console.warn("Memory Worker: API Rate Limit Exceeded (429). Waiting 60 seconds before retrying...");
        await new Promise(r => setTimeout(r, 60000));
        // Retry one time
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
      } else {
        throw apiErr;
      }
    }
    
    if (response.text) {
      let jsonStr = response.text.trim();
      if (jsonStr.startsWith(`\`\`\`json`)) jsonStr = jsonStr.replace(/\`\`\`json/g, '');
      if (jsonStr.startsWith(`\`\`\``)) jsonStr = jsonStr.replace(/\`\`\`/g, '');
      if (jsonStr.endsWith(`\`\`\``)) jsonStr = jsonStr.replace(/\`\`\`/g, '');
      const payload = JSON.parse(jsonStr);
      
      if (payload.facts && !Array.isArray(payload.facts) && typeof payload.facts === 'object') {
         const normalizedFacts = [];
         for (const [k, v] of Object.entries(payload.facts)) {
            if (typeof v === 'string') {
               normalizedFacts.push({ category: "personal", key: k, value: v });
            } else if (typeof v === 'object' && v !== null && (v as any).value) {
               normalizedFacts.push({ category: (v as any).category || "personal", key: (v as any).key || k, value: (v as any).value });
            }
         }
         payload.facts = normalizedFacts;
      }

      if (payload.summary) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[new Date().getDay()];
        saveSessionSummary(payload.summary, dayOfWeek);
      }
      if (payload.facts && Array.isArray(payload.facts)) {
        for (const fact of payload.facts) {
          if (fact.category && fact.key && fact.value) {
            saveFact(fact.category, fact.key, fact.value);
          }
        }
      }
      console.log('Main Process: Memory updated successfully!');
    }
  } catch (e) {
    console.error('Main Process: Failed to run memory worker:', e);
  }
}
