/* eslint-disable @typescript-eslint/no-explicit-any */
import ENV from "../config/env";
import { prisma } from "../lib/prisma";

import { processOutboxEvent } from "./outboxProcessor";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runOutboxWorker() {
  const workerId = `${process.pid}-${Date.now()}`;
  let running = true;
  const inFlight: Promise<any>[] = [];

  function stop() {
    running = false;
    console.info("Outbox worker received shutdown signal, stopping fetch loop");
  }

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    try {
      // Fetch candidates (unprocessed and not currently claimed)
      const candidates = await prisma.outboxEvent.findMany({
        where: { processed: false, claimedAt: null },
        take: 10,
        orderBy: { createdAt: "asc" },
      });

      if (candidates.length === 0) {
        await sleep(2000);
        continue;
      }

      const ids = candidates.map((c) => c.id);

      // Attempt to claim them atomically: only rows still unclaimed will be updated
      await prisma.outboxEvent.updateMany({
        where: { id: { in: ids }, claimedAt: null },
        data: { claimedAt: new Date(), claimedBy: workerId },
      });

      // Read back the events we successfully claimed
      const claimed = await prisma.outboxEvent.findMany({
        where: { id: { in: ids }, claimedBy: workerId },
      });

      if (claimed.length === 0) {
        // Another worker claimed them first — try again
        continue;
      }

      for (const ev of claimed) {
        if (!running) break;
        const p = (async () => {
          try {
            await processOutboxEvent(ev as any);
            await prisma.outboxEvent.update({
              where: { id: ev.id },
              data: { processed: true, processedAt: new Date(), claimedAt: null, claimedBy: null },
            });
          } catch (err: any) {
            console.error("Outbox event processing error", err);
            // Clear claim so the processor (which owns attempts bookkeeping) will increment attempts
            try {
              await prisma.outboxEvent.update({
                where: { id: ev.id },
                data: { claimedAt: null, claimedBy: null },
              });
            } catch (innerErr) {
              console.error("Failed to clear claim after processing error", innerErr);
            }
          }
        })();
        inFlight.push(p);
        // keep inFlight array bounded
        if (inFlight.length > 100) {
          await Promise.race(inFlight).catch((e) => {
            console.debug("inFlight race error", e);
          });
        }
      }

      // Small pause to avoid tight-looping
      await sleep(100);
    } catch (err: any) {
      console.error("Outbox worker loop error", err);
      await sleep(2000);
    }
  }

  // Wait for in-flight processing to finish (with timeout)
  try {
    await Promise.allSettled(inFlight);
  } catch (e) {
    console.log(e);
  }
  console.info("Outbox worker stopped");
}

// Optional: auto-start worker when imported in dev, guarded by env var
if (ENV.START_OUTBOX_WORKER === "1") {
  runOutboxWorker().catch((err) => console.error("Outbox worker failed", err));
}
