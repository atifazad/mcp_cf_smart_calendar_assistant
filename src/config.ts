// API Configuration
export const API_CONFIG = {
  // Development
  development: {
    baseUrl: 'http://localhost:8787',
    authUrl: 'http://localhost:8787/auth/google/login',
    apiEndpoints: {
      chat: '/api/ai/chat',
      models: '/api/ai/models',
      tools: '/api/ai/tools',
      calendar: '/api/calendar',
      events: '/api/calendar/events',
      freeTime: '/api/calendar/free-time',
      analyze: '/api/calendar/analyze'
    }
  },
  // Production
  production: {
    baseUrl: 'https://mcp-cf-smart-calendar-assistant-prod.atifazad83.workers.dev',
    authUrl: 'https://mcp-cf-smart-calendar-assistant-prod.atifazad83.workers.dev/auth/google/login',
    apiEndpoints: {
      chat: '/api/ai/chat',
      models: '/api/ai/models',
      tools: '/api/ai/tools',
      calendar: '/api/calendar',
      events: '/api/calendar/events',
      freeTime: '/api/calendar/free-time',
      analyze: '/api/calendar/analyze'
    }
  }
};

// Set this to 'production' when deploying to production
const ENVIRONMENT = 'production'; // Change to 'development' for local testing

export const currentConfig = ENVIRONMENT === 'production' ? API_CONFIG.production : API_CONFIG.development;

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string) => {
  return `${currentConfig.baseUrl}${endpoint}`;
}; 