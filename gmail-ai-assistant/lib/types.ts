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
  type: 'archive' | 'calendar' | 'drive' | 'docs' | 'task' | 'label' | 'reply' | 'forward' | 'delete' | 'custom';
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


export interface GoogleCredentials {
  web: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    redirect_uris: string[];
  };
}

