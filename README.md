# Contekst

**Contekst** is a high-performance unified memory layer designed to provide seamless context continuity across any AI application.

## 🚀 Key Features

- **Intent-based Memory Storage**: Instead of just summarizing text, it focuses on categorically capturing the user's intents, facts and summaries.
- **Fast Semantic Search**: Advanced sub-second retrieval algorithm using multiple retrieval techniques.
- **Cross-LLM Compatibility**: You can switch between different LLM platforms and still maintain the context of the conversation.
- **Decentralized Storage**: It uses a scalable cloud database hosted on a decentralized computing platform like Fluence.
- **Blockchain Integration**: Smart contracts for memory management and decentralized storage verification.
- **Browser Extension**: Seamless integration with ChatGPT and Claude for enhanced context awareness.

## 🏗️ Architecture

- **Runtime**: Bun (which is faster than Node.js)
- **Backend Framework**: ElysiaJS with TypeScript (hosted on Fluence)
- **Frontend**: Next.js 14 with React 18 and Tailwind CSS (deployed on Vercel)
- **Vector Database**: Qdrant (using 3072D embeddings for better intent understanding) - hosted on Fluence
- **Embeddings**: OpenAI's `text-embedding-3-large`
- **Database**: MySQL with connection pooling - hosted on Fluence
- **AI Computation**: OpenAI's `gpt-5-mini` for intent extraction
- **Blockchain**: Ethereum/Sui integration with smart contracts
- **Caching**: Redis for high-performance caching - hosted on Fluence
- **Image Storage**: Walrus decentralized storage

## 📁 Project Structure

This is a monorepo using Bun workspaces:

- `apps/backend` - Backend API server with ElysiaJS
- `apps/frontend` - Next.js web application with wallet authentication
- `apps/extension` - Chrome extension for ChatGPT and Claude integration
- `apps/contracts` - Smart contracts for memory management and storage
- `packages/` - Shared packages and utilities

## 🔌 API Endpoints

### Memory Management
- **`POST /api/v1/memory/process`**: Saves a new memory with intent-focused processing
- **`POST /api/v1/memory/retrieve`**: Searches memories using semantic similarity with vector search
- **`GET /api/v1/memory/list`**: Lists all memories for a user with pagination
- **`GET /api/v1/memory/image/:blobId`**: Retrieves images from decentralized storage

### Authentication
- **`POST /api/auth/signin`**: Wallet-based authentication
- **`POST /api/auth/verify`**: Verify authentication tokens

### Lease Management
- **`POST /api/v1/lease/create`**: Create memory lease agreements
- **`GET /api/v1/lease/:id`**: Get lease details

### Audit
- **`GET /api/v1/audit/logs`**: Get audit logs for memory operations

### Health Check
- **`GET /health`**: Health check endpoint with queue status and system metrics

## ⚙️ Setup Instructions

### Prerequisites
- [Bun](https://bun.sh) installed (latest version)
- Fluence account for backend services
- OpenAI API key

### 1. Install Dependencies
```bash
bun install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp apps/backend/env.example apps/backend/.env

# Edit with your configuration
# Required: FLUENCE_BACKEND_URL, OPENAI_API_KEY
```

### 3. Database Setup
```bash
# Database is automatically managed by Fluence
# No local database setup required
```

### 4. Start Services

#### Development Mode
```bash
# Start all services
bun run dev

# Or start individual services
bun run dev:frontend  # Frontend on port 3001
bun run dev:extension # Extension build
```

#### Production Mode
```bash
# Build all apps
bun run build

# Frontend is automatically deployed to Vercel
# Backend is hosted on Fluence
```

### 5. Smart Contracts (Optional)
```bash
cd apps/contracts
bun install
bun run compile
bun run deploy
```

## 🛠️ Development

### Working with Individual Apps

#### Backend Development
```bash
cd apps/backend
bun run dev          # Start with hot reload
bun run build        # Build for production
bun run db:studio    # Open database studio
```

#### Frontend Development
```bash
cd apps/frontend
bun run dev          # Start Next.js dev server
bun run build        # Build for production
```

#### Extension Development
```bash
cd apps/extension
bun run dev          # Build extension in dev mode
bun run build        # Build for production
```

### Database Management
```bash
# Database is managed by Fluence
# Schema changes are handled through the Fluence platform
```

## 🔧 Configuration

### Required Environment Variables
- `FLUENCE_BACKEND_URL`: Fluence backend service URL
- `OPENAI_API_KEY`: OpenAI API key
- `JWT_SECRET`: JWT signing secret
- `MEMORY_CONTRACT_ADDRESS`: Smart contract address

### Optional Configuration
- `MEMORY_SIMILARITY_THRESHOLD`: Similarity threshold for memory retrieval (default: 0.7)

## 📦 Deployment

### Vercel Deployment (Frontend)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Fluence Deployment (Backend)
1. Deploy backend services to Fluence platform
2. Configure database and vector storage through Fluence
3. Set up environment variables in Fluence dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using [Bun](https://bun.sh) - the fast all-in-one JavaScript runtime.
