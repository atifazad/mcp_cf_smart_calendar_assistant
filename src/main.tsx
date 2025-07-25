import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { buildApiUrl, currentConfig } from './config';
import './styles.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tools?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  parameters: any;
  status: 'pending' | 'confirmed' | 'executed' | 'error';
  result?: any;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(buildApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId: 'web-interface-session'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I received your message but had trouble processing it.',
        timestamp: new Date(),
        tools: data.toolResults ? data.toolResults.map((tool: any, index: number) => ({
          id: `tool-${index}`,
          name: tool.tool,
          parameters: tool.parameters || {},
          status: tool.error ? 'error' : 'executed',
          result: tool.result
        })) : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI API:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again or check your authentication.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = () => {
    window.open(currentConfig.authUrl, '_blank');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-content">
          <h1>MCP CF Smart Calendar Assistant</h1>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="main">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to your AI Calendar Assistant!</h2>
              <p>I can help you:</p>
              <ul>
                <li>Check your schedule and upcoming meetings</li>
                <li>Find free time slots for deep work</li>
                <li>Schedule meetings with optimal timing</li>
                <li>Analyze your calendar patterns</li>
                <li>Suggest breaks between back-to-back meetings</li>
              </ul>
              <p>Try asking: "What meetings do I have today?" or "Find me 2 hours for deep work"</p>
              <p><strong>API Endpoint:</strong> {currentConfig.baseUrl}</p>
              <button onClick={handleAuthenticate} className="auth-button">
                🔐 Authenticate with Google Calendar
              </button>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                {message.tools && message.tools.length > 0 && (
                  <div className="tools">
                    {message.tools.map((tool) => (
                      <div key={tool.id} className={`tool ${tool.status}`}>
                        <span className="tool-name">{tool.name}</span>
                        <span className="tool-status">{tool.status}</span>
                        {tool.result && (
                          <div className="tool-result">
                            <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant">
              <div className="message-content">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your calendar..."
              disabled={isLoading}
              className="message-input"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="send-button"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />); 