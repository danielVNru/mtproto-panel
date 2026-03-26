export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: 86400, // 24 hours in seconds
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'mtproto_panel',
    user: process.env.DB_USER || 'mtproto',
    password: process.env.DB_PASSWORD || 'mtproto',
  },
};
