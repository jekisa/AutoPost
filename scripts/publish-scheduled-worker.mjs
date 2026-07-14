import cron from "node-cron";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  throw new Error("CRON_SECRET wajib diisi untuk menjalankan scheduler worker.");
}

async function publishScheduled() {
  const response = await fetch(`${baseUrl}/api/cron/publish-scheduled`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`
    }
  });

  const body = await response.text();
  const timestamp = new Date().toISOString();

  if (!response.ok) {
    console.error(`[${timestamp}] Scheduler gagal ${response.status}: ${body}`);
    return;
  }

  console.log(`[${timestamp}] Scheduler selesai: ${body}`);
}

cron.schedule("*/5 * * * *", publishScheduled);
publishScheduled();
