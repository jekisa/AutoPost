import "dotenv/config";
import cron from "node-cron";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
let isRunning = false;

if (!secret) {
  throw new Error("CRON_SECRET wajib diisi untuk menjalankan scheduler worker.");
}

async function publishScheduled() {
  if (isRunning) return;

  isRunning = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4 * 60 * 1000);

  try {
    const response = await fetch(`${baseUrl}/api/cron/publish-scheduled`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`
      },
      signal: controller.signal
    });

    const body = await response.text();
    const timestamp = new Date().toISOString();

    if (!response.ok) {
      console.error(`[${timestamp}] Scheduler gagal ${response.status}: ${body}`);
      return;
    }

    console.log(`[${timestamp}] Scheduler selesai: ${body}`);
  } catch (error) {
    const timestamp = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Scheduler gagal.";
    console.error(`[${timestamp}] Scheduler gagal: ${message}`);
  } finally {
    clearTimeout(timeout);
    isRunning = false;
  }
}

cron.schedule("* * * * *", publishScheduled);
setTimeout(publishScheduled, 5_000);
