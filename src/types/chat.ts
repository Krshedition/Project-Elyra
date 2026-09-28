export type ElyraState = 
  | 'idle' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'working' 
  | 'approval' 
  | 'sending' 
  | 'success' 
  | 'error';

export interface ActivityStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
}

export interface EmailDraft {
  id: string;
  to: string;
  recipientName?: string;
  subject: string;
  body: string;
  status: 'drafting' | 'waiting_approval' | 'sending' | 'sent' | 'error';
  createdAt: string;
  sentAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  activity?: {
    title: string;
    steps: ActivityStep[];
  };
  emailDraft?: EmailDraft;
  isSuccess?: boolean;
  error?: string;
}

export interface Contact {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface WorkflowSubStep {
  id: string;
  stepNumber: number;
  title: string;
  subProblem: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'healing' | 'healed';
  actionName?: string;
  actionDetails?: string;
  verificationMethod?: string;
  verificationResult?: string;
  recoveryNote?: string;
  selfHealed?: boolean;
  timestamp?: string;
  durationMs?: number;
}

export interface AutomatedTask {
  id: string;
  title: string;
  goal: string;
  category: 'cross_app' | 'browser' | 'email' | 'system';
  sourceApp?: string; // e.g. "ChatGPT"
  targetApp?: string; // e.g. "WhatsApp (Yash)"
  status: 'planning' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'healing';
  currentStepIndex: number;
  steps: WorkflowSubStep[];
  startedAt: string;
  completedAt?: string;
  logs: string[];
}
