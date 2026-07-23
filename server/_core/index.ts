import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getArtworkWithPhotos, getArtworksByIds, getLatestOutDatesByArtworkIds } from "../db";
import { generateWord, generatePdf, generateListPdf, getExportFilename } from "../export";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 匯出 Word / PDF 路由
  app.get("/api/export/:format/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const format = req.params.format as "word" | "pdf";
      if (isNaN(id) || (format !== "word" && format !== "pdf")) {
        res.status(400).json({ error: "Invalid parameters" });
        return;
      }

      // 驗證登入
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const artwork = await getArtworkWithPhotos(id);
      if (!artwork) {
        res.status(404).json({ error: "Artwork not found" });
        return;
      }

      const filename = getExportFilename(artwork);
      const encodedFilename = encodeURIComponent(filename);

      if (format === "word") {
        const buffer = await generateWord(artwork);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}.docx`);
        res.send(buffer);
      } else {
        const buffer = await generatePdf(artwork);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}.pdf`);
        res.send(buffer);
      }
    } catch (error) {
      console.error("[Export Error]", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // 匯出作品清單 PDF（POST：接收勾選的作品 ID 陣列）
  app.post("/api/export/list-pdf", async (req, res) => {
    try {
      // 驗證登入
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      if (ids.length === 0) {
        res.status(400).json({ error: "未選擇任何作品" });
        return;
      }

      const artworks = await getArtworksByIds(ids);
      const outDateMap = await getLatestOutDatesByArtworkIds(ids);

      const items = artworks.map((aw) => ({
        id: aw.id,
        artworkNo: aw.artworkNo,
        title: aw.title,
        titleNotProvided: aw.titleNotProvided,
        artist: aw.artist,
        status: aw.status,
        thumbnail: aw.thumbnail,
        entryDate: aw.entryDate,
        outDate: outDateMap.get(aw.id) ?? null,
      }));

      const buffer = await generateListPdf(items);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent("作品清單")}.pdf`);
      res.send(buffer);
    } catch (error) {
      console.error("[List Export Error]", error);
      res.status(500).json({ error: "Failed to generate list PDF" });
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
