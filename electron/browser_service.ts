import { chromium, BrowserContext, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export class DirectBrowserEngine {
  private static instance: DirectBrowserEngine;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private tabIdMap: Map<number, Page> = new Map();
  private pageToIdMap: WeakMap<Page, number> = new WeakMap();
  private nextTabId: number = 1;
  private currentTabId: number = 1;

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
        await this.syncTabs();
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
          await this.syncTabs();
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
      this.tabIdMap.clear();
      this.nextTabId = 1;
      this.currentTabId = 1;
    }
  }

  private async ensureContext(): Promise<BrowserContext> {
    try {
      if (this.browser && !this.browser.isConnected()) {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.tabIdMap.clear();
      }
    } catch (e) {
      this.browser = null;
      this.context = null;
      this.page = null;
      this.tabIdMap.clear();
    }

    if (!this.browser || !this.context) {
      await this.start();
    }

    if (!this.context) {
      const contexts = this.browser?.contexts() || [];
      if (contexts.length > 0) {
        this.context = contexts[0];
      } else {
        throw new Error("No browser context available.");
      }
    }

    return this.context;
  }

  public async getWebPages(): Promise<Page[]> {
    const context = await this.ensureContext();
    const allPages = context.pages().filter(p => !p.isClosed());
    const webPages = allPages.filter(p => {
      const u = p.url();
      return !u.startsWith('chrome-extension://') && !u.startsWith('devtools://');
    });
    return webPages.length > 0 ? webPages : allPages;
  }

  public async syncTabs(): Promise<{ id: number; page: Page }[]> {
    const webPages = await this.getWebPages();
    
    // Prune closed or missing pages from tabIdMap
    for (const [id, page] of Array.from(this.tabIdMap.entries())) {
      if (page.isClosed() || !webPages.includes(page)) {
        this.tabIdMap.delete(id);
      }
    }

    // Register any new web pages
    for (const page of webPages) {
      if (page.isClosed()) continue;
      let id = this.pageToIdMap.get(page);
      if (!id || !this.tabIdMap.has(id)) {
        id = this.nextTabId++;
        this.tabIdMap.set(id, page);
        this.pageToIdMap.set(page, id);
        page.on('close', () => {
          if (id) this.tabIdMap.delete(id);
          if (this.currentTabId === id) {
            const remaining = Array.from(this.tabIdMap.keys());
            this.currentTabId = remaining.length > 0 ? remaining[remaining.length - 1] : 1;
          }
        });
      }
    }

    // Build the ordered list of open tabs
    const result: { id: number; page: Page }[] = [];
    for (const page of webPages) {
      const id = this.pageToIdMap.get(page);
      if (id && this.tabIdMap.has(id)) {
        result.push({ id, page });
      }
    }

    // Ensure currentTabId points to a valid tab
    if (!this.tabIdMap.has(this.currentTabId) && result.length > 0) {
      this.currentTabId = result[result.length - 1].id;
      this.page = result[result.length - 1].page;
    }

    return result;
  }

  public async resolvePage(tabId?: number | string): Promise<{ id: number; page: Page }> {
    await this.ensureContext();
    const tabs = await this.syncTabs();

    if (tabs.length === 0) {
      const context = await this.ensureContext();
      const page = await context.newPage();
      await this.syncTabs();
      const id = this.pageToIdMap.get(page) || 1;
      this.currentTabId = id;
      this.page = page;
      return { id, page };
    }

    if (tabId !== undefined && tabId !== null && String(tabId).trim() !== '') {
      const parsedNum = typeof tabId === 'number' ? tabId : parseInt(String(tabId).replace(/\D/g, ''), 10);
      if (!isNaN(parsedNum) && this.tabIdMap.has(parsedNum)) {
        const page = this.tabIdMap.get(parsedNum)!;
        if (!page.isClosed()) {
          this.currentTabId = parsedNum;
          this.page = page;
          try { await page.bringToFront(); } catch (e) {}
          return { id: parsedNum, page };
        }
      }
      
      // Also allow fuzzy match by title or url if target string is not a pure number
      const targetStr = String(tabId).toLowerCase().trim();
      for (const t of tabs) {
        let title = '';
        try { title = (await t.page.title()).toLowerCase(); } catch (e) {}
        const url = t.page.url().toLowerCase();
        if (title.includes(targetStr) || url.includes(targetStr)) {
          this.currentTabId = t.id;
          this.page = t.page;
          try { await t.page.bringToFront(); } catch (e) {}
          return { id: t.id, page: t.page };
        }
      }
      
      throw new Error(`Tab ID ${tabId} not found. Currently open tabs: ${tabs.map(t => `[Tab ID: ${t.id}]`).join(', ')}`);
    }

    // Default to currentTabId or last tab
    let targetTab = tabs.find(t => t.id === this.currentTabId);
    if (!targetTab) {
      targetTab = tabs[tabs.length - 1];
      this.currentTabId = targetTab.id;
    }

    this.page = targetTab.page;
    try { await targetTab.page.bringToFront(); } catch (e) {}
    return { id: targetTab.id, page: targetTab.page };
  }

  private async ensurePage(): Promise<Page> {
    const { page } = await this.resolvePage();
    return page;
  }

  private matchesDomain(url1: string, url2: string): boolean {
    try {
      const u1 = new URL(url1).hostname.replace(/^www\./, '').toLowerCase();
      const u2 = new URL(url2).hostname.replace(/^www\./, '').toLowerCase();
      if (u1 === u2) return true;
      if (u1.includes('whatsapp') && u2.includes('whatsapp')) return true;
      if ((u1.includes('chatgpt') || u1.includes('openai')) && (u2.includes('chatgpt') || u2.includes('openai'))) return true;
      if (u1.includes('youtube') && u2.includes('youtube')) return true;
      if (u1.includes('github') && u2.includes('github')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  public async navigate(url: string, newTab: boolean = false, tabId?: number | string): Promise<string> {
    try {
      let finalUrl = url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }

      if (newTab) {
        const context = await this.ensureContext();
        const page = await context.newPage();
        await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.bringToFront();
        await this.syncTabs();
        const id = this.pageToIdMap.get(page) || this.currentTabId;
        this.currentTabId = id;
        this.page = page;
        let title = 'Tab';
        try { title = await page.title(); } catch (e) {}
        return `Opened new Tab [Tab ID: ${id}]: "${title}" [${finalUrl}]`;
      }

      // If user specified tabId, target that tab
      if (tabId !== undefined && tabId !== null && String(tabId).trim() !== '') {
        const { id, page } = await this.resolvePage(tabId);
        await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.bringToFront();
        let title = 'Tab';
        try { title = await page.title(); } catch (e) {}
        return `Navigated Tab [Tab ID: ${id}]: "${title}" to ${finalUrl}`;
      }

      // Check if target website is already open in an existing tab to prevent overwriting active tabs
      const tabs = await this.syncTabs();
      for (const t of tabs) {
        if (this.matchesDomain(t.page.url(), finalUrl)) {
          this.currentTabId = t.id;
          this.page = t.page;
          await this.page.bringToFront();
          let title = 'Tab';
          try { title = await t.page.title(); } catch (e) {}
          return `Tab [Tab ID: ${t.id}] ("${title}") is already open. Switched to it instead of overwriting.`;
        }
      }

      const { id, page } = await this.resolvePage();
      await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();
      let title = 'Tab';
      try { title = await page.title(); } catch (e) {}
      return `Navigated Tab [Tab ID: ${id}]: "${title}" to ${finalUrl}`;
    } catch (err: any) {
      return `Failed to navigate: ${err.message}`;
    }
  }

  public async newTab(url?: string): Promise<string> {
    try {
      if (url && url.trim() !== '') {
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = `https://${finalUrl}`;
        }

        // Avoid opening duplicate tabs for already open major services
        const tabs = await this.syncTabs();
        for (const t of tabs) {
          if (this.matchesDomain(t.page.url(), finalUrl)) {
            this.currentTabId = t.id;
            this.page = t.page;
            await this.page.bringToFront();
            let title = 'Tab';
            try { title = await t.page.title(); } catch (e) {}
            return `Tab [Tab ID: ${t.id}] ("${title}") was already open. Switched to it instead of duplicating.`;
          }
        }

        const context = await this.ensureContext();
        const page = await context.newPage();
        await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.bringToFront();
        await this.syncTabs();
        const id = this.pageToIdMap.get(page) || this.currentTabId;
        this.currentTabId = id;
        this.page = page;
        let title = 'Tab';
        try { title = await page.title(); } catch (e) {}
        return `Opened new Tab [Tab ID: ${id}]: "${title}" [${finalUrl}]`;
      } else {
        const context = await this.ensureContext();
        const page = await context.newPage();
        await page.bringToFront();
        await this.syncTabs();
        const id = this.pageToIdMap.get(page) || this.currentTabId;
        this.currentTabId = id;
        this.page = page;
        return `Opened new empty Tab [Tab ID: ${id}].`;
      }
    } catch (err: any) {
      return `Failed to open new tab: ${err.message}`;
    }
  }

  public async listTabs(): Promise<string> {
    try {
      const tabs = await this.syncTabs();
      if (tabs.length === 0) {
        return "No open browser tabs found.";
      }

      const lines: string[] = ["Currently open browser tabs:"];
      for (const t of tabs) {
        let title = 'Untitled';
        try { title = await t.page.title(); } catch (e) {}
        const url = t.page.url();
        const isActive = t.id === this.currentTabId;
        lines.push(`- [Tab ID: ${t.id}] "${title || 'Untitled'}" [${url}]${isActive ? ' (ACTIVE)' : ''}`);
      }
      lines.push(`\nActive tab is [Tab ID: ${this.currentTabId}]. You can specify 'tabId' in browser tools or use 'browser_switch_tab' to control a specific tab.`);
      return lines.join('\n');
    } catch (err: any) {
      return `Failed to list tabs: ${err.message}`;
    }
  }

  public async switchTab(target: string | number): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(target);
      let title = 'Tab';
      try { title = await page.title(); } catch (e) {}
      return `Switched to Tab [Tab ID: ${id}]: "${title}" [${page.url()}].`;
    } catch (err: any) {
      return `Failed to switch tab: ${err.message}`;
    }
  }

  public async clickByText(text: string, tabId?: number | string): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(tabId);
      const loc = page.locator(`text="${text}"`).first();
      const count = await loc.count();
      if (count === 0) {
        const ariaLoc = page.locator(`[aria-label*="${text}" i]`).first();
        if (await ariaLoc.count() === 0) {
          return `Element with text or aria-label "${text}" not found on Tab [Tab ID: ${id}].`;
        }
        await ariaLoc.scrollIntoViewIfNeeded();
        await ariaLoc.click({ force: true, timeout: 5000 });
      } else {
        await loc.scrollIntoViewIfNeeded();
        await loc.click({ force: true, timeout: 5000 });
      }
      return `Clicked on element containing "${text}" on Tab [Tab ID: ${id}].`;
    } catch (err: any) {
      return `Failed to click on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async typeInput(selector: string | undefined, text: string, pressEnter: boolean, tabId?: number | string): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(tabId);
      let targetLocator;
      if (selector) {
        targetLocator = page.locator(selector).first();
      } else {
        targetLocator = page.locator('input:visible, textarea:visible, [contenteditable="true"]:visible, [role="textbox"]:visible').first();
      }

      if (await targetLocator.count() === 0) {
        return `No visible input field found on Tab [Tab ID: ${id}] ${selector ? `with selector "${selector}"` : ''}.`;
      }

      await targetLocator.scrollIntoViewIfNeeded();
      await targetLocator.fill(text);
      if (pressEnter) {
        await targetLocator.press('Enter');
      }
      return `Typed "${text}" into input on Tab [Tab ID: ${id}] ${pressEnter ? 'and pressed Enter' : ''}`;
    } catch (err: any) {
      return `Failed to type input on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async clickFirstYouTubeVideo(tabId?: number | string): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(tabId);
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
          return `Clicked first YouTube video on Tab [Tab ID: ${id}] using selector: ${sel}`;
        }
      }

      return `Could not find a YouTube video title link on Tab [Tab ID: ${id}].`;
    } catch (err: any) {
      return `Failed to click YouTube video on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async scroll(direction: 'up' | 'down' | 'top' | 'bottom', tabId?: number | string): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(tabId);
      if (direction === 'bottom') {
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      } else if (direction === 'top') {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      } else if (direction === 'down') {
        await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }));
      } else if (direction === 'up') {
        await page.evaluate(() => window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' }));
      }
      await new Promise(r => setTimeout(r, 800));
      return `Scrolled Tab [Tab ID: ${id}] ${direction}`;
    } catch (err: any) {
      return `Failed to scroll Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async analyzePage(tabId?: number | string): Promise<string> {
    try {
      const { id, page } = await this.resolvePage(tabId);
      
      const elementsMap = await page.evaluate(() => {
        document.querySelectorAll('.elyra-tag-overlay').forEach(e => e.remove());
        
        let counter = 1;
        const results: any[] = [];
        
        const elements = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
        
        elements.forEach((el) => {
          if (counter > 200) return;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) return;
          
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
          
          const eid = counter++;
          el.setAttribute('data-elyra-id', eid.toString());
          
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
          overlay.textContent = `[${eid}]`;
          document.body.appendChild(overlay);
          
          let text = (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '';
          text = text.substring(0, 30).replace(/\n/g, ' ').trim();
          
          results.push({
            id: eid,
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || '',
            name: el.getAttribute('name') || '',
            placeholder: el.getAttribute('placeholder') || '',
            text
          });
        });
        
        return results;
      });
      
      if (elementsMap.length === 0) return `No visible interactive elements found on Tab [Tab ID: ${id}].`;
      
      const chunks = elementsMap.map((e: any) => {
        let desc = `[${e.id}]: ${e.tag}`;
        if (e.type) desc += `(type=${e.type})`;
        if (e.name) desc += `(name=${e.name})`;
        if (e.placeholder) desc += `(placeholder="${e.placeholder}")`;
        if (e.text) desc += ` - "${e.text}"`;
        return desc;
      });
      
      return `Tab [Tab ID: ${id}] interactive elements: ${chunks.join(', ')}`;
    } catch (err: any) {
      return `Failed to analyze page on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async clickElement(id: number, tabId?: number | string): Promise<string> {
    try {
      const { id: tid, page } = await this.resolvePage(tabId);
      const loc = page.locator(`[data-elyra-id="${id}"]`);
      if (await loc.count() === 0) {
        return `Element with ID [${id}] not found on Tab [Tab ID: ${tid}]. Did you run browser_analyze_page first?`;
      }
      await loc.scrollIntoViewIfNeeded();
      await loc.click({ force: true, timeout: 5000 });
      return `Clicked element [${id}] on Tab [Tab ID: ${tid}].`;
    } catch (err: any) {
      return `Failed to click element ${id} on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async fillForm(fields: {id: number, text: string}[], tabId?: number | string): Promise<string> {
    try {
      const { id: tid, page } = await this.resolvePage(tabId);
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
      return `Form filled on Tab [Tab ID: ${tid}]: ${results.join(', ')}`;
    } catch (err: any) {
      return `Failed to fill form on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }

  public async closeTab(target?: string | number): Promise<string> {
    try {
      const tabs = await this.syncTabs();
      if (tabs.length === 0) {
        return "No open tabs to close.";
      }

      let tabToClose: { id: number; page: Page } | null = null;

      if (target !== undefined && target !== null && String(target).trim() !== '') {
        const targetStr = String(target).trim();
        const parsedNum = parseInt(targetStr.replace(/\D/g, ''), 10);
        if (!isNaN(parsedNum)) {
          tabToClose = tabs.find(t => t.id === parsedNum) || null;
        }

        if (!tabToClose) {
          const targetLower = targetStr.toLowerCase();
          for (const t of tabs) {
            let title = '';
            try { title = (await t.page.title()).toLowerCase(); } catch (e) {}
            const url = t.page.url().toLowerCase();
            if (title.includes(targetLower) || url.includes(targetLower)) {
              tabToClose = t;
              break;
            }
          }
        }
      }

      if (!tabToClose) {
        tabToClose = tabs.find(t => t.id === this.currentTabId) || tabs[tabs.length - 1];
      }

      const closedId = tabToClose.id;
      let title = 'Tab';
      try { title = await tabToClose.page.title(); } catch (e) {}
      await tabToClose.page.close();
      this.tabIdMap.delete(closedId);

      const remainingTabs = await this.syncTabs();
      if (remainingTabs.length > 0) {
        const next = remainingTabs[remainingTabs.length - 1];
        this.currentTabId = next.id;
        this.page = next.page;
        await next.page.bringToFront();
        let nextTitle = '';
        try { nextTitle = await next.page.title(); } catch (e) {}
        return `Closed Tab [Tab ID: ${closedId}] ("${title}"). Active tab is now Tab [Tab ID: ${next.id}] ("${nextTitle}").`;
      } else {
        this.page = null;
        return `Closed Tab [Tab ID: ${closedId}] ("${title}"). No open tabs remain in browser.`;
      }
    } catch (err: any) {
      return `Failed to close tab: ${err.message}`;
    }
  }

  public async pressKey(key: string, tabId?: number | string): Promise<string> {
    try {
      const { id: tid, page } = await this.resolvePage(tabId);
      await page.keyboard.press(key);
      return `Pressed key "${key}" on Tab [Tab ID: ${tid}].`;
    } catch (err: any) {
      return `Failed to press key on Tab [Tab ID: ${tabId || this.currentTabId}]: ${err.message}`;
    }
  }
}
