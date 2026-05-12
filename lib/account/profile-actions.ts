"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export type ProfileUpdateInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update the current user's profile fields. Email is intentionally not
 * editable here — that's a Better Auth flow (changeEmail with verification).
 */
export async function updateProfile(
  input: ProfileUpdateInput
): Promise<ProfileUpdateResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };

  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const phone = input.phone?.trim() || null;
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() || user.name;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        phone,
        name,
      },
    });
    revalidatePath("/konto");
    revalidatePath("/konto/profil");
    return { ok: true };
  } catch (err) {
    console.error("updateProfile failed:", err);
    return { ok: false, error: "Kunde inte spara ändringarna." };
  }
}
