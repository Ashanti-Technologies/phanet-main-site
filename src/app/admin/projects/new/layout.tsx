import { requirePermission } from "@/lib/auth-guard";

// The page is a client component, so the permission check lives here.
export default async function NewProjectLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("create", "Project");
  return children;
}
