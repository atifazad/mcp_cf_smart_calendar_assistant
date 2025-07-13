import { GoogleCalendarAPI } from '../services/google-calendar';

export interface CalendarTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, calendarAPI: GoogleCalendarAPI) => Promise<any>;
}

export const calendarTools: CalendarTool[] = [
  {
    name: 'list_events',
    description: 'List calendar events within a time range',
    parameters: {
      timeMin: { type: 'string', description: 'Start time (ISO format)' },
      timeMax: { type: 'string', description: 'End time (ISO format)' }
    },
    execute: async (params, calendarAPI) => {
      const { timeMin, timeMax } = params;
      const events = await calendarAPI.listEvents('primary', {
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      return events;
    }
  },
  {
    name: 'find_free_time',
    description: 'Find available time slots for a specified duration',
    parameters: {
      startTime: { type: 'string', description: 'Start time (ISO format)' },
      endTime: { type: 'string', description: 'End time (ISO format)' },
      duration: { type: 'number', description: 'Duration in minutes' }
    },
    execute: async (params, calendarAPI) => {
      const { startTime, endTime, duration } = params;
      const freeSlots = await calendarAPI.findFreeTime(
        startTime || new Date().toISOString(),
        endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration || 60
      );
      return freeSlots;
    }
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event',
    parameters: {
      summary: { type: 'string', description: 'Event title' },
      start: { type: 'string', description: 'Start time (ISO format)' },
      end: { type: 'string', description: 'End time (ISO format)' },
      description: { type: 'string', description: 'Event description (optional)' },
      location: { type: 'string', description: 'Event location (optional)' }
    },
    execute: async (params, calendarAPI) => {
      const { summary, start, end, description, location } = params;
      const event = await calendarAPI.createEvent('primary', {
        summary,
        start: {
          dateTime: start,
          timeZone: 'UTC'
        },
        end: {
          dateTime: end,
          timeZone: 'UTC'
        },
        description,
        location
      });
      return event;
    }
  },
  {
    name: 'analyze_schedule',
    description: 'Analyze schedule patterns and provide insights',
    parameters: {
      startDate: { type: 'string', description: 'Start date (ISO format)' },
      endDate: { type: 'string', description: 'End date (ISO format)' }
    },
    execute: async (params, calendarAPI) => {
      const { startDate, endDate } = params;
      const analysis = await calendarAPI.analyzeSchedule(
        startDate || new Date().toISOString(),
        endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );
      return analysis;
    }
  }
];

// Execute a tool by name
export async function executeTool(
  toolName: string, 
  parameters: any, 
  calendarAPI: GoogleCalendarAPI
): Promise<any> {
  const tool = calendarTools.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await tool.execute(parameters, calendarAPI);
}

// Get tool schema for the AI
export function getToolSchema(): Array<{ name: string; description: string; parameters: any }> {
  return calendarTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
} 