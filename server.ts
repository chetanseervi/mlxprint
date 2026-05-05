import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// Database setup
const dbPath = process.env.DATABASE_PATH || "xerox.db";
const dbDir = path.dirname(dbPath);
if (dbDir !== "." && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    original_name TEXT,
    page_count INTEGER,
    paper_size TEXT,
    paper_type TEXT,
    color_mode TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_size TEXT,
    color_mode TEXT,
    paper_type TEXT,
    price REAL,
    UNIQUE(paper_size, color_mode, paper_type)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Seed settings
const deliveryFeeSetting = db.prepare("SELECT * FROM settings WHERE key = 'delivery_fee'").get();
if (!deliveryFeeSetting) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('delivery_fee', '50')").run();
}

const deliveryEnabledSetting = db.prepare("SELECT * FROM settings WHERE key = 'home_delivery_enabled'").get();
if (!deliveryEnabledSetting) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('home_delivery_enabled', 'true')").run();
}

const ordersEnabledSetting = db.prepare("SELECT * FROM settings WHERE key = 'orders_enabled'").get();
if (!ordersEnabledSetting) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('orders_enabled', 'true')").run();
}

const ordersDisabledMessageSetting = db.prepare("SELECT * FROM settings WHERE key = 'orders_disabled_message'").get();
if (!ordersDisabledMessageSetting) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('orders_disabled_message', 'We are currently not accepting new orders. Please try again later.')").run();
}

// Seed prices if empty
const priceCount = db.prepare("SELECT COUNT(*) as count FROM prices").get() as any;
if (priceCount.count === 0) {
  const initialPrices = [
    // A4
    ['A4', 'Black & White', '70gsm Standard', 3],
    ['A4', 'Black & White', 'Bond Paper 100gsm', 5],
    ['A4', 'Full Color', '70gsm Standard', 10],
    ['A4', 'Full Color', 'Bond Paper 100gsm', 15],
    ['A4', 'Full Color', 'Photo Paper 135gsm', 50],
    ['A4', 'Full Color', 'Premium Photo Paper 180gsm', 80],
    ['A4', 'Full Color', 'Digital Photo Paper 270gsm', 150],
    // A3
    ['A3', 'Black & White', '80gsm', 5],
    ['A3', 'Black & White', '100gsm', 5],
    ['A3', 'Full Color', '80gsm', 50],
    ['A3', 'Full Color', '100gsm', 50],
    // Photos
    ['Passport size (8 nos)', 'Full Color', 'Photo Print', 80],
    ['Passport (6 nos) + 4 Stamp size', 'Full Color', 'Photo Print', 80],
    ['2x3 inch (2 nos)', 'Full Color', 'Photo Print', 40],
    ['4x6 inch', 'Full Color', 'Photo Print', 30],
    ['5x7 inch', 'Full Color', 'Photo Print', 100],
    ['8x10 inch', 'Full Color', 'Photo Print', 150],
    ['A4 Photo', 'Full Color', 'Photo Print', 170],
    ['Custom Size', 'Full Color', 'Photo Print', 170],
    // PVC Card
    ['Standard PVC', 'Full Color', 'PVC Card', 100],
  ];

  const insertPrice = db.prepare("INSERT INTO prices (paper_size, color_mode, paper_type, price) VALUES (?, ?, ?, ?) ON CONFLICT(paper_size, color_mode, paper_type) DO UPDATE SET price = excluded.price");
  for (const p of initialPrices) {
    insertPrice.run(...p);
  }
} else {
  // Update existing A4 B&W 70gsm price to 3
  db.prepare("UPDATE prices SET price = 3 WHERE paper_size = 'A4' AND color_mode = 'Black & White' AND paper_type = '70gsm Standard'").run();
}

// Migration: Add columns if they don't exist
const columns = db.prepare("PRAGMA table_info(orders)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes("is_delivery")) {
  db.exec("ALTER TABLE orders ADD COLUMN is_delivery INTEGER DEFAULT 0");
}
if (!columnNames.includes("customer_name")) {
  db.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT");
}
if (!columnNames.includes("customer_phone")) {
  db.exec("ALTER TABLE orders ADD COLUMN customer_phone TEXT");
}
if (!columnNames.includes("customer_address")) {
  db.exec("ALTER TABLE orders ADD COLUMN customer_address TEXT");
}
if (!columnNames.includes("total_price")) {
  db.exec("ALTER TABLE orders ADD COLUMN total_price REAL DEFAULT 0");
}
if (!columnNames.includes("cloudinary_url")) {
  db.exec("ALTER TABLE orders ADD COLUMN cloudinary_url TEXT");
}
if (!columnNames.includes("cloudinary_public_id")) {
  db.exec("ALTER TABLE orders ADD COLUMN cloudinary_public_id TEXT");
}
if (!columnNames.includes("order_group_id")) {
  db.exec("ALTER TABLE orders ADD COLUMN order_group_id TEXT");
}
if (!columnNames.includes("order_type")) {
  db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'document'");
}
if (!columnNames.includes("copies")) {
  db.exec("ALTER TABLE orders ADD COLUMN copies INTEGER DEFAULT 1");
}

app.use(cors());
app.use(express.json());

// Logging middleware for API requests
app.use("/api", (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/uploads", express.static(uploadsDir));

// Helper to get MIME type
const getMimeType = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeMap[ext] || 'application/octet-stream';
};

// API Routes
app.get("/api/view/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const isDownload = req.query.download === "true";
    const filePath = path.join(uploadsDir, filename);
    
    console.log(`File request: ${filename} (Download: ${isDownload})`);
    
    const order = db.prepare("SELECT original_name, cloudinary_url, cloudinary_public_id FROM orders WHERE filename = ?").get(filename) as any;
    
    if (!order) {
      return res.status(404).send("Order not found in database");
    }

    const originalName = order.original_name || filename;
    const contentType = getMimeType(originalName);

    // Set headers for viewing or downloading
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition", 
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(originalName)}"`
    );

    // 1. Try serving from local disk first (most reliable)
    if (fs.existsSync(filePath)) {
      console.log(`Serving from local disk: ${filePath}`);
      return res.sendFile(filePath);
    }

    // 2. If not on disk, proxy from Cloudinary (bypasses 401 browser issues)
    if (order.cloudinary_url) {
      console.log(`Proxying from Cloudinary: ${order.cloudinary_url}`);
      
      // Use the Cloudinary URL directly but fetch it on the server
      // This works because the server can access the file even if the browser gets a 401
      // due to how Cloudinary's security might be configured for the client side.
      const response = await fetch(order.cloudinary_url);
      
      if (!response.ok) {
        console.error(`Cloudinary fetch failed: ${response.status} ${response.statusText}`);
        return res.status(response.status).send("Failed to fetch file from cloud storage");
      }

      // Pipe the cloud response to the client
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    }

    res.status(404).send("File not found on server or cloud");
  } catch (error) {
    console.error("File serving error:", error);
    res.status(500).send("Internal server error while serving file");
  }
});

// Keep the old download route for compatibility but redirect to the new one
app.get("/api/download/:filename", (req, res) => {
  res.redirect(`/api/view/${req.params.filename}?download=true`);
});
app.post("/api/upload", upload.array("files"), async (req, res) => {
  try {
    console.log("Received upload request");
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      console.log("No files in request");
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(`Processing ${req.files.length} files`);
    const results = [];

    for (const file of req.files) {
      const filePath = file.path;
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let pageCount = 1;

      console.log(`Processing file: ${file.originalname}, extension: ${fileExtension}`);

      try {
        if (fileExtension === ".pdf") {
          const data = fs.readFileSync(filePath);
          const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } else if (fileExtension === ".docx") {
          const data = fs.readFileSync(filePath);
          const zip = await JSZip.loadAsync(data);
          const appXml = await zip.file("docProps/app.xml")?.async("string");
          if (appXml) {
            const match = appXml.match(/<Pages>(\d+)<\/Pages>/);
            if (match && match[1]) {
              pageCount = parseInt(match[1], 10);
            }
          }
        }
      } catch (err) {
        console.error(`Error reading file ${file.originalname}:`, err);
        pageCount = 1;
      }

      // Upload to Cloudinary if credentials are provided
      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
          console.log(`Uploading ${file.originalname} to Cloudinary...`);
          
          // Use 'auto' for all files as it's the most reliable for detection
          const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder: "xerox_orders",
            // Let Cloudinary generate a unique ID to avoid conflicts
          });
          
          cloudinaryUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
          console.log(`Cloudinary upload success: ${cloudinaryUrl} (Public ID: ${cloudinaryPublicId})`);
          
          // We'll keep the local file as a fallback for now
          // fs.unlinkSync(filePath); 
        } catch (cloudErr) {
          console.error("Cloudinary upload failed:", cloudErr);
        }
      }

      results.push({
        success: true,
        filename: file.filename,
        originalName: file.originalname,
        pageCount,
        cloudinary_url: cloudinaryUrl,
        cloudinary_public_id: cloudinaryPublicId
      });
    }

    console.log("Upload processing complete");
    res.json(results);
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      error: "Failed to process files", 
      details: error.message 
    });
  }
});

app.post("/api/orders", (req, res) => {
  const { files, paperSize, paperType, colorMode, isDelivery, deliveryDetails, totalPrice, orderType, copies } = req.body;
  
  // Check if orders are enabled
  const ordersEnabled = db.prepare("SELECT value FROM settings WHERE key = 'orders_enabled'").get() as any;
  if (ordersEnabled && ordersEnabled.value === 'false') {
    const disabledMessage = db.prepare("SELECT value FROM settings WHERE key = 'orders_disabled_message'").get() as any;
    return res.status(403).json({ 
      error: "Orders are currently disabled", 
      message: disabledMessage?.value || "We are currently not accepting new orders."
    });
  }

  // Generate a unique Order ID for the whole group
  const orderGroupId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

  const stmt = db.prepare(`
    INSERT INTO orders (
      filename, original_name, page_count, paper_size, paper_type, color_mode,
      is_delivery, customer_name, customer_phone, customer_address, total_price, 
      cloudinary_url, cloudinary_public_id, order_group_id, order_type, copies
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((orderFiles) => {
    for (const file of orderFiles) {
      stmt.run(
        file.filename, 
        file.originalName, 
        file.pageCount, 
        paperSize, 
        paperType, 
        colorMode,
        isDelivery ? 1 : 0,
        deliveryDetails?.name || null,
        deliveryDetails?.phone || null,
        deliveryDetails?.address || null,
        totalPrice || 0,
        file.cloudinary_url || null,
        file.cloudinary_public_id || null,
        orderGroupId,
        orderType || 'document',
        copies || 1
      );
    }
  });

  transaction(files);
  
  res.json({ success: true, orderId: orderGroupId });
});

app.get("/api/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(orders);
});

app.get("/api/prices", (req, res) => {
  const prices = db.prepare("SELECT * FROM prices").all();
  res.json(prices);
});

app.post("/api/prices/bulk", (req, res) => {
  const { prices } = req.body;
  if (!Array.isArray(prices)) {
    return res.status(400).json({ error: "Prices must be an array" });
  }

  try {
    const insertPrice = db.prepare(`
      INSERT INTO prices (paper_size, color_mode, paper_type, price) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(paper_size, color_mode, paper_type) DO UPDATE SET price = excluded.price
    `);

    const transaction = db.transaction((priceList) => {
      for (const p of priceList) {
        insertPrice.run(p.paper_size, p.color_mode, p.paper_type, p.price);
      }
    });

    transaction(prices);
    res.json({ success: true, count: prices.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/prices", (req, res) => {
  const { paper_size, color_mode, paper_type, price } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO prices (paper_size, color_mode, paper_type, price) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(paper_size, color_mode, paper_type) DO UPDATE SET price = excluded.price
    `).run(paper_size, color_mode, paper_type, price);
    res.json({ success: true, changes: result.changes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  const settingsMap = settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsMap);
});

app.post("/api/settings/bulk", (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: "Settings must be an object" });
  }

  try {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    
    const transaction = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        insertSetting.run(key, String(value));
      }
    });

    transaction(settings);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  try {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Try updating by order_group_id first, then by id
  const result = db.prepare("UPDATE orders SET status = ? WHERE order_group_id = ? OR id = ?").run(status, id, id);
  res.json({ success: true, changes: result.changes });
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete order(s) with ID/Group: ${id}`);
    
    // Get all files in the group/order to delete physical/cloud files
    const orders = db.prepare("SELECT filename, cloudinary_public_id, cloudinary_url FROM orders WHERE order_group_id = ? OR id = ?").all(id, id) as any[];
    
    for (const order of orders) {
      // Delete from Cloudinary if exists
      if (order.cloudinary_public_id && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          let resourceType = "image";
          if (order.cloudinary_url && order.cloudinary_url.includes("/raw/")) {
            resourceType = "raw";
          } else if (order.cloudinary_url && order.cloudinary_url.includes("/video/")) {
            resourceType = "video";
          }
          
          console.log(`Deleting from Cloudinary: ${order.cloudinary_public_id} (Type: ${resourceType})`);
          await cloudinary.uploader.destroy(order.cloudinary_public_id, { resource_type: resourceType });
        } catch (cloudErr) {
          console.error("Error deleting from Cloudinary:", cloudErr);
        }
      }

      // Delete local file if exists
      if (order.filename) {
        const filePath = path.join(process.cwd(), "uploads", order.filename);
        console.log(`Deleting local file: ${filePath}`);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileErr) {
          console.error("Error deleting physical file:", fileErr);
        }
      }
    }
    
    const result = db.prepare("DELETE FROM orders WHERE order_group_id = ? OR id = ?").run(id, id);
    console.log(`Delete result: ${result.changes} rows affected`);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message 
  });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
