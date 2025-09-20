import mongoose from "mongoose";

import { env, isDevelopment, isTest } from "../../lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const globalCache = globalThis.__mongooseConn ?? {
  conn: null as typeof mongoose | null,
  promise: null as Promise<typeof mongoose> | null
};

if (!globalThis.__mongooseConn) {
  globalThis.__mongooseConn = globalCache;
}

mongoose.set("strictQuery", true);

if (isDevelopment) {
  mongoose.set("debug", true);
}

const connectionOptions: Parameters<typeof mongoose.connect>[1] = {
  autoIndex: isDevelopment || isTest,
  bufferCommands: false,
  maxPoolSize: 10
};

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(env.MONGODB_URI, connectionOptions).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (!globalCache.conn) {
    return;
  }

  await mongoose.disconnect();
  globalCache.conn = null;
  globalCache.promise = null;
};
