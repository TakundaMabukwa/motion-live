import { createClient } from "@/lib/supabase/server";

export async function setVehicleUserContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { error } = await supabase.rpc("set_app_config", {
        setting_name: "app.user_email",
        setting_value: user.email,
      });
      if (error) {
        console.warn("Failed to set vehicle user context:", error.message);
      }
    }
  } catch (err) {
    console.warn("Failed to set vehicle user context:", err);
  }
}
