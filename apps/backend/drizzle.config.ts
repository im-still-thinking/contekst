import type { Config } from 'drizzle-kit'
import { config } from './src/lib/config'

export default {
  schema: './src/models/*',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: config.MYSQL_URL,
    // database: 'your_custom_db_name' // Only needed if different from URL or using default
  }
} satisfies Config