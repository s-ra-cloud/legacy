import { env } from "@repo/shared";
import type { Job } from "bullmq";
import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";
import superjson from "superjson";
import { redis } from "./redis.js";

interface SendAuthEmailProps {
  to: string;
  subject: string;
  html: string;
}

let worker: Worker | undefined;
const APP_QUEUE_NAME = "mails-queue";

const queue = new Queue(APP_QUEUE_NAME, { connection: redis });

export const transporter = nodemailer.createTransport({
  host: env.EMAIL_SERVER_HOST,
  port: env.EMAIL_SERVER_PORT,
  secure: env.EMAIL_SECURE, // true for port 465, false for other ports
  auth: {
    user: env.EMAIL_SERVER_USER,
    pass: env.EMAIL_SERVER_PASSWORD,
  },
});

if (!worker) {
  worker = new Worker(
    APP_QUEUE_NAME,
    async (job: Job<string>) => {
      const data = superjson.parse<SendAuthEmailProps>(job.data);

      return transporter.sendMail({
        from: env.EMAIL_FROM,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
    },
    {
      concurrency: 5,
      connection: redis,
    },
  );
}

export async function sendAuthEmail(data: SendAuthEmailProps) {
  const _job = await queue.add("mail-job", superjson.stringify(data));
}
