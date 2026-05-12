// Direct test of Better Auth — bypasses HTTP, surfaces real errors.
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { auth } = await import("../lib/auth");
  const email = `direct-test-${Date.now()}@biomax.nu`;
  console.log("Attempting sign-up for:", email);
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password: "directtestpw123",
        name: "Direct Test",
      },
    });
    console.log("✓ Signup result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("✗ Signup error:");
    console.error(err);
  }
}

main();
