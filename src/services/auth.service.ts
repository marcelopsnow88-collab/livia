import { getSupabaseOrNull } from "../lib/supabase/client";
import { AppError, toAppError } from "../lib/errors";

export interface AuthSession {
  userId: string;
  email: string;
  role: "admin" | "client";
  organizationIds: string[];
}

export async function signInAdmin(email: string, password: string): Promise<AuthSession> {
  const supabase = getSupabaseOrNull();
  if (!supabase) {
    throw new AppError("Supabase não configurado.", "UNKNOWN");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AppError("Usuário ou senha incorretos. Tente novamente.", "AUTH", error);
  if (!data.user) throw new AppError("Usuário ou senha incorretos. Tente novamente.", "AUTH");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", data.user.id)
    .single();

  if (profileError) throw toAppError(profileError);
  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    throw new AppError("Usuário ou senha incorretos. Tente novamente.", "FORBIDDEN");
  }

  return {
    userId: data.user.id,
    email: profile.email,
    role: profile.role,
    organizationIds: [],
  };
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", session.user.id)
    .single();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", session.user.id);

  return {
    userId: session.user.id,
    email: profile.email,
    role: profile.role,
    organizationIds: (memberships ?? []).map((m) => m.organization_id),
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return;
  await supabase.auth.signOut();
}
