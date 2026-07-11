import { Router } from "express";
import { uploadMiddleware } from "../middleware/uploadMiddleware.js";
import { handleImport, handlePreview } from "../controllers/importController.js";

const router = Router();

router.post("/import", uploadMiddleware.single("file"), handleImport);
router.post("/preview", uploadMiddleware.single("file"), handlePreview);

export default router;
