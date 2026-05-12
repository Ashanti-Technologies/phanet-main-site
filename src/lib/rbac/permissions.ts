export const ACTIONS = [
  "manage",
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "send",
  "import",
  "export",
  "access",
] as const;

export type Action = (typeof ACTIONS)[number];

export const SUBJECTS = [
  "all",
  "Member",
  "Household",
  "Tag",
  "Message",
  "MessageTemplate",
  "MessageBatch",
  "Service",
  "Attendance",
  "Visitation",
  "FollowUpTask",
  "Note",
  "MemberInvite",
  "User",
  "AuditLog",
  "ChurchUnit",
  "Project",
  "Commitment",
  "PaymentIntent",
  "ProofUpload",
  "Event",
  "ContentPage",
  "Sermon",
  "HomepageSection",
  "MediaAsset",
  "PrayerRequest",
  "AdminPanel",
  "MemberPortal",
] as const;

export type Subject = (typeof SUBJECTS)[number];
