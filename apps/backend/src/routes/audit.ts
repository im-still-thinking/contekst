import { Elysia, t } from 'elysia'
import { getAuditTrailForUser, getAuditStats } from '../lib/audit'
import { authMiddleware, getWalletFromContext } from '../lib/middleware'

export const auditRoutes = new Elysia({ prefix: '/audit' })
    .onBeforeHandle(async (context) => {
        const result = await authMiddleware(context)
        if (!result.success) {
            context.set.status = 401
            return { error: result.error }
        }
    })
    // Get audit trail for a user
    .get('/trail', async ({ query, ...context }) => {
        const { limit } = query
        const walletId = getWalletFromContext(context)
        
        if (!walletId) {
            return { error: 'Authentication required' }
        }
        
        try {
            const trail = await getAuditTrailForUser(
                walletId, 
                limit ? parseInt(limit as string) : 50
            )
            
            return {
                success: true,
                trails: trail,
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
    .get('/stats', async ({ ...context }) => {
        const walletId = getWalletFromContext(context)
        
        if (!walletId) {
            return { error: 'Authentication required' }
        }
        
        try {
            const stats = await getAuditStats(walletId)
            
            return {
                success: true,
                stats: {
                    totalAccess: stats.totalAccesses,
                    accessGranted: stats.grantedAccesses,  
                    accessDenied: stats.deniedAccesses,
                    uniqueEntities: 0, // TODO: Calculate unique entities
                    totalMemoriesAccessed: stats.totalMemoriesAccessed
                }
            }
        } catch (error) {
            return {
                error: 'Failed to retrieve audit stats',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    })