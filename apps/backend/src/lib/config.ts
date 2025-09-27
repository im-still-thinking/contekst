export const config = {
  MYSQL_URL: process.env.MYSQL_URL!,
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  QDRANT_URL: process.env.QDRANT_URL!,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  MEMORY_SIMILARITY_THRESHOLD: parseFloat(process.env.MEMORY_SIMILARITY_THRESHOLD || '0.7'),
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL,
  LEASE_CONTRACT_ADDRESS: process.env.LEASE_CONTRACT_ADDRESS,
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  // Walrus configuration
  WALRUS_PRIVATE_KEY: process.env.WALRUS_PRIVATE_KEY!,
  WALRUS_NETWORK: process.env.WALRUS_NETWORK || 'testnet',
  WALRUS_STORAGE_EPOCHS: parseInt(process.env.WALRUS_STORAGE_EPOCHS || '3'),
}