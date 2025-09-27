import { Elysia, t } from 'elysia'
import { eq, and, desc } from 'drizzle-orm'
import { processMemory, retrieveRelevantMemories } from '../lib/memory'
import { getJobStatus } from '../lib/redis'
import { db } from '../lib/db'
import { memories } from '../models/memory'

export const memoryRoutes = new Elysia({ prefix: '/memory' })
    .post('/process', async ({ body }) => {
        const { userId, prompt, source, conversationThread, images } = body

        if (!userId || !prompt || !source) {
            return { error: 'Missing required fields: userId, prompt, source' }
        }

        const result = await processMemory({
            userId,
            prompt,
            source,
            conversationThread,
            images
        })

        if (result.success) {
            return {
                message: 'Memory processing started',
                jobId: result.jobId,
                status: 'processing'
            }
        }

        return result
    }, {
        body: t.Object({
            userId: t.String(),
            prompt: t.String(),
            source: t.String(),
            conversationThread: t.Optional(t.String()),
            images: t.Optional(t.Array(t.Object({
                base64: t.String(),
                identifier: t.String()
            })))
        })
    })

    // Get job status
    .get('/job/:jobId', async ({ params: { jobId } }) => {
        const status = await getJobStatus(jobId)
        if (!status) {
            return { error: 'Job not found or expired' }
        }
        return status
    })

    // Retrieve relevant memories
    .post('/retrieve', async ({ body }) => {
        const { userId, userPrompt, entity, source, conversationThread, limit } = body

        if (!userId || !userPrompt || !entity) {
            return { error: 'Missing required fields: userId, userPrompt, entity' }
        }

        try {
            const memories = await retrieveRelevantMemories(
                userPrompt,
                userId,
                entity,
                source,
                conversationThread,
                limit || 5
            )

            return {
                success: true,
                memories,
                count: memories.length
            }
        } catch (error) {
            console.error('Memory retrieval failed:', error)
            return { 
                error: 'Failed to retrieve memories',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    }, {
        body: t.Object({
            userId: t.String(),
            userPrompt: t.String(),
            entity: t.String({ description: 'Entity making the request (claude, chatgpt, etc.)' }),
            source: t.Optional(t.String()), // Optional: filter to specific source
            conversationThread: t.Optional(t.String()),
            limit: t.Optional(t.Number({ minimum: 1, maximum: 20 }))
        })
    })

    // Get all memories for a user
    .get('/list/:userId', async ({ params: { userId }, query }) => {
        const { source, limit, offset } = query
        
        try {
            // Build where conditions
            const conditions = [eq(memories.userId, userId)]
            if (source) {
                conditions.push(eq(memories.source, source))
            }
            
            // Parse pagination parameters
            const limitNum = limit ? parseInt(limit as string) : 10
            const offsetNum = offset ? parseInt(offset as string) : 0
            
            // Build complete query with pagination
            const userMemories = await db.select({
                id: memories.id,
                prompt: memories.prompt,
                source: memories.source,
                conversationThread: memories.conversationThread,
                extractedMemory: memories.extractedMemory,
                tags: memories.tags,
                createdAt: memories.createdAt,
            })
            .from(memories)
            .where(and(...conditions))
            .orderBy(desc(memories.createdAt))
            .limit(limitNum)
            .offset(offsetNum)
            
            return {
                success: true,
                memories: userMemories,
                count: userMemories.length
            }
        } catch (error) {
            console.error('Memory listing failed:', error)
            return { 
                error: 'Failed to list memories',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    }, {
        query: t.Object({
            source: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            offset: t.Optional(t.String())
        })
    })