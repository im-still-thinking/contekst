import { Elysia, t } from 'elysia'
import { getAuditTrailForUser, getAuditStats } from '../lib/audit'

export const auditRoutes = new Elysia({ prefix: '/audit' })
    // Get audit trail for a user
    .get('/trail/:walletId', async ({ params: { walletId }, query }) => {
        const { limit } = query
        
        try {
            const trail = await getAuditTrailForUser(
                walletId, 
                limit ? parseInt(limit as string) : 50
            )
            
            return {
                success: true,
                trail,
                count: trail.length
            }
        } catch (error) {
            return {
                error: 'Failed to retrieve audit trail',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    }, {
        query: t.Object({
            limit: t.Optional(t.String({ description: 'Number of records to fetch (default: 50)' }))
        })
    })

    // Get audit statistics for a user
    .get('/stats/:walletId', async ({ params: { walletId } }) => {
        try {
            const stats = await getAuditStats(walletId)
            
            return {
                success: true,
                stats
            }
        } catch (error) {
            return {
                error: 'Failed to retrieve audit stats',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    })