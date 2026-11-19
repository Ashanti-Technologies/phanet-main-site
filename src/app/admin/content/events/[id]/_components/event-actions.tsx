"use client";

import { useState } from "react";
import { Check, Download, Link2, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

/** Copies `origin + path`; returns [copied, copy]. "Copied" shows for 2s. */
function useCopy(path: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return [copied, copy] as const;
}

export function CopyLinkButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, copy] = useCopy(path);
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function EventMoreMenu({
  registerPath,
  exportHref,
}: {
  registerPath: string | null;
  exportHref: string | null;
}) {
  const [copied, copy] = useCopy(registerPath ?? "");
  if (!registerPath && !exportHref) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {registerPath && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              copy();
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Copied" : "Copy registration link"}
          </DropdownMenuItem>
        )}
        {exportHref && (
          <DropdownMenuItem asChild>
            <a href={exportHref}>
              <Download className="h-4 w-4" />
              Export registrations (CSV)
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
