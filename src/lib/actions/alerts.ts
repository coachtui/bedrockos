"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";

export async function serverSetAlertRead(id: string, isRead: boolean): Promise<void> {
  const { error } = await supabase
    .from("alerts")
    .update({ is_read: isRead })
    .eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverSetAlertRead(${id}, ${isRead})`, error);

  revalidatePath("/alerts");
  revalidatePath(`/alerts/${id}`);
}
