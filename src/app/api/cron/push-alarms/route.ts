import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api/auth";
import { getPushTokensForUsers } from "@/lib/services/push";

function getJakartaNow() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dow = now.getDay();
  return { time: `${hh}:${mm}`, dow, iso: now.toISOString() };
}

export async function GET(request: NextRequest) {
  return runPushAlarms(request);
}

export async function POST(request: NextRequest) {
  return runPushAlarms(request);
}

async function runPushAlarms(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasFirebase = !!process.env.FIREBASE_SERVICE_ACCOUNT || !!process.env.FIREBASE_PROJECT_ID;
    if (!hasFirebase) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    }

    const { time: nowTime, dow } = getJakartaNow();
    const supabase = createAdminClient();
    const dueAlarms = await getDueAlarsWrapper(supabase, nowTime, dow);

    if (dueAlarms.length === 0) {
      return NextResponse.json({ success: true, pushed: 0, time: nowTime, dow });
    }

    const userIds = [...new Set(dueAlarms.map((a) => a.user_id))];
    const tokens = await getPushTokensForUsers(supabase, userIds);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, pushed: 0, dueAlarms: dueAlarms.length, time: nowTime });
    }

    const { getMessaging } = await import("@/lib/firebase-admin");
    const messaging = getMessaging();

    const messages = dueAlarms.flatMap((alarm) =>
      tokens
        .filter((t) => t.user_id === alarm.user_id)
        .map((t) => ({
          token: t.token,
          notification: {
            title: "⏰ Alarm",
            body: alarm.label || alarm.alarm_time.slice(0, 5),
          },
          data: {
            targetPage: alarm.target_page ?? "/critical-jobs",
            alarmId: alarm.id,
          },
          android: {
            priority: "high" as const,
            notification: {
              channelId: "alarms",
              visibility: "public" as const,
              defaultSound: true,
              vibrateTimingsMillis: ["200", "100", "200"],
            },
          },
        }))
    );

    if (messages.length === 0) {
      return NextResponse.json({ success: true, pushed: 0, time: nowTime });
    }

    const batchSize = 500;
    let success = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const res = await messaging.sendEach(batch as never[]);
      success += res.successCount;
      res.responses.forEach((r: { success: boolean; error?: { code?: string } }, idx: number) => {
        if (!r.success) {
          const code = r.error?.code ?? "";
          if (code.includes("invalid-registration-token") || code.includes("registration-token-not-registered")) {
            invalidTokens.push(batch[idx].token);
          }
        }
      });
    }

    if (invalidTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", invalidTokens);
    }

    return NextResponse.json({ success: true, pushed: success, attempted: messages.length, time: nowTime, invalidTokens: invalidTokens.length });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getDueAlarsWrapper(supabase: ReturnType<typeof createAdminClient>, nowTime: string, dow: number) {
  const { data, error } = await supabase.from("alarm_schedules").select("*").eq("enabled", true);
  if (error) throw error;
  const rows = (data ?? []) as import("@/lib/db/types").DbAlarmSchedule[];
  return rows.filter((r) => (r.days_of_week & (1 << dow)) !== 0 && r.alarm_time.slice(0, 5) === nowTime.slice(0, 5));
}
