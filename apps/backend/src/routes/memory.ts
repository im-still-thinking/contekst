import { Elysia, t } from 'elysia'
import { eq, and, desc } from 'drizzle-orm'
import { processMemory, retrieveRelevantMemories } from '../lib/memory'
import { getJobStatus } from '../lib/redis'
import { db } from '../lib/db'
import { memories } from '../models/memory'
import { downloadImageFromWalrus } from '../lib/walrus'
import { authMiddleware, getWalletFromContext } from '../lib/middleware'

export const memoryRoutes = new Elysia({ prefix: '/memory' })
    .onBeforeHandle(async (context) => {
        // Skip auth for job status endpoint - it's public for job tracking
        if (context.request.url.includes('/job/')) {
            return
        }
        
        const result = await authMiddleware(context)
        if (!result.success) {
            context.set.status = 401
            return { error: result.error }
        }
    })
    .post('/process', async ({ body, ...context }) => {
        const { prompt, source, conversationThread, images } = body
        const userId = getWalletFromContext(context)

        if (!userId || !prompt || !source) {
            return { error: 'Missing required fields: prompt, source' }
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
            prompt: t.String(),
            source: t.String(),
            conversationThread: t.Optional(t.String()),
            images: t.Optional(t.Array(t.Object({
                base64: t.String(),
                filename: t.Optional(t.String())
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
    .post('/retrieve', async ({ body, ...context }) => {
        const { userPrompt, entity, source, conversationThread, limit } = body
        const userId = getWalletFromContext(context)

        if (!userId || !userPrompt || !entity) {
            return { error: 'Missing required fields: userPrompt, entity' }
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
            userPrompt: t.String(),
            entity: t.String({ description: 'Entity making the request (claude, chatgpt, etc.)' }),
            source: t.Optional(t.String()), // Optional: filter to specific source
            conversationThread: t.Optional(t.String()),
            limit: t.Optional(t.Number({ minimum: 1, maximum: 20 }))
        })
    })

    // Get all memories for a user
    .get('/list', async ({ query, ...context }) => {
        const { source, limit, offset } = query
        const userId = getWalletFromContext(context)
        
        if (!userId) {
            return { error: 'Authentication required' }
        }
        
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

    // Get image from Walrus
    .get('/image/:blobId', async ({ params: { blobId }, set }) => {
        try {
            const imageBuffer = await downloadImageFromWalrus(blobId)
            
            set.headers['Content-Type'] = 'image/jpeg'
            set.headers['Cache-Control'] = 'public, max-age=31536000'
            
            return new Response(imageBuffer)
        } catch (error) {
            console.error('Image retrieval failed:', error)
            set.status = 500
            return { error: 'Failed to retrieve image' }
        }
    })

    // Delete a memory
    // .delete('/:memoryId', async ({ params: { memoryId }, ...context }) => {
    //     const userId = getWalletFromContext(context)
        
    //     if (!userId) {
    //         return { error: 'Authentication required' }
    //     }
        
    //     try {
    //         // Check if memory exists and belongs to user
    //         const memory = await db.select()
    //             .from(memories)
    //             .where(and(
    //                 eq(memories.id, memoryId),
    //                 eq(memories.userId, userId)
    //             ))
    //             .limit(1)
            
    //         if (memory.length === 0) {
    //             return { error: 'Memory not found or access denied' }
    //         }
            
    //         const memoryRecord = memory[0]!
            
    //         // Delete from blockchain first (using the blockchain fingerprint as memory ID)
    //         // COMMENTED OUT FOR TESTING - NO BLOCKCHAIN
    //         // const blockchainTxHash = await deleteMemoryFromBlockchain(memoryRecord.blockchainFingerprint)
            
    //         // TESTING MODE: Simulate blockchain deletion
    //         const blockchainTxHash = 'test-delete-tx-' + Date.now()
    //         console.log(`🧪 TESTING: Simulated blockchain deletion for ${memoryId}`)
            
    //         // Delete from database (cascade will handle related records)
    //         await db.delete(memories)
    //             .where(and(
    //                 eq(memories.id, memoryId),
    //                 eq(memories.userId, userId)
    //             ))
            
    //         console.log(`🗑️  Memory deleted: ${memoryId} (blockchain: ${blockchainTxHash || 'failed'})`)
            
    //         return {
    //             success: true,
    //             message: 'Memory deleted successfully',
    //             blockchainTxHash: blockchainTxHash || null
    //         }
    //     } catch (error) {
    //         console.error('Memory deletion failed:', error)
    //         return { 
    //             error: 'Failed to delete memory',
    //             details: error instanceof Error ? error.message : String(error)
    //         }
    //     }
    //})