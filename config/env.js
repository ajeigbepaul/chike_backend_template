import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });
export const {
  PORT,
  NODE_ENV,
  DB_URL,
  JWT_SECRET,
  JWT_EXPIRATION,
  DOMAIN,
  ARCJET_ENV,
  ARCJET_KEY,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SERVICE,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  JWT_EXPIRES_IN,
  JWT_COOKIE_EXPIRES_IN,
} = process.env;
