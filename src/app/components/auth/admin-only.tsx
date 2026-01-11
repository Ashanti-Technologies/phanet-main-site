"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side wrapper that enforces admin role
 * Redirects to unauthorized page if user is not an admin
 */
export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const session = await authClient.getSession();
        const user = session?.data?.user as { role?: string } | undefined;
        if (user?.role === "admin") {
          setIsAdmin(true);
        } else if (!session?.data?.user) {
          router.push("/admin/login");
        } else {
          router.push("/unauthorized");
        }
      } catch (error) {
        console.error("Admin check error:", error);
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
