import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { reports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const BASE_URL = 'http://143.110.250.168:8000';

export const reportsRouter = createTRPCRouter({
  getReports: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.db.select().from(reports).orderBy(desc(reports.createdAt)).where(eq(reports.userId, ctx.auth?.user?.id as string));
    return data;
  }),
  generateReport: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await fetch(`${BASE_URL}/generate/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: ctx.auth?.user?.id,
          title: input.title,
          description: input.description,
        }),
      })
      if (!request.ok) {
        const error = await request.json();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${error.detail}` });
      }
      return request.json();
    }),
});