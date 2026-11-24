CREATE TABLE "ratelimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ratelimit_pkey" PRIMARY KEY ("key")
);
