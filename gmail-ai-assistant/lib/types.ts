import { gmail_v1 } from 'googleapis';

// Reuse Gmail API types
export type GmailMessage = gmail_v1.Schema$Message;
export type GmailLabel = gmail_v1.Schema$Label;

// Our custom types for the app
export interface EmailGroup {
  senderKey: string;  // Normalized sender for grouping
  senderName: string;
  senderEmail: string;
  relatedEmails: string[];  // Other email addresses from same sender
  messages: ParsedMessage[];
  totalCount: number;
  unreadCount: number;
  latestDate: string;
  summary?: string;  // Claude-generated summary
}

export interface ParsedMessage {
  id: string;
  threadId?: string;
  subject: string;
  sender: string;
  senderEmail: string;
  date: string;
  snippet: string;
  labels: string[];
  body?: string;
}

export interface ActionSuggestion {
  id: string;
  type: 'archive' | 'calendar' | 'drive' | 'docs' | 'task' | 'custom';
  title: string;
  description: string;
  confidence: number;  // 0-100
  params?: Record<string, any>;  // Action-specific parameters
  apiCall?: string;  // For custom actions
}

export interface EmailAnalysis {
  emailGroup: EmailGroup;
  suggestions: ActionSuggestion[];
  reasoning?: string;
}

// Action execution result
export interface ActionResult {
  success: boolean;
  debug?: string[];
  message: string;
  details?: any;
  error?: string;
}

// Specific action parameter types
export interface CalendarEventParams {
  title: string;
  date: string;
  time?: string;
  duration?: string;
  description?: string;
  location?: string;
}

export interface TaskParams {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  project?: string;
}

export interface DriveParams {
  filename: string;
  folder?: string;
  format?: 'pdf' | 'docx' | 'txt';
  content?: string;
}

export interface GoogleCredentials {
  web: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    redirect_uris: string[];
  };
}

export interface CustomActionParams {
  apiEndpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

// UI state for actions
export interface ActionUIState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  expandedGroups: Set<string>;
  selectedActions: Set<string>;
}

export interface GoogleCredentials {
  installed: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    redirect_uris: string[];
  };
}