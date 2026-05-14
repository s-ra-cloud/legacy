import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const UserStatus = {
    ENABLED: "ENABLED",
    DISABLED: "DISABLED"
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export const Role = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    CLIENT: "CLIENT",
    ACCESS_MANAGER: "ACCESS_MANAGER"
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const NotificationType = {
    NEUTRAL: "NEUTRAL",
    POSITIVE: "POSITIVE",
    NEGATIVE: "NEGATIVE"
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NotificationTags = {
    ACCOUNT: "ACCOUNT"
} as const;
export type NotificationTags = (typeof NotificationTags)[keyof typeof NotificationTags];
export const StatusType = {
    TEMPORARY: "TEMPORARY",
    PERMANENT: "PERMANENT"
} as const;
export type StatusType = (typeof StatusType)[keyof typeof StatusType];
export type Account = {
    id: string;
    userId: string;
    accountId: string;
    providerId: string;
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: (string | Date) | null;
    refreshTokenExpiresAt: (string | Date) | null;
    scope: string | null;
    idToken: string | null;
    password: string | null;
    createdAt: Generated<(string | Date)>;
    updatedAt: (string | Date);
};
export type Media = {
    id: string;
    fileName: string;
    objectKey: string;
    type: string;
    size: number;
    status: Generated<StatusType>;
    createdAt: Generated<(string | Date)>;
    updatedAt: Generated<(string | Date)>;
    userId: string;
};
export type Notification = {
    id: string;
    title: string;
    message: string;
    type: Generated<NotificationType>;
    tags: string[];
    route: string | null;
    creatorId: string;
    /**
     * @kyselyType({ roles: Role[] })
     */
    target: { roles: Role[] } | null;
    createdAt: Generated<(string | Date)>;
    updatedAt: Generated<(string | Date)>;
};
export type Session = {
    id: string;
    userId: string;
    token: string;
    expiresAt: (string | Date);
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Generated<(string | Date)>;
    updatedAt: (string | Date);
};
export type User = {
    id: string;
    firstName: string;
    lastName: string;
    institution: string | null;
    email: string;
    imageId: string | null;
    role: Generated<Role>;
    status: Generated<UserStatus>;
    emailVerified: Generated<boolean>;
    name: string;
    receiveEmails: Generated<boolean>;
    banned: boolean | null;
    banReason: string | null;
    banExpires: number | null;
    phoneNumber: string | null;
    phoneVerified: Generated<boolean>;
    createdAt: Generated<(string | Date)>;
    updatedAt: Generated<(string | Date)>;
};
export type UserActivity = {
    id: string;
    userId: string;
    action: string;
    requestId: string | null;
    values: string[];
    parentId: string | null;
    createdAt: Generated<(string | Date)>;
};
export type UserNotification = {
    id: string;
    userId: string;
    notificationId: string;
    seen: Generated<boolean>;
    archived: Generated<boolean>;
    clicked: Generated<boolean>;
};
export type Verification = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: (string | Date);
    createdAt: Generated<(string | Date)>;
    updatedAt: (string | Date);
};
export type DB = {
    accounts: Account;
    media: Media;
    notifications: Notification;
    sessions: Session;
    userActivities: UserActivity;
    userNotifications: UserNotification;
    users: User;
    verifications: Verification;
};
