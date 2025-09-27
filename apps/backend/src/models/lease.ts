import { mysqlTable, varchar, timestamp, bigint, index } from 'drizzle-orm/mysql-core'
import { users } from './user'

export const memoryLeases = mysqlTable(
  'memory_leases',
  {
    id: varchar('id', { length: 256 }).primaryKey(),
    walletId: varchar('wallet_id', { length: 256 }).notNull().references(() => users.walletId),
    entity: varchar('entity', { length: 256 }).notNull(), // claude, chatgpt, etc.
    accessSpecifier: varchar('access_specifier', { length: 256 }).notNull(), // 'global' or source name
    expiresAt: timestamp('expires_at').notNull(),
    txHash: varchar('tx_hash', { length: 256 }).notNull(), // Blockchain transaction hash
    isRevoked: varchar('is_revoked', { length: 10 }).notNull().default('false'),
    revokedAt: timestamp('revoked_at'),
    revokeTxHash: varchar('revoke_tx_hash', { length: 256 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('wallet_idx').on(table.walletId),
    index('entity_idx').on(table.entity),
    index('expires_at_idx').on(table.expiresAt),
    index('access_specifier_idx').on(table.accessSpecifier)
  ]
)