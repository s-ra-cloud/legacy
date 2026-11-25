import type { ServiceContext } from "../../context.js";
import { getByEmail, getById } from "./source/get-by.js";
import { publicAttributionTextSchema } from "../strapi/public-attribution-schema.js";

// Internal only: use a stable account ID when recorded, otherwise the legacy
// private email. A failed lookup must not erase saved public display fields.
export async function getAttributionProfile(ctx: ServiceContext, identity: { userId?: string; email?: string }) {
  try {
    const user = identity.userId ? await getById(ctx, identity.userId)
      : identity.email ? await getByEmail(ctx, identity.email) : null;
    if (!user) return null;
    return {
      name: publicAttributionTextSchema.parse(user.name) ||
        publicAttributionTextSchema.parse([user.firstName, user.lastName].filter(Boolean).join(" ")),
      institution: publicAttributionTextSchema.parse(user.institution),
    };
  } catch {
    return null;
  }
}
