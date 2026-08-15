import { chromium, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';

export class DirectBrowserEngine {
  private static instance: DirectBrowserEngine;
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
    if (!this.context) {
      const BRAVE_PATH = process.env.LOCALAPPDATA + '\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
      const userDataDir = process.env.LOCALAPPDATA + '\\Elyra\\BraveAgentProfile';
      
      const launchOptions: any = { 
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--disable-infobars']
      };
      
      if (fs.existsSync(BRAVE_PATH)) {
        launchOptions.executablePath = BRAVE_PATH;
      } else {
        console.warn(`Brave browser not found at ${BRAVE_PATH}. Falling back to default chromium.`);
      }

      this.context = await chromium.launchPersistentContext(userDataDir, launchOptions);
      this.page = this.context.pages()[0] || await this.context.newPage();
    }
  }

  public async stop() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  private async ensurePage(): Promise<Page> {
    try {
      if (this.page && this.page.isClosed()) {
        console.log('Browser page was closed manually. Restarting engine...');
        this.page = null;
        this.context = null;
      }
    } catch (e) {
      this.page = null;
      this.context = null;
    }

    if (!this.page) {
      await this.start();
    }
    return this.page!;
  }

  public async navigate(url: string): Promise<string> {
    try {
      const page = await this.ensurePage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return `Navigated to ${url}`;
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
        // Fallback: look for generic visible input or textarea
        targetLocator = page.locator('input:visible, textarea:visible').first();
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
          const rect = el.getBoundingClientRect();
          // Only tag visible elements currently within the viewport
          if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0 || rect.top > window.innerHeight) return;
          
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
      
      if (this.context) {
        const pages = this.context.pages();
        if (pages.length > 0) {
          this.page = pages[pages.length - 1];
          await this.page.bringToFront();
          return "Tab closed. Switched to another open tab.";
        } else {
          this.page = null;
          this.context = null;
          return "Closed the last tab. Browser engine stopped.";
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
