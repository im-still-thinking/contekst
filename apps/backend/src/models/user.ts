import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core"

export const users = mysqlTable('users', {
  walletId: varchar('wallet_id', { length: 256  }).primaryKey().notNull(),
  nonce: varchar('nonce', { length: 256  }).notNull()
});