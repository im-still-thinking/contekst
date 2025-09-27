import { Elysia, t } from 'elysia'
import { createLease, revokeLease, getUserLeases, isLeaseValid } from '../lib/lease'
import { authMiddleware, getWalletFromContext } from '../lib/middleware'

export const leaseRoutes = new Elysia({ prefix: '/lease' })
    .onBeforeHandle(async (context) => {
        // Only protect non-public endpoints
        if (context.request.url.includes('/check/')) {
            return // Allow public lease checking
        }
        
        const result = await authMiddleware(context)
        if (!result.success) {
            context.set.status = 401
            return { error: result.error }
        }
    })
    // Create a new lease
    .post('/create', async ({ body, ...context }) => {
        const { entity, accessSpecifier, durationDays } = body
        const walletId = getWalletFromContext(context)

        if (!walletId || !entity || !accessSpecifier) {
            return { error: 'Missing required fields: entity, accessSpecifier' }
        }

        const result = await createLease({
            walletId,
            entity,
            accessSpecifier,
            durationDays
        })

        if (result.success) {
            return {
                success: true,
                leaseId: result.leaseId,
                message: 'Lease created successfully'
            }
        }

        return { error: result.error }
    }, {
        body: t.Object({
            entity: t.String({ 
                description: 'Entity being granted access (claude, chatgpt, etc.)' 
            }),
            accessSpecifier: t.String({ 
                description: 'Access level: "global" for all memories or source name like "vscode-extension"' 
            }),
            durationDays: t.Optional(t.Number({ 
                minimum: 1, 
                maximum: 365,
                description: 'Duration in days (default: 7)' 
            }))
        })
    })

    // Revoke an existing lease
    .post('/revoke', async ({ body, ...context }) => {
        const { leaseId } = body
        const walletId = getWalletFromContext(context)

        if (!leaseId || !walletId) {
            return { error: 'Missing required fields: leaseId' }
        }

        const result = await revokeLease(leaseId, walletId)

        if (result.success) {
            return {
                success: true,
                message: 'Lease revoked successfully'
            }
        }

        return { error: result.error }
    }, {
        body: t.Object({
            leaseId: t.String()
        })
    })

    // Check if a lease is valid
    .get('/check/:leaseId', async ({ params: { leaseId } }) => {
        const lease = await isLeaseValid(leaseId)
        
        if (lease) {
            return {
                valid: true,
                lease
            }
        }

        return { valid: false }
    })

    // Get all leases for a wallet
    .get('/list', async ({ ...context }) => {
        const walletId = getWalletFromContext(context)
        
        if (!walletId) {
            return { error: 'Authentication required' }
        }
        
        try {
            const leases = await getUserLeases(walletId)
            
            return {
                success: true,
                leases,
                count: leases.length
            }
        } catch (error) {
            return {
                error: 'Failed to retrieve leases',
                details: error instanceof Error ? error.message : String(error)
            }
        }
    })