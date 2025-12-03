// routes/category.routes.js
import { Router } from "express";

import { createCategory, listCategories, deleteCategory, updateCategory  } from "../controllers/category.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, requireRole("admin"), createCategory);
router.get("/", listCategories);
router.delete("/:id", requireAuth, requireRole("admin"), deleteCategory);
router.put("/:id", requireAuth, requireRole("admin"), updateCategory);


export default router;