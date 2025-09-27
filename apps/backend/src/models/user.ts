import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core"

export const users = mysqlTable('users', {
  walletId: varchar('wallet_id', { length: 256  }).primaryKey().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});