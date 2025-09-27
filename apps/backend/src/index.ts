import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authRoutes } from './routes/auth'
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
    .use(cors())
    .group('/api/v1', (app) => 
      app
        .use(authRoutes)
        .use(memoryRoutes)
        .use(leaseRoutes)
        .use(auditRoutes)
    )
    .get('/', () => 'Contekst Super Memory Backend API 🧠')
    .listen(config.PORT)

console.log(`🚀 Server running on http://localhost:${config.PORT}`)