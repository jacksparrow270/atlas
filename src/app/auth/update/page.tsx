import { AuthForm } from "@/components/auth-form";
import { configured } from "@/lib/supabase/server";
export default function Update() {
  return <AuthForm configured={configured()} update />;
}
