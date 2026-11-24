-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "name", "orderId", "quantity", "unitPrice") SELECT "id", "name", "orderId", "quantity", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
