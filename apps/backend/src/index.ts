import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authRoutes } from './routes/auth'
import { config } from './lib/config'

const app = new Elysia()
    .use(cors())
    .group('/api/v1', (app) => app.use(authRoutes))
    .get('/', () => 'Contekst Backend API')
    .listen(config.PORT)

console.log(`🚀 Server running on http://localhost:${config.PORT}`)