import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { apiRoutes } from './routes/auth'
import { memoryRoutes } from './routes/memory'
import { leaseRoutes } from './routes/lease'
import { auditRoutes } from './routes/audit'
import { config } from './lib/config'
import { initializeCollection, testQdrantConnection } from './lib/qdrant'

// Test Qdrant connection and initialize collection
async function setupQdrant() {
  try {
    console.log('📊 Testing Qdrant connection...')
    const connected = await testQdrantConnection()
    
    if (!connected) {
      console.warn('⚠️  Qdrant connection failed - embeddings will not work')
      return
    }
    
    console.log('📊 Initializing Qdrant collection...')
    await initializeCollection()
    console.log('✅ Qdrant setup complete')
  } catch (error) {
    console.error('❌ Qdrant setup failed:', error)
  }
}

// Setup Qdrant in background
setupQdrant()

const app = new Elysia()
    .use(cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }))
    .use(apiRoutes)
    .group('/api/v1', (app) => 
      app
        .use(memoryRoutes)
        .use(leaseRoutes)
        .use(auditRoutes)
    )
    .get('/', () => 'Contekst Super Memory Backend API 🧠')
    .listen(config.PORT)

console.log(`🚀 Server running on http://localhost:${config.PORT}`)