import { Env } from '../types';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    parameters: any;
  }>;
}

export class AIAgent {
  private env: Env;
  private model: string;

  constructor(env: Env) {
    this.env = env;
    this.model = env.AI_MODEL || 'llama-3.1-70b-instruct';
  }

  // Get available models for A/B testing
  getAvailableModels(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        description: 'Fast, good for simple tasks (default)'
      },
      {
        id: 'llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        description: 'More capable but slower'
      },
      {
        id: 'mistral-7b-instruct-v0.2',
        name: 'Mistral 7B',
        description: 'Fast, good for general tasks'
      }
    ];
  }

  // Switch model for A/B testing
  setModel(modelId: string): void {
    this.model = modelId;
  }

  // Get current model
  getCurrentModel(): string {
    return this.model;
  }

  // Generate response using the AI model
  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const response = await this.env.AI.run(this.model, {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false
      });

      return {
        content: response.response,
        toolCalls: this.extractToolCalls(response.response)
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`AI generation failed: ${(error as Error).message}`);
    }
  }

  // Generate streaming response for real-time chat
  async generateStreamingResponse(messages: AIMessage[]): Promise<ReadableStream> {
    try {
      const response = await this.env.AI.run(this.model, {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      });

      return response.response;
    } catch (error) {
      console.error('AI streaming error:', error);
      throw new Error(`AI streaming failed: ${(error as Error).message}`);
    }
  }

  // Extract tool calls from AI response
  private extractToolCalls(response: string): Array<{ name: string; parameters: any }> {
    const toolCalls: Array<{ name: string; parameters: any }> = [];
    
    // Simple pattern matching for tool calls
    // In a real implementation, you'd use a more sophisticated parser
    const toolCallPattern = /@(\w+)\((.*?)\)/g;
    let match;
    
    while ((match = toolCallPattern.exec(response)) !== null) {
      try {
        const toolName = match[1];
        const parameters = JSON.parse(match[2]);
        toolCalls.push({ name: toolName, parameters });
      } catch (e) {
        console.warn('Failed to parse tool call:', match[0]);
      }
    }
    
    return toolCalls;
  }

  // Create system prompt for calendar assistant
  createSystemPrompt(): string {
    return `You are an AI calendar assistant that helps users manage their Google Calendar. You can:

1. List calendar events
2. Find free time slots
3. Create new events
4. Analyze schedule patterns
5. Provide scheduling recommendations

Available tools:
- @list_events(timeMin, timeMax) - List calendar events
- @find_free_time(startTime, endTime, duration) - Find available time slots
- @create_event(summary, start, end, description) - Create a new event
- @analyze_schedule(startDate, endDate) - Analyze schedule patterns

Always be helpful, concise, and provide actionable insights. When suggesting times, consider the user's preferences and current schedule.`;
  }

  // Create user prompt for calendar queries
  createUserPrompt(query: string): string {
    return `User query: ${query}

Please help with this calendar request. If you need to use any tools, format them as @tool_name(parameters).`;
  }
} 