import type { UserRole } from "@repo/db";

export type AllowedTransaction<Status extends string> = {
  from: Status;
  to: Status | (string & {});
  by: UserRole[];
  notifications?: {
    title: string;
    description: string;
    to: UserRole;
  }[];
}[];
