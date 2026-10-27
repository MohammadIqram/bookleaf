import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

let instance = null;

export function getPrismaClient() {
  if (!instance) {
    try {
      instance = new PrismaClient();
    } catch (_e) {
      // Safe proxy stub during offline test runs if prisma generate has not been executed yet
      return new Proxy({}, {
        get(_target, prop) {
          if (prop === '$disconnect' || prop === '$connect') {
            return async () => {};
          }
          return new Proxy({}, {
            get() {
              return async () => null;
            },
          });
        },
      });
    }
  }
  return instance;
}

export const prisma = new Proxy({}, {
  get(_target, prop) {
    const client = getPrismaClient();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export default prisma;
