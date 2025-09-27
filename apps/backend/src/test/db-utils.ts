import { db } from '../lib/db'
import { users } from '../models/user'
import { eq } from 'drizzle-orm'

// Utility script for testing database operations
// Run with: bun run src/test/db-utils.ts

async function main() {
  const command = process.argv[2];
  const walletAddress = process.argv[3];

  if (!command) {
    console.log('Usage:');
    console.log('  bun run src/test/db-utils.ts list');
    console.log('  bun run src/test/db-utils.ts delete <wallet_address>');
    console.log('  bun run src/test/db-utils.ts check <wallet_address>');
    return;
  }

  switch (command) {
    case 'list':
      console.log('📋 All users in database:');
      const allUsers = await db.select().from(users);
      console.table(allUsers);
      break;

    case 'delete':
      if (!walletAddress) {
        console.error('❌ Please provide wallet address');
        return;
      }
      
      const normalizedAddress = walletAddress.toLowerCase();
      console.log(`🗑️  Deleting user: ${normalizedAddress}`);
      
      const result = await db.delete(users).where(eq(users.walletId, normalizedAddress));
      console.log('✅ Deleted user:', result);
      break;

    case 'check':
      if (!walletAddress) {
        console.error('❌ Please provide wallet address');
        return;
      }
      
      const checkAddress = walletAddress.toLowerCase();
      console.log(`🔍 Checking user: ${checkAddress}`);
      
      const user = await db.query.users.findFirst({
        where: eq(users.walletId, checkAddress)
      });
      
      if (user) {
        console.log('✅ User exists:', user);
      } else {
        console.log('❌ User not found');
      }
      break;

    default:
      console.error('❌ Unknown command:', command);
  }

  process.exit(0);
}

main().catch(console.error);