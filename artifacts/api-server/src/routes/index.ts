import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devnetRpcRouter from "./devnetRpc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devnetRpcRouter);

export default router;
