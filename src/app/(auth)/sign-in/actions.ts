"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DEMO_EMAIL = "demo@signafyai.com";
const DEMO_PASSWORD = "Demo1234!";

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("signafy_session", "demo", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    redirect("/dashboard");
  }

  return { error: "Invalid credentials. Try the demo account below." };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("signafy_session");
  redirect("/sign-in");
}
