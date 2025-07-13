import { UserPreferencesDO } from './durable-objects/UserPreferences';
import { Env } from './types';
import { GoogleCalendarAuth } from './auth/google-calendar';
import { GoogleCalendarAPI } from './services/google-calendar';
import { AIAgent, AIMessage } from './services/ai-agent';
import { executeTool, getToolSchema } from './tools/calendar-tools';
import './styles.css';

export { UserPreferencesDO as UserPreferences };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // Route to appropriate handler
      if (path.startsWith('/auth/google')) {
        return await handleGoogleAuth(request, env);
      } else if (path.startsWith('/api/calendar')) {
        return await handleCalendarAPI(request, env);
      } else if (path.startsWith('/api/ai')) {
        return await handleAIAPI(request, env);
      } else if (path.startsWith('/api/mcp')) {
        return await handleMCPAPI(request, env);
      } else if (path === '/') {
        return await handleRoot(request);
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }
  },
};

async function handleGoogleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/auth/google', '');
  const auth = new GoogleCalendarAuth(env);

  if (path === '/login') {
    // Generate OAuth URL
    const authUrl = auth.generateAuthUrl();
    return new Response(
      JSON.stringify({ authUrl }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  if (path === '/callback') {
    // Handle OAuth callback
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        JSON.stringify({ error: 'OAuth authorization failed' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No authorization code provided' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    try {
      const tokens = await auth.exchangeCodeForToken(code);
      
      // Store tokens in Durable Object
      const userId = 'default'; // In a real app, you'd get this from the user session
      const userPreferencesId = env.USER_PREFERENCES.idFromName(userId);
      const userPreferences = env.USER_PREFERENCES.get(userPreferencesId);
      
      const storeResponse = await userPreferences.fetch('http://localhost/oauth-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      if (!storeResponse.ok) {
        throw new Error('Failed to store tokens');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Authentication successful'
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    } catch (error) {
      console.error('Token exchange error:', error);
      return new Response(
        JSON.stringify({ error: 'Token exchange failed' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }
  }

  return new Response('Not found', { status: 404 });
}

async function handleCalendarAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/calendar', '');

  // If it's just the root calendar endpoint, show available endpoints
  if (path === '') {
    return new Response(
      JSON.stringify({ 
        message: 'Calendar API endpoint',
        availableEndpoints: [
          'GET /api/calendar/events - List calendar events',
          'POST /api/calendar/events - Create calendar event',
          'GET /api/calendar/free-time - Find free time slots',
          'GET /api/calendar/analyze - Analyze schedule patterns'
        ],
        authentication: 'All endpoints require Google Calendar OAuth authentication',
        authEndpoint: '/auth/google/login'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  // Get user's OAuth tokens
  const userId = 'default'; // In a real app, you'd get this from the user session
  const userPreferencesId = env.USER_PREFERENCES.idFromName(userId);
  const userPreferences = env.USER_PREFERENCES.get(userPreferencesId);
  
  const tokensResponse = await userPreferences.fetch('http://localhost/oauth-tokens');
  if (!tokensResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Not authenticated. Please authenticate with Google Calendar first.' }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  const tokensData = await tokensResponse.json() as { tokens?: any };
  const tokens = tokensData.tokens;
  if (!tokens || !tokens.access_token) {
    return new Response(
      JSON.stringify({ error: 'No valid access token found. Please re-authenticate.' }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  const calendarAPI = new GoogleCalendarAPI(tokens.access_token);

  try {
    if (path === '/events') {
      if (request.method === 'GET') {
        const params = new URLSearchParams(url.search);
        const timeMin = params.get('timeMin') || new Date().toISOString();
        const timeMax = params.get('timeMax') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const events = await calendarAPI.listEvents('primary', {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        return new Response(
          JSON.stringify({ events }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        );
      }

      if (request.method === 'POST') {
        const eventData = await request.json() as any;
        const event = await calendarAPI.createEvent('primary', eventData);

        return new Response(
          JSON.stringify({ event }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        );
      }
    }

    if (path === '/free-time') {
      const params = new URLSearchParams(url.search);
      const startTime = params.get('startTime') || new Date().toISOString();
      const endTime = params.get('endTime') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const duration = parseInt(params.get('duration') || '60');

      const freeSlots = await calendarAPI.findFreeTime(startTime, endTime, duration);

      return new Response(
        JSON.stringify({ freeSlots }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    if (path === '/analyze') {
      const params = new URLSearchParams(url.search);
      const startDate = params.get('startDate') || new Date().toISOString();
      const endDate = params.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const analysis = await calendarAPI.analyzeSchedule(startDate, endDate);

      return new Response(
        JSON.stringify({ analysis }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Calendar API endpoint',
        availableEndpoints: [
          'GET /api/calendar/events - List calendar events',
          'POST /api/calendar/events - Create calendar event',
          'GET /api/calendar/free-time - Find free time slots',
          'GET /api/calendar/analyze - Analyze schedule patterns'
        ],
        path,
        method: request.method 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (error) {
    console.error('Calendar API error:', error);
    return new Response(
      JSON.stringify({ error: 'Calendar API error', details: (error as Error).message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}

async function handleAIAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/ai', '');
  const aiAgent = new AIAgent(env);

  if (path === '/chat') {
    if (request.method === 'POST') {
      try {
        const { message, stream = false } = await request.json() as { message: string; stream?: boolean };
        
        // Get user's OAuth tokens for calendar access
        const userId = 'default';
        const userPreferencesId = env.USER_PREFERENCES.idFromName(userId);
        const userPreferences = env.USER_PREFERENCES.get(userPreferencesId);
        
        const tokensResponse = await userPreferences.fetch('http://localhost/oauth-tokens');
        if (!tokensResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Please authenticate with Google Calendar first' }),
            { 
              status: 401, 
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              } 
            }
          );
        }

        const tokensData = await tokensResponse.json() as { tokens?: any };
        const tokens = tokensData.tokens;
        if (!tokens || !tokens.access_token) {
          return new Response(
            JSON.stringify({ error: 'No valid access token found. Please re-authenticate.' }),
            { 
              status: 401, 
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              } 
            }
          );
        }

        const calendarAPI = new GoogleCalendarAPI(tokens.access_token);

        // Create conversation messages
        const messages: AIMessage[] = [
          { role: 'system', content: aiAgent.createSystemPrompt() },
          { role: 'user', content: aiAgent.createUserPrompt(message) }
        ];

        if (stream) {
          // Return streaming response
          const stream = await aiAgent.generateStreamingResponse(messages);
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } else {
          // Return regular response
          const response = await aiAgent.generateResponse(messages);
          
          // Execute any tool calls
          if (response.toolCalls && response.toolCalls.length > 0) {
            const toolResults = [];
            for (const toolCall of response.toolCalls) {
              try {
                const result = await executeTool(toolCall.name, toolCall.parameters, calendarAPI);
                toolResults.push({ tool: toolCall.name, result });
              } catch (error) {
                toolResults.push({ tool: toolCall.name, error: (error as Error).message });
              }
            }
            
            return new Response(
              JSON.stringify({ 
                response: response.content,
                toolResults 
              }),
              { 
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                } 
              }
            );
          }

          return new Response(
            JSON.stringify({ response: response.content }),
            { 
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              } 
            }
          );
        }
      } catch (error) {
        console.error('AI API error:', error);
        return new Response(
          JSON.stringify({ error: 'AI processing failed', details: (error as Error).message }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        );
      }
    }
  }

  if (path === '/models') {
    // Return available models for A/B testing
    const models = aiAgent.getAvailableModels();
    return new Response(
      JSON.stringify({ 
        models,
        currentModel: aiAgent.getCurrentModel()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  if (path === '/tools') {
    // Return available tools
    const tools = getToolSchema();
    return new Response(
      JSON.stringify({ tools }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      message: 'AI API endpoint',
      availableEndpoints: [
        'POST /api/ai/chat - Chat with AI assistant',
        'GET /api/ai/models - List available models',
        'GET /api/ai/tools - List available tools'
      ],
      path,
      method: request.method 
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  );
}

async function handleMCPAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/mcp', '');

  // For now, return a placeholder response
  return new Response(
    JSON.stringify({ 
      message: 'MCP API endpoint',
      path,
      method: request.method 
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  );
}

async function handleRoot(request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      name: 'MCP CF Smart Calendar Assistant',
      version: '1.0.0',
      endpoints: {
        calendar: '/api/calendar',
        ai: '/api/ai',
        mcp: '/api/mcp'
      }
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  );
} 