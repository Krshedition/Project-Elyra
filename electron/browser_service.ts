import { chromium, BrowserContext, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export class DirectBrowserEngine {
  private static instance: DirectBrowserEngine;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  public static getInstance(): DirectBrowserEngine {
    if (!DirectBrowserEngine.instance) {
      DirectBrowserEngine.instance = new DirectBrowserEngine();
    }
    return DirectBrowserEngine.instance;
  }

  public async start() {
    if (!this.browser || !this.browser.isConnected()) {
      try {
        console.log('Attempting to connect to official Brave browser via CDP...');
        this.browser = await chromium.connectOverCDP('http://localhost:9222');
        this.context = this.browser.contexts()[0];
        this.page = await this.getActivePage();
      } catch (err) {
        console.log('CDP connection failed. Launching Brave with remote debugging...');
        
        // Check both common install locations
        const SYSTEM_BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
        const LOCAL_BRAVE = path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');
        
        let targetPath = fs.existsSync(SYSTEM_BRAVE) ? SYSTEM_BRAVE : (fs.existsSync(LOCAL_BRAVE) ? LOCAL_BRAVE : null);
        
        if (targetPath) {
          // Check if Brave is already running without remote debugging enabled
          const { execSync } = require('child_process');
          let isRunning = false;
          try {
            const tasklist = execSync('tasklist /fi "imagename eq brave.exe"', { encoding: 'utf8' });
            if (tasklist.toLowerCase().includes('brave.exe')) {
              isRunning = true;
            }
          } catch (e) {}

          if (isRunning) {
            console.log('Brave is currently running without remote debugging. Gracefully restarting with remote debugging enabled...');
            try {
              execSync('taskkill /IM brave.exe /F', { stdio: 'ignore' });
              await new Promise(r => setTimeout(r, 1000));
            } catch (e) {}
          }

          // Launch user's ACTUAL Brave app with remote debugging and session restore (no sandbox profile!)
          exec(`"${targetPath}" --remote-debugging-port=9222 --restore-last-session`);
          
          // Poll port 9222 until ready (up to 8 seconds, checking every 300ms)
          let connected = false;
          for (let i = 0; i < 26; i++) {
            try {
              const res = await fetch('http://localhost:9222/json/version');
              if (res.ok) {
                connected = true;
                break;
              }
            } catch (e) {}
            await new Promise(r => setTimeout(r, 300));
          }

          if (!connected) {
            throw new Error("Failed to connect to Brave CDP after launching.");
          }
          
          this.browser = await chromium.connectOverCDP('http://localhost:9222');
          this.context = this.browser.contexts()[0];
          this.page = await this.getActivePage();
        } else {
          throw new Error("Brave browser not found in standard paths.");
        }
      }
    }
  }

  public async stop() {
    if (this.browser) {
      await this.browser.close(); // Disconnects from CDP without killing the user's browser
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  private async getActivePage(): Promise<Page> {
    if (!this.context) {
      const pages = this.browser?.contexts()[0]?.pages() || [];
      if (pages.length > 0) this.context = this.browser!.contexts()[0];
    }

    if (!this.context) {
      throw new Error("No browser context available.");
    }

    const pages = this.context.pages().filter(p => !p.isClosed());
    if (pages.length === 0) {
      this.page = await this.context.newPage();
      return this.page;
    }

    // Identify the active/focused tab that the user is currently looking at in Brave
    for (const p of pages) {
      try {
        const isVisible = await p.evaluate(() => document.visibilityState === 'visible');
        if (isVisible) {
          this.page = p;
          return p;
        }
      } catch (e) {}
    }

    // If previously tracked page is still open, reuse it
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    // Otherwise use the last active tab in the browser
    this.page = pages[pages.length - 1];
    return this.page;
  }

  private async ensurePage(): Promise<Page> {
    try {
      if (this.browser && !this.browser.isConnected()) {
        this.browser = null;
        this.context = null;
        this.page = null;
      }
    } catch (e) {
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    if (!this.browser || !this.context) {
      await this.start();
    }

    return await this.getActivePage();
  }

  public async navigate(url: string): Promise<string> {
    try {
      const page = await this.getActivePage();
      
      let finalUrl = url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      
      await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();
      return `Navigated to ${finalUrl}`;
    } catch (err: any) {
      return `Failed to navigate: ${err.message}`;
    }
  }

  public async clickByText(text: string): Promise<string> {
    try {
      const page = await this.ensurePage();
      // Use Playwright's native locator to find element by text or aria-label
      // Using first() to handle multiple matches
      const loc = page.locator(`text="${text}"`).first();
      
      const count = await loc.count();
      if (count === 0) {
        // Fallback to aria-label if text isn't found
        const ariaLoc = page.locator(`[aria-label*="${text}" i]`).first();
        if (await ariaLoc.count() === 0) {
           return `Element with text or aria-label "${text}" not found.`;
        }
        await ariaLoc.scrollIntoViewIfNeeded();
        await ariaLoc.click({ force: true, timeout: 5000 });
      } else {
        await loc.scrollIntoViewIfNeeded();
        await loc.click({ force: true, timeout: 5000 });
      }
      return `Clicked on element containing "${text}"`;
    } catch (err: any) {
      return `Failed to click: ${err.message}`;
    }
  }

  public async typeInput(selector: string | undefined, text: string, pressEnter: boolean): Promise<string> {
    try {
      const page = await this.ensurePage();
      let targetLocator;
      
      if (selector) {
        targetLocator = page.locator(selector).first();
      } else {
        // Fallback: look for generic visible input, textarea, or contenteditable divs (e.g. Instagram/WhatsApp chats)
        targetLocator = page.locator('input:visible, textarea:visible, [contenteditable="true"]:visible, [role="textbox"]:visible').first();
      }

      if (await targetLocator.count() === 0) {
        return `No visible input field found ${selector ? `with selector "${selector}"` : ''}.`;
      }

      await targetLocator.scrollIntoViewIfNeeded();
      await targetLocator.fill(text);
      if (pressEnter) {
        await targetLocator.press('Enter');
      }
      return `Typed "${text}" into input ${pressEnter ? 'and pressed Enter' : ''}`;
    } catch (err: any) {
      return `Failed to type input: ${err.message}`;
    }
  }

  public async clickFirstYouTubeVideo(): Promise<string> {
    try {
      const page = await this.ensurePage();
      // Robust selectors for YouTube video results
      const videoSelectors = [
        'ytd-rich-grid-media a#video-title',
        'ytd-video-renderer a#video-title',
        'a#video-title-link'
      ];

      for (const sel of videoSelectors) {
        const loc = page.locator(sel).first();
        if (await loc.count() > 0) {
          await loc.scrollIntoViewIfNeeded();
          await loc.click({ force: true, timeout: 5000 });
          return `Clicked first YouTube video using selector: ${sel}`;
        }
      }

      return 'Could not find a YouTube video title link to click.';
    } catch (err: any) {
      return `Failed to click YouTube video: ${err.message}`;
    }
  }

  public async scroll(direction: 'up' | 'down' | 'top' | 'bottom'): Promise<string> {
    try {
      const page = await this.ensurePage();
      if (direction === 'bottom') {
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      } else if (direction === 'top') {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      } else if (direction === 'down') {
        await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }));
      } else if (direction === 'up') {
        await page.evaluate(() => window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' }));
      }
      // Wait a moment for smooth scrolling to settle
      await new Promise(r => setTimeout(r, 800));
      return `Scrolled page ${direction}`;
    } catch (err: any) {
      return `Failed to scroll: ${err.message}`;
    }
  }

  public async analyzePage(): Promise<string> {
    try {
      const page = await this.ensurePage();
      
      const elementsMap = await page.evaluate(() => {
        // Clear previous tags
        document.querySelectorAll('.elyra-tag-overlay').forEach(e => e.remove());
        
        let counter = 1;
        const results: any[] = [];
        
        // Find interactable elements
        const elements = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
        
        elements.forEach((el) => {
          if (counter > 200) return; // Cap at 200 elements to prevent token overflow

          const rect = el.getBoundingClientRect();
          // Skip elements with no dimensions
          if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) return;
          
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
          
          const id = counter++;
          el.setAttribute('data-elyra-id', id.toString());
          
          // Draw overlay
          const overlay = document.createElement('div');
          overlay.className = 'elyra-tag-overlay';
          overlay.style.position = 'absolute';
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.backgroundColor = 'red';
          overlay.style.color = 'white';
          overlay.style.fontSize = '12px';
          overlay.style.fontWeight = 'bold';
          overlay.style.padding = '2px';
          overlay.style.zIndex = '999999';
          overlay.style.pointerEvents = 'none';
          overlay.textContent = `[${id}]`;
          document.body.appendChild(overlay);
          
          let text = (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '';
          text = text.substring(0, 30).replace(/\n/g, ' ').trim();
          
          results.push({
            id,
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || '',
            name: el.getAttribute('name') || '',
            placeholder: el.getAttribute('placeholder') || '',
            text
          });
        });
        
        return results;
      });
      
      if (elementsMap.length === 0) return 'No visible interactive elements found on the screen.';
      
      // Compress for LLM
      const chunks = elementsMap.map((e: any) => {
        let desc = `[${e.id}]: ${e.tag}`;
        if (e.type) desc += `(type=${e.type})`;
        if (e.name) desc += `(name=${e.name})`;
        if (e.placeholder) desc += `(placeholder="${e.placeholder}")`;
        if (e.text) desc += ` - "${e.text}"`;
        return desc;
      });
      
      return chunks.join(', ');
    } catch (err: any) {
      return `Failed to analyze page: ${err.message}`;
    }
  }

  public async clickElement(id: number): Promise<string> {
    try {
      const page = await this.ensurePage();
      const loc = page.locator(`[data-elyra-id="${id}"]`);
      if (await loc.count() === 0) {
        return `Element with ID [${id}] not found on page. Did you run browser_analyze_page first?`;
      }
      await loc.scrollIntoViewIfNeeded();
      await loc.click({ force: true, timeout: 5000 });
      return `Clicked element [${id}]`;
    } catch (err: any) {
      return `Failed to click element ${id}: ${err.message}`;
    }
  }

  public async fillForm(fields: {id: number, text: string}[]): Promise<string> {
    try {
      const page = await this.ensurePage();
      const results = [];
      for (const field of fields) {
        const loc = page.locator(`[data-elyra-id="${field.id}"]`);
        if (await loc.count() === 0) {
          results.push(`[${field.id}] not found`);
          continue;
        }
        await loc.scrollIntoViewIfNeeded();
        await loc.fill(field.text);
        results.push(`[${field.id}] filled`);
      }
      return `Form filled results: ${results.join(', ')}`;
    } catch (err: any) {
      return `Failed to fill form: ${err.message}`;
    }
  }

  public async closeTab(): Promise<string> {
    try {
      if (!this.page || this.page.isClosed()) {
        return "No active tab to close.";
      }
      await this.page.close();
      this.page = null;
      
      if (this.context) {
        const pages = this.context.pages().filter(p => !p.isClosed());
        if (pages.length > 0) {
          this.page = pages[pages.length - 1];
          await this.page.bringToFront();
          return "Tab closed. Switched to another open tab.";
        } else {
          this.page = null;
          return "Closed the last tab. No more open tabs in browser.";
        }
      }
      return "Tab closed.";
    } catch (err: any) {
      return `Failed to close tab: ${err.message}`;
    }
  }

  public async pressKey(key: string): Promise<string> {
    try {
      const page = await this.ensurePage();
      await page.keyboard.press(key);
      return `Pressed key: ${key}`;
    } catch (err: any) {
      return `Failed to press key: ${err.message}`;
    }
  }
}
