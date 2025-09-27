import { mysqlTable, varchar, text, timestamp, json, index, uniqueIndex } from 'drizzle-orm/mysql-core'
import { users } from './user'

export const memories = mysqlTable(
  'memories',
  {
    id: varchar('id', { length: 256 }).primaryKey(),
    userId: varchar('user_id', { length: 256 }).notNull().references(() => users.walletId),
    prompt: text('prompt').notNull(),
    source: varchar('source', { length: 256 }).notNull(),
    conversationThread: text('conversation_thread'),
    extractedMemory: text('extracted_memory').notNull(),
    tags: json('tags').$type<string[]>().notNull(),
    blockchainFingerprint: varchar('blockchain_fingerprint', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_idx').on(table.userId),
    index('source_idx').on(table.source),
    index('created_at_idx').on(table.createdAt),
    uniqueIndex('fingerprint_idx').on(table.blockchainFingerprint)
  ]
)

export const memoryEmbeddings = mysqlTable(
  'memory_embeddings',
  {
    id: varchar('id', { length: 256 }).primaryKey(),
    memoryId: varchar('memory_id', { length: 256 }).notNull().references(() => memories.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 256 }).notNull().references(() => users.walletId),
    qdrantId: varchar('qdrant_id', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('memory_idx').on(table.memoryId),
    index('user_idx').on(table.userId),
    uniqueIndex('qdrant_idx').on(table.qdrantId)
  ]
)

export const memoryImages = mysqlTable(
  'memory_images',
  {
    id: varchar('id', { length: 256 }).primaryKey(),
    memoryId: varchar('memory_id', { length: 256 }).notNull().references(() => memories.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 256 }).notNull().references(() => users.walletId),
    identifier: varchar('identifier', { length: 256 }).notNull(), // Walrus blobId - only store this, not base64
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('memory_idx').on(table.memoryId),
    index('user_idx').on(table.userId),
    index('identifier_idx').on(table.identifier)
  ]
)