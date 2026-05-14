import { createId } from "@paralleldrive/cuid2";
import { db, dialect, UserRole, UserStatus } from "@repo/db";
import { env } from "@repo/shared";
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { z } from "zod";
import { phoneNumber } from "better-auth/plugins";

interface GoogleProfile {
  email: string;
  picture: string;
  name: string;
  given_name: string;
  family_name: string;
  [key: string]: any; // optional, to handle extra fields
}

const auth = betterAuth({
  socialProviders: {
    google: {
      enabled: true,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: env.GOOGLE_REDIRECT_URI,
      scope: ["openid", "email", "profile"],
      mapProfileToUser: (profile: GoogleProfile) => {
        // later take img save it in db and link it to user
        return {
          email: profile.email,
          image: undefined,
          name: profile.name,
          firstName: profile.given_name,
          lastName: profile.family_name,
          email_verified: true,
          status: "ENABLED",
        };
      },
    },
  },
  trustedOrigins: [env.VITE_APP_URL],
  basePath: "/api/v1/auth",
  database: {
    dialect,
    type: "postgres",
  },
  emailAndPassword: {
    enabled: true,
  },
  account: {
    modelName: "accounts",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: true,
    },
  },
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 200,
    updateAge: 60 * 60 * 24 * 30,
  },
  verification: {
    modelName: "verifications",
  },
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      role: {
        type: "string",
        validator: { input: z.nativeEnum(UserRole) },
        defaultValue: "CLIENT",
        input: false,
      },
      status: {
        type: "string",
        validator: { input: z.nativeEnum(UserStatus) },
        required: true,
        defaultValue: "ENABLED",
        input: false,
      },
      firstName: {
        fieldName: "first_name",
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        fieldName: "last_name",
        type: "string",
        required: false,
        input: true,
      },
      phoneNumber: {
        fieldName: "phone_number",
        type: "string",
        required: false,
        input: true,
      },
      phoneNumberVerified: {
        fieldName: "phone_verified",
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false,
      },
      imageId: {
        fieldName: "image_id",
        type: "string",
        required: false,
        input: false,
      },
      receiveEmails: {
        fieldName: "receive_emails",
        type: "boolean",
        defaultValue: false,
        required: false,
        input: true,
      },
      institution: {
        fieldName: "institution",
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const users = await db
            .selectFrom("users")
            .select((eb) => [
              eb.fn.coalesce(eb.fn.countAll<number>(), eb.val(0)).as("count"),
            ])
            .executeTakeFirstOrThrow();
          const count = +users.count;

          const userWithExtras = user as typeof user & { firstName?: string; lastName?: string; institution?: string };
          const firstName = userWithExtras.firstName ?? user.name.split(" ")[0];
          const lastName = userWithExtras.lastName ?? user.name.split(" ")[1] ?? user.name;
          return {
            data: {
              firstName,
              lastName,
              ...user,
              role: count === 0 ? "ADMIN" : "CLIENT",
              status: "ENABLED",
            },
          };
        },
      },
    },
  },
  plugins: [
    openAPI(),
    phoneNumber({
      otpLength: 6,
      expiresIn: 5 * 60, // 5 minutes
      allowedAttempts: 3,
      requireVerification: true, // ⬅️ ensure user verifies before logging in
      sendOTP: async ({ phoneNumber, code }, req) => {
        // TODO: replace this with your real SMS logic (e.g., Twilio)
        console.log(`Sending OTP ${code} to ${phoneNumber}`);
      },
      phoneNumberValidator: (phoneNumber) =>
        /^\+\d{8,15}$/.test(phoneNumber), // Simple E.164 validation
    }),
  ],
});

// Types derived safely without leaking internal paths
type Auth = typeof auth;
type AuthUser = Auth["$Infer"]["Session"]["user"] & { role: UserRole };
type AuthSession = Auth["$Infer"]["Session"];

export { auth, type AuthSession, type AuthUser };

