export class DataService {
  private static instance: DataService;

  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Headless web search using DuckDuckGo instant API + Wikipedia entity fallback
   */
  public async searchWeb(query: string): Promise<{ success: boolean; query: string; results: any[]; summary: string }> {
    try {
      const trimmed = query.trim();
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'ElyraDesktopAssistant/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json() as any;
      const results: any[] = [];

      if (data.AbstractText) {
        results.push({
          source: data.AbstractSource || 'DuckDuckGo Abstract',
          title: data.Heading || trimmed,
          snippet: data.AbstractText,
          url: data.AbstractURL,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.slice(0, 80),
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }

      // If DuckDuckGo returned few details, fallback to Wikipedia summary
      if (results.length === 0) {
        try {
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`;
          const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'ElyraDesktopAssistant/1.0' } });
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json() as any;
            if (wikiData.extract) {
              results.push({
                source: 'Wikipedia',
                title: wikiData.title,
                snippet: wikiData.extract,
                url: wikiData.content_urls?.desktop?.page,
              });
            }
          }
        } catch {
          // ignore wiki error
        }
      }

      const summary = results.length > 0 
        ? results.map(r => `• [${r.source || 'Result'}] ${r.title}: ${r.snippet}`).join('\n\n')
        : `No direct instant summary found for "${query}". You can use browser_navigate to inspect the full web page.`;

      return {
        success: true,
        query: trimmed,
        results,
        summary,
      };
    } catch (err: any) {
      console.error('[DataService] Search failed:', err);
      return {
        success: false,
        query,
        results: [],
        summary: `Headless search failed: ${err.message}`,
      };
    }
  }

  /**
   * Headless weather fetching via wttr.in JSON format (no API key required)
   */
  public async fetchWeather(city: string = 'Bhopal'): Promise<{ success: boolean; city: string; weather?: any; message: string }> {
    try {
      const cleanCity = city.trim() || 'Bhopal';
      const url = `https://wttr.in/${encodeURIComponent(cleanCity)}?format=j1`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Weather service returned HTTP ${res.status}`);
      }

      const data = await res.json() as any;
      const current = data.current_condition?.[0];
      const today = data.weather?.[0];

      if (!current) {
        throw new Error('Weather data structure missing current condition');
      }

      const tempC = current.temp_C;
      const feelsLikeC = current.FeelsLikeC;
      const desc = current.weatherDesc?.[0]?.value || 'Clear';
      const humidity = current.humidity;
      const windSpeed = current.windspeedKmph;
      const maxTemp = today?.maxtempC || tempC;
      const minTemp = today?.mintempC || tempC;

      const report = `Weather in ${cleanCity}: ${desc}, ${tempC}°C (feels like ${feelsLikeC}°C). Humidity: ${humidity}%, Wind: ${windSpeed} km/h. Today's forecast: High ${maxTemp}°C / Low ${minTemp}°C.`;

      return {
        success: true,
        city: cleanCity,
        weather: {
          tempC,
          feelsLikeC,
          condition: desc,
          humidity,
          windSpeed,
          maxTemp,
          minTemp,
        },
        message: report,
      };
    } catch (err: any) {
      console.error('[DataService] Weather fetch failed:', err);
      return {
        success: false,
        city,
        message: `Failed to fetch weather for ${city}: ${err.message}`,
      };
    }
  }

  /**
   * Headless web page content scraper (strips HTML, scripts, styles)
   */
  public async fetchUrlContent(url: string): Promise<{ success: boolean; url: string; content: string }> {
    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      let rawText = await res.text();

      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(rawText);
          return { success: true, url: targetUrl, content: JSON.stringify(parsed, null, 2).slice(0, 3000) };
        } catch {}
      }

      // Clean HTML: Remove scripts, styles, head, tags
      let clean = rawText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      if (clean.length > 2500) {
        clean = clean.slice(0, 2500) + '... [Content truncated]';
      }

      return {
        success: true,
        url: targetUrl,
        content: clean || 'Page contains no readable text content.',
      };
    } catch (err: any) {
      console.error('[DataService] fetchUrlContent failed:', err);
      return {
        success: false,
        url,
        content: `Failed to fetch URL: ${err.message}`,
      };
    }
  }

  /**
   * Crypto price lookup using CoinGecko public API
   */
  public async fetchCrypto(symbol: string): Promise<{ success: boolean; symbol: string; message: string }> {
    try {
      const sym = symbol.toLowerCase().trim();
      const map: Record<string, string> = {
        btc: 'bitcoin',
        bitcoin: 'bitcoin',
        eth: 'ethereum',
        ethereum: 'ethereum',
        sol: 'solana',
        solana: 'solana',
        doge: 'dogecoin',
      };

      const coinId = map[sym] || sym;
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,inr`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as any;
      if (!data[coinId]) {
        return { success: false, symbol, message: `Could not find crypto price for symbol "${symbol}".` };
      }

      const usd = data[coinId].usd;
      const inr = data[coinId].inr;
      return {
        success: true,
        symbol,
        message: `${coinId.toUpperCase()}: $${usd} USD (₹${inr} INR)`,
      };
    } catch (e: any) {
      return { success: false, symbol, message: `Failed to fetch price for ${symbol}: ${e.message}` };
    }
  }
}
