export const config = {
  MYSQL_URL: process.env.MYSQL_URL!,
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
}