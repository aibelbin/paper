import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

const alertSchema = z.object({
  name: z.string(),
  description: z.string(),
  industry: z.string(),
  services: z.string(),
  contactEmail: z.string(),
  phone: z.string(),
  address: z.string(),
  socialLinks: z.string(),
});


