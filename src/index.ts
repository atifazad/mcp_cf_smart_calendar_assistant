import { UserPreferencesDO } from './durable-objects/UserPreferences';
import { Env } from './types';

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
      if (path.startsWith('/api/calendar')) {
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

async function handleCalendarAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/calendar', '');

  // For now, return a placeholder response
  return new Response(
    JSON.stringify({ 
      message: 'Calendar API endpoint',
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

async function handleAIAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/ai', '');

  // For now, return a placeholder response
  return new Response(
    JSON.stringify({ 
      message: 'AI API endpoint',
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