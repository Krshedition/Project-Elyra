export interface N8nTriggerOptions {
  workflowName: string; // The webhook path configured in n8n (e.g. 'send-slack-message' or 'sync-google-calendar')
  payload: Record<string, any>;
}

export class N8nService {
  private static instance: N8nService;

  private constructor() {}

  public static getInstance(): N8nService {
    if (!N8nService.instance) {
      N8nService.instance = new N8nService();
    }
    return N8nService.instance;
  }

  private getBaseUrl(): string {
    return process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook';
  }

  public async triggerWorkflow(options: N8nTriggerOptions): Promise<{ success: boolean; workflow: string; response?: any; message: string }> {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, '');
    const cleanWorkflow = options.workflowName.replace(/^\/+/, '');
    const endpoint = `${baseUrl}/${cleanWorkflow}`;

    console.log(`[N8nService] Triggering webhook: ${endpoint} with payload:`, options.payload);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Project-Elyra-Assistant/1.0',
        },
        body: JSON.stringify(options.payload || {}),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        return {
          success: false,
          workflow: options.workflowName,
          response: data,
          message: `n8n webhook responded with status HTTP ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
        };
      }

      return {
        success: true,
        workflow: options.workflowName,
        response: data,
        message: `n8n workflow "${options.workflowName}" executed successfully.`,
      };
    } catch (err: any) {
      console.warn(`[N8nService] Failed to reach n8n at ${endpoint}:`, err.message);

      if (err.name === 'AbortError') {
        return {
          success: false,
          workflow: options.workflowName,
          message: `n8n workflow "${options.workflowName}" timed out after 10 seconds.`,
        };
      }

      return {
        success: false,
        workflow: options.workflowName,
        message: `Could not connect to n8n at ${endpoint}. Ensure your local n8n instance is running ('npx n8n') and the webhook node is active. Error: ${err.message}`,
      };
    }
  }

  public async checkHealth(): Promise<{ online: boolean; url: string }> {
    const url = process.env.N8N_HEALTH_URL || 'http://localhost:5678/healthz';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return { online: res.ok, url };
    } catch {
      return { online: false, url };
    }
  }
}
