import "dotenv/config";
import express from "express";
import cors from "cors";
import importRoutes from "./routes/importRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", importRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy CSV importer backend listening on port ${PORT}`);
});
