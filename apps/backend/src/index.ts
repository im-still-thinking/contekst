import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { apiRoutes } from './routes/auth'
import { memoryRoutes } from './routes/memory'
import { leaseRoutes } from './routes/lease'
import { auditRoutes } from './routes/audit'
import { config } from './lib/config'
import { initializeCollection } from './lib/qdrant'

// Initialize Qdrant collection in background
initializeCollection().then(() => {
  console.log('📊 Qdrant collection ready')
}).catch(err => {
  console.warn('⚠️  Qdrant collection init failed:', err.message)
})

const app = new Elysia()
    .use(cors({
      origin: "http://localhost:3001",
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