import { UserPreferences, ConversationState } from '../types';

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  expires_at: number; // Unix timestamp when token expires
}

export class UserPreferencesDO {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (request.method) {
        case 'GET':
          return await this.handleGet(path);
        case 'POST':
          return await this.handlePost(path, request);
        case 'PUT':
          return await this.handlePut(path, request);
        case 'DELETE':
          return await this.handleDelete(path);
        default:
          return new Response('Method not allowed', { status: 405 });
      }
    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async handleGet(path: string): Promise<Response> {
    if (path === '/preferences') {
      const preferences = await this.state.storage.get('preferences');
      return new Response(
        JSON.stringify({ preferences }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/conversation') {
      const conversation = await this.state.storage.get('conversation');
      return new Response(
        JSON.stringify({ conversation }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/oauth-tokens') {
      const tokens = await this.state.storage.get('oauth_tokens');
      return new Response(
        JSON.stringify({ tokens }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  private async handlePost(path: string, request: Request): Promise<Response> {
    if (path === '/conversation') {
      const message = await request.json() as { role: string; content: string };
      const conversation: ConversationState = await this.state.storage.get('conversation') || {
        messages: [],
        context: {}
      };

      conversation.messages.push({
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content,
        timestamp: new Date()
      });

      // Keep only last 50 messages to prevent memory issues
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }

      await this.state.storage.put('conversation', conversation);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/oauth-tokens') {
      const tokens: OAuthTokens = await request.json();
      
      // Calculate expiration time
      const expiresAt = Date.now() + (tokens.expires_in * 1000);
      tokens.expires_at = expiresAt;

      await this.state.storage.put('oauth_tokens', tokens);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  private async handlePut(path: string, request: Request): Promise<Response> {
    if (path === '/preferences') {
      const preferences: UserPreferences = await request.json();
      await this.state.storage.put('preferences', preferences);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleDelete(path: string): Promise<Response> {
    if (path === '/conversation') {
      await this.state.storage.delete('conversation');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/oauth-tokens') {
      await this.state.storage.delete('oauth_tokens');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }
} 