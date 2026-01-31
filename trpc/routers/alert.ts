import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { transporter } from "@/lib/mailer";
import { render } from "@react-email/render";
import AlertEmail from "@/components/emails/AlertMail";
import React from "react";

const alertSendEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  activityType: z.string().min(1),
  timestamp: z.string().min(1),
  location: z.string().optional(),
  deviceInfo: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  description: z.string().optional(),
});

export const alertRouter = createTRPCRouter({
  sendEmail: protectedProcedure
    .input(alertSendEmailSchema)
    .mutation(async ({ input }) => {
      try {
        const emailHtml = await render(
          React.createElement(AlertEmail, {
            name: input.name,
            activityType: input.activityType,
            timestamp: input.timestamp,
            location: input.location,
            deviceInfo: input.deviceInfo,
            severity: input.severity,
            description: input.description,
          })
        );

        await transporter.sendMail({
          from: `"Paper AI Alerts" <${process.env.SMTP_USER}>`,
          to: input.email,
          subject: "Alert Notification",
          html: emailHtml,
        });

        return {
          success: true,
          message: "Email sent successfully",
        };
      } catch (error) {
        console.error("Alert email error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email",
        });
      }
    }),
});
