export default () => ({
  port: parseInt(process.env.PORT, 10) || 2001,
  app: { name: process.env.APP_NAME, slug: process.env.APP_SLUG },
  db: {
    url: process.env.MONGODB_URI,
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL) ?? 60000,
    limit: Number(process.env.THROTTLE_LIMIST) ?? 10,
  },
  cache: {
    ttl: Number(process.env.CACHE_TTL) ?? 30000,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    useTLS: process.env.REDIS_USE_TLS === 'true',
    db: Number(process.env.REDIS_DB) || 0,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
  },
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isStaging: process.env.NODE_ENV === 'staging',
  isDev: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
});
