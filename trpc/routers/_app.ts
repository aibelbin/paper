import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { websiteRouter } from "./website";
import { analyticsRouter } from "./analytics";
export const appRouter = createTRPCRouter({
  test: publicProcedure.query(async (opts) => {
    return {
      status: "success",
    };
    
  }),
  website: websiteRouter,
  analytics: analyticsRouter
});

export type AppRouter = typeof appRouter;
