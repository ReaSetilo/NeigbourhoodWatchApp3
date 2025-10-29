import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create PostgreSQL connection pool for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

export const auth = betterAuth({
  // Database configuration
  database: {
    provider: "postgres",
    connectionString: process.env.DATABASE_URL,
    // Or use the pool directly
    // db: pool,
  },

  // Email OTP configuration
  emailAndPassword: {
    enabled: false, // We're using OTP only
  },

  // Configure email provider for OTP
  emailOTP: {
    enabled: true,
    sendEmail: async (email, otp) => {
      // This will be handled by your nodemailer setup
      console.log(`Sending OTP ${otp} to ${email}`);
      // You can integrate with your existing email sending logic here
    },
  },

  // Session configuration
  session: {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    expiresIn: 60 * 60 * 12, // 12 hours for admin sessions
  },

  // User configuration
  user: {
    // Fields from your users table
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      userType: {
        type: "string",
        required: true,
      },
      status: {
        type: "string",
        required: true,
      },
      isApproved: {
        type: "boolean",
        required: true,
      },
    },
  },

  // Advanced options
  advanced: {
    // Use lowercase email for consistency
    useEmailVerification: false,
    cookiePrefix: "admin_auth",
  },
});

export type Session = typeof auth.$Infer.Session;