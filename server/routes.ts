import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import path from "path";
import { getDb, loadDatabase, isDbLoaded, getUploadDir } from "./db";

const upload = multer({
  dest: getUploadDir(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".db" || ext === ".sqlite" || ext === ".sqlite3") {
      cb(null, true);
    } else {
      cb(new Error("Only .db, .sqlite, .sqlite3 files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Status ────────────────────────────────────────────────────────────────
  app.get("/api/status", (_req: Request, res: Response) => {
    res.json({ loaded: isDbLoaded() });
  });

  // ── Upload DB ─────────────────────────────────────────────────────────────
  app.post("/api/upload-db", upload.single("database"), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      loadDatabase(req.file.path);
      res.json({ success: true, filename: req.file.originalname });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Company ───────────────────────────────────────────────────────────────
  app.get("/api/company", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const company = db.prepare(`
        SELECT
          Name as name,
          Address as address,
          City as city,
          PostalCode as postalCode,
          PhoneNumber as phone,
          Email as email,
          TaxNumber as taxNumber,
          StreetName as streetName,
          CountrySubentity as region
        FROM Company
        LIMIT 1
      `).get() as any;

      res.json(company || { name: "BizLedger" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get("/api/dashboard", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const stockSummary = db.prepare(`
        SELECT
          COALESCE(SUM(s.Quantity), 0) as totalQty,
          COALESCE(SUM(CASE WHEN s.Quantity > 0 THEN s.Quantity * p.Cost ELSE 0 END), 0) as totalCostValue,
          COALESCE(SUM(CASE WHEN s.Quantity > 0 THEN s.Quantity * p.Price ELSE 0 END), 0) as totalSaleValue,
          COUNT(CASE WHEN s.Quantity > 0 THEN 1 END) as inStockCount,
          COUNT(CASE WHEN s.Quantity <= 0 THEN 1 END) as outOfStockCount
        FROM Stock s
        JOIN Product p ON s.ProductId = p.Id
        WHERE p.IsEnabled = 1
      `).get() as any;

      const customerOutstanding = db.prepare(`
        SELECT COALESCE(SUM(d.Total - COALESCE(pay.totalPaid, 0)), 0) as outstanding
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        JOIN Customer c ON d.CustomerId = c.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid
          FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code IN ('200', '220') AND c.IsCustomer = 1
          AND (d.Total - COALESCE(pay.totalPaid, 0)) > 0
      `).get() as any;

      const supplierOutstanding = db.prepare(`
        SELECT COALESCE(SUM(d.Total - COALESCE(pay.totalPaid, 0)), 0) as outstanding
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        JOIN Customer c ON d.CustomerId = c.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid
          FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code IN ('100', '120') AND c.IsSupplier = 1
          AND (d.Total - COALESCE(pay.totalPaid, 0)) > 0
      `).get() as any;

      const productCount = (db.prepare("SELECT COUNT(*) as count FROM Product WHERE IsEnabled = 1").get() as any).count;
      const customerCount = (db.prepare("SELECT COUNT(*) as count FROM Customer WHERE IsCustomer = 1 AND IsEnabled = 1").get() as any).count;
      const supplierCount = (db.prepare("SELECT COUNT(*) as count FROM Customer WHERE IsSupplier = 1 AND IsEnabled = 1").get() as any).count;

      res.json({
        stock: {
          totalQty: stockSummary.totalQty,
          totalCostValue: stockSummary.totalCostValue,
          totalSaleValue: stockSummary.totalSaleValue,
          inStockCount: stockSummary.inStockCount,
          outOfStockCount: stockSummary.outOfStockCount,
        },
        customerOutstanding: customerOutstanding.outstanding,
        supplierOutstanding: supplierOutstanding.outstanding,
        counts: { products: productCount, customers: customerCount, suppliers: supplierCount },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Stock ─────────────────────────────────────────────────────────────────
  app.get("/api/stock", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const rows = db.prepare(`
        SELECT
          p.Id as id,
          p.Name as name,
          p.Code as code,
          p.MeasurementUnit as unit,
          p.Price as price,
          p.Cost as cost,
          COALESCE(s.Quantity, 0) as quantity,
          COALESCE(s.Quantity * p.Cost, 0) as costValue,
          COALESCE(s.Quantity * p.Price, 0) as saleValue
        FROM Product p
        LEFT JOIN Stock s ON s.ProductId = p.Id
        WHERE p.IsEnabled = 1
        ORDER BY p.Name
      `).all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Customers ─────────────────────────────────────────────────────────────
  app.get("/api/customers", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const rows = db.prepare(`
        SELECT
          c.Id as id,
          c.Code as code,
          c.Name as name,
          c.PhoneNumber as phone,
          c.Email as email,
          COALESCE(sales.totalSales, 0) as totalSales,
          COALESCE(sales.totalPaid, 0) as totalPaid,
          COALESCE(sales.totalSales, 0) - COALESCE(sales.totalPaid, 0) as outstanding
        FROM Customer c
        LEFT JOIN (
          SELECT
            d.CustomerId,
            SUM(d.Total) as totalSales,
            SUM(COALESCE(pay.totalPaid, 0)) as totalPaid
          FROM Document d
          JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
          LEFT JOIN (
            SELECT DocumentId, SUM(Amount) as totalPaid
            FROM Payment GROUP BY DocumentId
          ) pay ON pay.DocumentId = d.Id
          WHERE dt.Code IN ('200', '220')
          GROUP BY d.CustomerId
        ) sales ON sales.CustomerId = c.Id
        WHERE c.IsCustomer = 1 AND c.IsEnabled = 1
        ORDER BY outstanding DESC
      `).all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Suppliers ─────────────────────────────────────────────────────────────
  app.get("/api/suppliers", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const rows = db.prepare(`
        SELECT
          c.Id as id,
          c.Code as code,
          c.Name as name,
          c.PhoneNumber as phone,
          c.Email as email,
          COALESCE(purchases.totalPurchases, 0) as totalPurchases,
          COALESCE(purchases.totalPaid, 0) as totalPaid,
          COALESCE(purchases.totalPurchases, 0) - COALESCE(purchases.totalPaid, 0) as outstanding
        FROM Customer c
        LEFT JOIN (
          SELECT
            d.CustomerId,
            SUM(d.Total) as totalPurchases,
            SUM(COALESCE(pay.totalPaid, 0)) as totalPaid
          FROM Document d
          JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
          LEFT JOIN (
            SELECT DocumentId, SUM(Amount) as totalPaid
            FROM Payment GROUP BY DocumentId
          ) pay ON pay.DocumentId = d.Id
          WHERE dt.Code IN ('100', '120')
          GROUP BY d.CustomerId
        ) purchases ON purchases.CustomerId = c.Id
        WHERE c.IsSupplier = 1 AND c.IsEnabled = 1
        ORDER BY outstanding DESC
      `).all();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Customer Documents ────────────────────────────────────────────────────
  app.get("/api/customer/:id/documents", (req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const rows = db.prepare(`
        SELECT
          d.Id as id,
          d.Number as number,
          d.Date as date,
          d.Total as total,
          dt.Name as typeName,
          COALESCE(pay.totalPaid, 0) as paid,
          d.Total - COALESCE(pay.totalPaid, 0) as balance
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid
          FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE d.CustomerId = ? AND dt.Code IN ('200', '220')
        ORDER BY d.Date DESC
      `).all(req.params.id);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Supplier Documents ────────────────────────────────────────────────────
  app.get("/api/supplier/:id/documents", (req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const rows = db.prepare(`
        SELECT
          d.Id as id,
          d.Number as number,
          d.Date as date,
          d.Total as total,
          dt.Name as typeName,
          COALESCE(pay.totalPaid, 0) as paid,
          d.Total - COALESCE(pay.totalPaid, 0) as balance
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid
          FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE d.CustomerId = ? AND dt.Code IN ('100', '120')
        ORDER BY d.Date DESC
      `).all(req.params.id);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ── Reports: Sales by Month ───────────────────────────────────────────────
  app.get("/api/reports/sales", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const monthly = db.prepare(`
        SELECT
          strftime('%Y-%m', d.Date) as month,
          COUNT(*) as txns,
          SUM(d.Total) as total,
          SUM(COALESCE(pay.totalPaid, 0)) as paid,
          SUM(d.Total - COALESCE(pay.totalPaid, 0)) as outstanding
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code = '200'
        GROUP BY month ORDER BY month DESC LIMIT 24
      `).all();

      const totals = db.prepare(`
        SELECT
          COUNT(*) as totalTxns,
          SUM(d.Total) as totalRevenue,
          SUM(COALESCE(pay.totalPaid,0)) as totalPaid,
          SUM(d.Total - COALESCE(pay.totalPaid,0)) as totalOutstanding,
          COUNT(DISTINCT d.CustomerId) as uniqueCustomers
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code = '200'
      `).get();

      const topProducts = db.prepare(`
        SELECT
          p.Name as name,
          p.Code as code,
          SUM(di.Quantity) as qty,
          SUM(di.Total) as revenue,
          COUNT(DISTINCT d.Id) as txns
        FROM DocumentItem di
        JOIN Product p ON di.ProductId = p.Id
        JOIN Document d ON di.DocumentId = d.Id
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        WHERE dt.Code = '200'
        GROUP BY p.Id ORDER BY revenue DESC LIMIT 10
      `).all();

      res.json({ monthly, totals, topProducts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Reports: Purchases by Month ───────────────────────────────────────────
  app.get("/api/reports/purchases", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const monthly = db.prepare(`
        SELECT
          strftime('%Y-%m', d.Date) as month,
          COUNT(*) as txns,
          SUM(d.Total) as total,
          SUM(COALESCE(pay.totalPaid, 0)) as paid,
          SUM(d.Total - COALESCE(pay.totalPaid, 0)) as outstanding
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code = '100'
        GROUP BY month ORDER BY month DESC LIMIT 24
      `).all();

      const totals = db.prepare(`
        SELECT
          COUNT(*) as totalTxns,
          SUM(d.Total) as totalSpend,
          SUM(COALESCE(pay.totalPaid,0)) as totalPaid,
          SUM(d.Total - COALESCE(pay.totalPaid,0)) as totalOutstanding,
          COUNT(DISTINCT d.CustomerId) as uniqueSuppliers
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN (
          SELECT DocumentId, SUM(Amount) as totalPaid FROM Payment GROUP BY DocumentId
        ) pay ON pay.DocumentId = d.Id
        WHERE dt.Code = '100'
      `).get();

      const topSuppliers = db.prepare(`
        SELECT
          c.Name as name, c.Code as code,
          COUNT(DISTINCT d.Id) as txns,
          SUM(d.Total) as total
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        JOIN Customer c ON d.CustomerId = c.Id
        WHERE dt.Code = '100'
        GROUP BY c.Id ORDER BY total DESC LIMIT 10
      `).all();

      res.json({ monthly, totals, topSuppliers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Reports: Payment Methods ──────────────────────────────────────────────
  app.get("/api/reports/payments", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const byMethod = db.prepare(`
        SELECT
          pt.Name as method,
          COUNT(*) as count,
          SUM(p.Amount) as total
        FROM Payment p
        JOIN PaymentType pt ON p.PaymentTypeId = pt.Id
        GROUP BY pt.Name ORDER BY total DESC
      `).all();

      const grandTotal = (byMethod as any[]).reduce((s: number, r: any) => s + (r.total || 0), 0);

      const result = (byMethod as any[]).map((r: any) => ({
        ...r,
        percentage: grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : "0.0",
      }));

      res.json({ methods: result, grandTotal });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Reports: Profit & Loss ────────────────────────────────────────────────
  app.get("/api/reports/pnl", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const monthly = db.prepare(`
        SELECT
          strftime('%Y-%m', d.Date) as month,
          SUM(di.Total) as revenue,
          SUM(di.Quantity * p.Cost) as cogs,
          SUM(di.Total) - SUM(di.Quantity * p.Cost) as grossProfit
        FROM DocumentItem di
        JOIN Document d ON di.DocumentId = d.Id
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        JOIN Product p ON di.ProductId = p.Id
        WHERE dt.Code = '200'
        GROUP BY month ORDER BY month DESC LIMIT 24
      `).all();

      const totals = db.prepare(`
        SELECT
          SUM(di.Total) as totalRevenue,
          SUM(di.Quantity * p.Cost) as totalCOGS,
          SUM(di.Total) - SUM(di.Quantity * p.Cost) as grossProfit
        FROM DocumentItem di
        JOIN Document d ON di.DocumentId = d.Id
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        JOIN Product p ON di.ProductId = p.Id
        WHERE dt.Code = '200'
      `).get() as any;

      const margin = totals?.totalRevenue > 0
        ? ((totals.grossProfit / totals.totalRevenue) * 100).toFixed(1)
        : "0.0";

      res.json({ monthly, totals: { ...totals, margin } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Reports: Voids ────────────────────────────────────────────────────────
  app.get("/api/reports/voids", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      // Try PosVoid table
      let voids: any[] = [];
      let summary: any = { count: 0, total: 0 };

      try {
        voids = db.prepare(`
          SELECT
            v.Id as id,
            v.Date as date,
            v.Total as total,
            v.Reason as reason,
            p.Name as productName,
            p.Code as productCode
          FROM PosVoid v
          LEFT JOIN Product p ON v.ProductId = p.Id
          ORDER BY v.Date DESC LIMIT 200
        `).all();

        summary = db.prepare(`
          SELECT COUNT(*) as count, COALESCE(SUM(Total),0) as total FROM PosVoid
        `).get();
      } catch {
        // PosVoid table may not exist in all versions
      }

      res.json({ voids, summary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ── Document Line Items ───────────────────────────────────────────────────
  app.get("/api/document/:id/items", (req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });
      const rows = db.prepare(`
        SELECT
          di.Id as id,
          p.Name as productName,
          p.Code as productCode,
          p.MeasurementUnit as unit,
          di.Quantity as quantity,
          di.Price as price,
          di.Discount as discount,
          di.DiscountType as discountType,
          di.ProductCost as cost,
          di.Total as total
        FROM DocumentItem di
        JOIN Product p ON di.ProductId = p.Id
        WHERE di.DocumentId = ?
        ORDER BY di.Id
      `).all(req.params.id);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Z-Report / Daily Closing ──────────────────────────────────────────────
  app.get("/api/reports/zreport", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const zreports = db.prepare(`
        SELECT
          z.Id as id,
          z.Number as number,
          z.DateCreated as date,
          z.FromDocumentId as fromDoc,
          z.ToDocumentId as toDoc
        FROM ZReport z
        ORDER BY z.DateCreated DESC
      `).all() as any[];

      // For each Z-report, calculate sales in its document range
      const enriched = zreports.map((z: any) => {
        // If FromDocumentId and ToDocumentId are both 0, fetch all-time totals
        const rangeClause = z.fromDoc > 0 && z.toDoc > 0
          ? 'AND d.Id BETWEEN ? AND ?'
          : '';
        const rangeParams = z.fromDoc > 0 && z.toDoc > 0
          ? [z.fromDoc, z.toDoc]
          : [];

        const salesSql = `
          SELECT
            COALESCE(SUM(d.Total), 0) as salesTotal,
            COUNT(*) as salesCount
          FROM Document d
          JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
          WHERE dt.Code = '200' ${rangeClause}`;

        const refundSql = `
          SELECT COALESCE(SUM(d.Total), 0) as refundTotal, COUNT(*) as refundCount
          FROM Document d
          JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
          WHERE dt.Code = '220' ${rangeClause}`;

        const paymentSql = `
          SELECT pt.Name as method, COALESCE(SUM(p.Amount), 0) as total, COUNT(*) as count
          FROM Payment p
          JOIN PaymentType pt ON p.PaymentTypeId = pt.Id
          JOIN Document d ON p.DocumentId = d.Id
          JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
          WHERE dt.Code IN ('200', '220') ${rangeClause}
          GROUP BY pt.Name`;

        const sales = rangeParams.length
          ? db.prepare(salesSql).get(rangeParams) as any
          : db.prepare(salesSql).get() as any;

        const refunds = rangeParams.length
          ? db.prepare(refundSql).get(rangeParams) as any
          : db.prepare(refundSql).get() as any;

        const payments = rangeParams.length
          ? db.prepare(paymentSql).all(rangeParams) as any[]
          : db.prepare(paymentSql).all() as any[];

        return {
          ...z,
          salesTotal: sales?.salesTotal ?? 0,
          salesCount: sales?.salesCount ?? 0,
          refundTotal: refunds?.refundTotal ?? 0,
          refundCount: refunds?.refundCount ?? 0,
          netTotal: (sales?.salesTotal ?? 0) - (refunds?.refundTotal ?? 0),
          payments,
        };
      });

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Loss & Damage + Inventory Count ──────────────────────────────────────
  app.get("/api/reports/inventory", (_req: Request, res: Response) => {
    try {
      const db = getDb();
      if (!db) return res.status(400).json({ error: "No database loaded" });

      const lossAndDamage = db.prepare(`
        SELECT
          d.Id as id, d.Number as number, d.Date as date, d.Total as total,
          dt.Name as typeName,
          COUNT(di.Id) as itemCount,
          SUM(di.Quantity) as totalQty
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN DocumentItem di ON di.DocumentId = d.Id
        WHERE dt.Code = '400'
        GROUP BY d.Id ORDER BY d.Date DESC
      `).all();

      const inventoryCount = db.prepare(`
        SELECT
          d.Id as id, d.Number as number, d.Date as date, d.Total as total,
          dt.Name as typeName,
          COUNT(di.Id) as itemCount
        FROM Document d
        JOIN DocumentType dt ON d.DocumentTypeId = dt.Id
        LEFT JOIN DocumentItem di ON di.DocumentId = d.Id
        WHERE dt.Code = '300'
        GROUP BY d.Id ORDER BY d.Date DESC
      `).all();

      const ldSummary = db.prepare(`
        SELECT COALESCE(SUM(d.Total),0) as total, COUNT(*) as count
        FROM Document d JOIN DocumentType dt ON d.DocumentTypeId=dt.Id
        WHERE dt.Code='400'
      `).get();

      res.json({ lossAndDamage, inventoryCount, ldSummary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Settings: Company (already exists as GET /api/company) ───────────────
  // No additional server changes needed for settings screen

  const httpServer = createServer(app);
  return httpServer;
}
