import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import { getFederatedMCPClient } from '@/lib/mcp';
import { SYSTEM_PROMPT } from "@/common/prompt";

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const groq = createGroq({
          apiKey: process.env.GROQ_API_KEY,
        });
        const mcpClient = await getFederatedMCPClient();
        const tools = await mcpClient.tools();

        const { text, toolCalls } = await generateText({
          model: groq("moonshotai/kimi-k2-instruct-0905"),
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: input.text,
            },
          ],
          tools,
          stopWhen: stepCountIs(10),
        });

        return {
          output: text,
        };
      } catch (error) {
        console.error("Error analyzing text:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to analyze text",
        });
      }
    }),
});
