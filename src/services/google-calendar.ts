import { GoogleCalendarEvent, GoogleCalendarListResponse } from '../types';

export class GoogleCalendarAPI {
  private accessToken: string;
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    return await response.json();
  }

  // List calendar events
  async listEvents(calendarId: string = 'primary', params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}): Promise<GoogleCalendarListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.timeMin) searchParams.append('timeMin', params.timeMin);
    if (params.timeMax) searchParams.append('timeMax', params.timeMax);
    if (params.maxResults) searchParams.append('maxResults', params.maxResults.toString());
    if (params.singleEvents !== undefined) searchParams.append('singleEvents', params.singleEvents.toString());
    if (params.orderBy) searchParams.append('orderBy', params.orderBy);

    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`;
    return await this.makeRequest(endpoint);
  }

  // Create a new calendar event
  async createEvent(calendarId: string = 'primary', event: {
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
    attendees?: Array<{ email: string; displayName?: string }>;
    location?: string;
  }): Promise<GoogleCalendarEvent> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events`;
    return await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Update an existing calendar event
  async updateEvent(calendarId: string = 'primary', eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
    return await this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  // Delete a calendar event
  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
    await this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  // Get free/busy information
  async getFreeBusy(timeMin: string, timeMax: string, items: Array<{ id: string }>): Promise<any> {
    const endpoint = '/freeBusy';
    return await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        timeMin,
        timeMax,
        items,
      }),
    });
  }

  // List available calendars
  async listCalendars(): Promise<any> {
    const endpoint = '/users/me/calendarList';
    return await this.makeRequest(endpoint);
  }

  // Get calendar details
  async getCalendar(calendarId: string = 'primary'): Promise<any> {
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}`;
    return await this.makeRequest(endpoint);
  }

  // Find free time slots
  async findFreeTime(
    startTime: string,
    endTime: string,
    durationMinutes: number,
    calendarId: string = 'primary'
  ): Promise<Array<{ start: string; end: string }>> {
    // Get busy times
    const freeBusy = await this.getFreeBusy(startTime, endTime, [{ id: calendarId }]);
    
    if (!freeBusy.calendars || !freeBusy.calendars[calendarId]) {
      throw new Error('Could not retrieve calendar busy times');
    }

    const busyTimes = freeBusy.calendars[calendarId].busy || [];
    const freeSlots: Array<{ start: string; end: string }> = [];

    // Convert times to Date objects for easier manipulation
    const start = new Date(startTime);
    const end = new Date(endTime);
    let current = new Date(start);

    // Find free slots between busy times
    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // If there's a gap before this busy time
      if (current < busyStart) {
        const slotEnd = new Date(Math.min(busyStart.getTime(), end.getTime()));
        const slotDuration = (slotEnd.getTime() - current.getTime()) / (1000 * 60); // in minutes

        if (slotDuration >= durationMinutes) {
          freeSlots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }

      current = new Date(Math.max(current.getTime(), busyEnd.getTime()));
    }

    // Check if there's free time after the last busy period
    if (current < end) {
      const slotDuration = (end.getTime() - current.getTime()) / (1000 * 60);
      if (slotDuration >= durationMinutes) {
        freeSlots.push({
          start: current.toISOString(),
          end: end.toISOString(),
        });
      }
    }

    return freeSlots;
  }

  // Analyze schedule patterns
  async analyzeSchedule(
    startDate: string,
    endDate: string,
    calendarId: string = 'primary'
  ): Promise<{
    totalMeetings: number;
    totalDuration: number;
    averageMeetingDuration: number;
    busiestDay: string;
    busiestHour: number;
    backToBackMeetings: number;
  }> {
    const events = await this.listEvents(calendarId, {
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const meetings = events.items || [];
    let totalDuration = 0;
    let backToBackCount = 0;
    const dayMeetings: { [key: string]: number } = {};
    const hourMeetings: { [key: number]: number } = {};

    for (let i = 0; i < meetings.length; i++) {
      const meeting = meetings[i];
      const start = new Date((meeting.start as any).dateTime || (meeting.start as any).date);
      const end = new Date((meeting.end as any).dateTime || (meeting.end as any).date);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes

      totalDuration += duration;

      // Count meetings per day
      const dayKey = start.toISOString().split('T')[0];
      dayMeetings[dayKey] = (dayMeetings[dayKey] || 0) + 1;

      // Count meetings per hour
      const hour = start.getHours();
      hourMeetings[hour] = (hourMeetings[hour] || 0) + 1;

      // Check for back-to-back meetings
      if (i > 0) {
        const prevMeeting = meetings[i - 1];
        const prevEnd = new Date((prevMeeting.end as any).dateTime || (prevMeeting.end as any).date);
        const timeBetween = (start.getTime() - prevEnd.getTime()) / (1000 * 60);
        if (timeBetween <= 15) { // 15 minutes or less between meetings
          backToBackCount++;
        }
      }
    }

    const busiestDay = Object.entries(dayMeetings).length > 0 
      ? Object.entries(dayMeetings).reduce((a, b) => 
          dayMeetings[a[0]] > dayMeetings[b[0]] ? a : b
        )[0]
      : '';

    const busiestHour = Object.entries(hourMeetings).length > 0
      ? Object.entries(hourMeetings).reduce((a, b) => 
          hourMeetings[parseInt(a[0])] > hourMeetings[parseInt(b[0])] ? a : b
        )[0]
      : '0';

    return {
      totalMeetings: meetings.length,
      totalDuration,
      averageMeetingDuration: meetings.length > 0 ? totalDuration / meetings.length : 0,
      busiestDay,
      busiestHour: parseInt(busiestHour),
      backToBackMeetings: backToBackCount,
    };
  }
} 