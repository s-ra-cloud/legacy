import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { validator } from "hono-openapi/zod";
import { describeRoute } from "hono-openapi";
import { db } from "@repo/db";
import type { AuthUser } from "@repo/server";
import { logger, ValidationError } from "@repo/shared";
import { ktStartSchema, ktBatchSchema, ktFinishSchema, ktCoreActionSchema } from "@repo/shared/kt-import";
import { protectedRoute } from "../middlewares/hono.js";
import { activeKTAdmin, ktImportState, startKTImport, writeKTBatch, finishKTImport, KTImportError } from "../lib/kt-browser-import.js";
import { ktSourceDownload } from "../lib/kt-source-download.js";
import { ktCoreAction, ktCoreStatus } from "../lib/kt-core.js";

export const knowledgeTreeAdminRouter=new Hono<{Variables:{user:AuthUser}}>();
knowledgeTreeAdminRouter.use("*",protectedRoute(["ADMIN"]),async(c,next)=>{
  c.header("Cache-Control","private, no-store");
  c.header("Vary","Cookie");
  if(!await activeKTAdmin(db,c.get("user").id)) return c.json({error:"An enabled administrator account is required."},403);
  if(c.req.method!=="GET") {
    // Cookie authentication alone is not CSRF protection. Browsers must present
    // the same-origin Origin header; forwarded host is set by the trusted proxy.
    let origin:string;
    try { origin=new URL(c.req.header("origin")||"").host; }
    catch { return c.json({error:"A same-origin browser request is required."},403); }
    if(c.req.header("sec-fetch-site")==="cross-site" ||
      (origin!==c.req.header("host") && origin!==c.req.header("x-forwarded-host")))
      return c.json({error:"Cross-origin imports are not permitted."},403);
  }
  await next();
});
knowledgeTreeAdminRouter.use("*",bodyLimit({maxSize:2*1024*1024,onError:c=>c.json({error:"Import batch is too large."},413)}));
knowledgeTreeAdminRouter.onError((error,c)=>{
  if(error instanceof ValidationError && (error.status===401 || error.status===403))
    return c.json({error:error.status===401?"Sign in to continue.":"Administrator access required."},error.status);
  if(error instanceof KTImportError) return c.json({error:error.message},error.status);
  // Never log COPY/SQL parameters, raw source rows, secrets or signed URLs.
  logger.warn({type:error.name},"Knowledge Tree admin operation stopped");
  return c.json({error:"The operation stopped safely. Saved batches remain resumable; refresh before retrying."},503);
});
const description=(summary:string)=>describeRoute({summary,tags:["Knowledge Tree administration"],responses:{
  200:{description:"Administrator operation succeeded"},400:{description:"Invalid source data"},
  401:{description:"Sign in required"},403:{description:"Administrator access required"},
  409:{description:"Import checkpoint or capacity conflict"},503:{description:"Schema or storage unavailable"},
}});
knowledgeTreeAdminRouter.get("/state",description("Inspect recovery import progress"),async c=>c.json(await ktImportState()));
knowledgeTreeAdminRouter.get("/core",description("Inspect core validation and active source"),async c=>c.json(await ktCoreStatus()));
knowledgeTreeAdminRouter.post("/core",validator("json",ktCoreActionSchema),description("Validate or explicitly switch the Knowledge Tree source"),async c=>
  c.json(await ktCoreAction(c.get("user").id,c.req.valid("json"))));
knowledgeTreeAdminRouter.get("/sources/:name/download",description("Download an original private CSV.gz archive"),async c=>
  c.redirect(await ktSourceDownload(c.req.param("name")),302));
knowledgeTreeAdminRouter.post("/start",validator("json",ktStartSchema),description("Confirm or resume an original snapshot import"),async c=>
  c.json(await startKTImport(c.get("user").id,c.req.valid("json"))));
knowledgeTreeAdminRouter.post("/batch",validator("json",ktBatchSchema),description("Commit one bounded resumable import batch"),async c=>
  c.json(await writeKTBatch(c.get("user").id,c.req.valid("json"))));
knowledgeTreeAdminRouter.post("/finish",validator("json",ktFinishSchema),description("Reconcile file import counts"),async c=>
  c.json(await finishKTImport(c.get("user").id,c.req.valid("json").name)));
