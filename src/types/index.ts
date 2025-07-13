// Google Calendar API Types
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
  recurringEventId?: string;
  originalStartTime?: {
    dateTime: string;
    timeZone: string;
  };
}

export interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

// AI Agent Types
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationState {
  messages: ConversationMessage[];
  context: {
    currentUser?: string;
    calendarId?: string;
    timezone?: string;
  };
}

// User Preferences Types
export interface UserPreferences {
  preferredMeetingTimes: {
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  };
  preferredBreakDuration: number; // minutes
  workDays: number[]; // 0-6, where 0 is Sunday
  timezone: string;
  notificationSettings: {
    email: boolean;
    push: boolean;
  };
}

// MCP Tool Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export interface MCPToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPToolResult {
  tool: string;
  result: any;
  error?: string;
}

// Calendar Analysis Types
export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  isAvailable: boolean;
}

export interface ScheduleAnalysis {
  totalMeetings: number;
  totalDuration: number; // minutes
  backToBackMeetings: number;
  suggestedBreaks: TimeSlot[];
  optimalWorkSlots: TimeSlot[];
  conflicts: Array<{
    type: 'overlap' | 'back-to-back' | 'insufficient-break';
    events: GoogleCalendarEvent[];
  }>;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CalendarQueryRequest {
  query: string;
  userId: string;
  context?: {
    dateRange?: {
      start: string;
      end: string;
    };
    calendarId?: string;
  };
}

export interface CalendarQueryResponse {
  response: string;
  actions?: Array<{
    type: 'create_event' | 'update_event' | 'delete_event' | 'suggest_break';
    data: any;
  }>;
  analysis?: ScheduleAnalysis;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'calendar_update' | 'ai_response' | 'error' | 'ping';
  data?: any;
  timestamp: Date;
}

// Environment Variables
export interface Env {
  USER_PREFERENCES: DurableObjectNamespace;
  AI: any; // Cloudflare Workers AI binding
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  AI_MODEL: string;
  ENVIRONMENT: string;
}

// Cloudflare Workers specific types
declare global {
  interface DurableObjectNamespace {
    get(id: DurableObjectId): DurableObjectStub;
  }
  
  interface DurableObjectId {
    toString(): string;
  }
} 