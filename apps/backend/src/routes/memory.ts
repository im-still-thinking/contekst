import { Elysia, t } from 'elysia'
import { processMemory } from '../lib/memory'
import { getJobStatus } from '../lib/redis'

export const memoryRoutes = new Elysia({ prefix: '/memory' })
    .post('/process', async ({ body }) => {
        const { userId, prompt, source, conversationThread } = body

        if (!userId || !prompt || !source) {
            return { error: 'Missing required fields: userId, prompt, source' }
        }

        const result = await processMemory({
            userId,
            prompt,
            source,
            conversationThread
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
            conversationThread: t.Optional(t.String())
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