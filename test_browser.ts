import { BrowserAgent } from './electron/browser_agent';
import * as fs from 'fs';
import * as path from 'path';

// read API key from .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

async function runTest() {
  const agent = new BrowserAgent(apiKey);
  console.log("Starting BrowserAgent test...");
  const result = await agent.executeTask("Find the weather in New York", "https://google.com");
  console.log("Result:", result);
  await agent.stop();
}

runTest();
