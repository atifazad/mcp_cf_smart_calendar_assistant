# MCP CF Smart Calendar Assistant

An AI-powered calendar assistant built with Cloudflare Workers, Agent SDK, and Remote MCP Platform that intelligently analyzes your Google Calendar and suggests optimal meeting times.

## 🚀 Features

- **Natural Language Processing**: Ask questions like "What meetings do I have today?" or "Find me 2 hours for deep work"
- **Smart Scheduling**: AI analyzes calendar patterns and suggests optimal time slots
- **Proactive Insights**: Detects back-to-back meetings and suggests breaks
- **Real-time Updates**: WebSocket connection for live calendar changes
- **User Preferences**: Learns your scheduling patterns and preferences

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Interface │    │  Cloudflare AI   │    │ Google Calendar │
│   (Chat UI)     │◄──►│   Agent SDK      │◄──►│      API        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  MCP Server      │
                       │  (Remote)        │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Durable Objects  │
                       │ (User State)     │
                       └──────────────────┘
```

## 🛠️ Tech Stack

- **Cloudflare Workers** - Serverless runtime
- **Cloudflare Agent SDK** - AI capabilities
- **Remote MCP Platform** - Tool integration
- **Durable Objects** - State management
- **Google Calendar API** - Calendar operations
- **TypeScript** - Type safety
- **WebSockets** - Real-time updates

## 📋 Prerequisites

- Node.js 18+ 
- Cloudflare account
- Google Cloud Console project with Calendar API enabled

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file for local development:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/callback
AI_MODEL=mistral-7b-instruct-v0.2
ENVIRONMENT=development
```

### 3. Set Cloudflare Secrets

```bash
# Set secrets for production
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Deploy to Cloudflare

```bash
npm run deploy
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run test` - Run tests
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code linting
- `npm run format` - Prettier code formatting

## 🔌 API Endpoints

### Calendar API
- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/events` - Create calendar event
- `GET /api/calendar/free-time` - Find available time slots

### AI API
- `POST /api/ai/query` - Natural language calendar queries
- `POST /api/ai/analyze` - Schedule analysis

### MCP API
- `POST /api/mcp/tools` - MCP tool execution
- `GET /api/mcp/schema` - MCP tool schema

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- calendar.test.ts
```

## 📚 Documentation

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare AI Documentation](https://developers.cloudflare.com/ai/)
- [Google Calendar API Documentation](https://developers.google.com/calendar)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in this repository
- Check the documentation
- Review the Cloudflare Workers and AI documentation 