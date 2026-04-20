import { Router, type IRouter } from "express";
import { createDevnetRpcCache } from "../lib/devnetRpcCache";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const cache = createDevnetRpcCache({ logger });

router.post("/devnet-rpc", async (req, res) => {
  const raw =
    req.body instanceof Buffer
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : "";
  const { status, body, cacheStatus } = await cache.handle(raw);
  res.status(status);
  res.setHeader("content-type", "application/json");
  res.setHeader("x-devnet-rpc-cache", cacheStatus);
  res.send(body);
});

export default router;
