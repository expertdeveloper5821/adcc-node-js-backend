import dns from 'node:dns';
import mongoose from 'mongoose';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  const dnsServers = process.env.MONGODB_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers?.length) {
    dns.setServers(dnsServers);
    console.log(`Using custom DNS servers for MongoDB: ${dnsServers.join(', ')}`);
  }

  const maxRetries = Number(process.env.MONGODB_CONNECT_RETRIES ?? 3);
  const retryDelayMs = Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS ?? 2000);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(mongoUri);
      console.log('MongoDB Connected');
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Database connection error (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt < maxRetries) {
        await wait(retryDelayMs * attempt);
      }
    }
  }

  throw lastError;
};