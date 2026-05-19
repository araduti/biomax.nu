import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePlatformSession } from "@/lib/platform/guard";
import { Platform2faSetup } from "./platform-2fa-setup";

export const metadata: Metadata = {
  title: "Korg · Plattform · 2FA",
  robots: { index: false, follow: false },
};

/**
 * Mandatory platform 2FA enrolment (ADR 0031, Option A). Reached after
 * login when the platform admin has no 2FA yet. Lighter guard (no 2FA
 * requirement) so it can't loop.
 */
export default async function Platform2fa() {
  const actor = await requirePlatformSession();
  if (actor.twoFactorEnabled) redirect("/platform");
  return <Platform2faSetup email={actor.email} />;
}
