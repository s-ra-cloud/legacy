import type { AuthUser } from "../lib/auth/index.js";
import type { AllowedTransaction } from "../types/status.js";

export function validateStatus(
  user: AuthUser,
  params: {
    newStatus: string;
    oldStatus: string;
    allowedTransactions: AllowedTransaction<string>;
  },
) {
  const toFind = params.allowedTransactions.find(
    (it) =>
      it.from === params.oldStatus &&
      it.to === params.newStatus &&
      it.by.includes(user.role),
  );

  return !!toFind;
}
