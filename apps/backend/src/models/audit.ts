import { mysqlTable, varchar, timestamp, text, json, index } from 'drizzle-orm/mysql-core'
import { users } from './user'
import { memoryLeases } from './lease'

export const memoryAuditTrail = mysqlTable(
  'memory_audit_trail',
  {
    id: varchar('id', { length: 256 }).primaryKey(),
    walletId: varchar('wallet_id', { length: 256 }).notNull().references(() => users.walletId),
    leaseId: varchar('lease_id', { length: 256 }).references(() => memoryLeases.id),
    entity: varchar('entity', { length: 256 }).notNull(), // claude, chatgpt, etc.
    action: varchar('action', { length: 50 }).notNull(), // 'access_granted', 'access_denied'
    reason: text('reason'), // Reason for denial or details
    userPrompt: text('user_prompt').notNull(),
    source: varchar('source', { length: 256 }), // Requested source filter
    accessedMemories: json('accessed_memories').$type<string[]>(), // Array of memory IDs that were returned
    memoryCount: varchar('memory_count', { length: 10 }).notNull().default('0'), // Number of memories returned
    txHash: varchar('tx_hash', { length: 256 }), // Blockchain audit transaction hash
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('wallet_idx').on(table.walletId),
    index('lease_idx').on(table.leaseId),
    index('entity_idx').on(table.entity),
    index('action_idx').on(table.action),
    index('created_at_idx').on(table.createdAt)
  ]
)