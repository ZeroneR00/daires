-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_status_createdAt_idx" ON "report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporterId_postId_key" ON "report"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporterId_commentId_key" ON "report"("reporterId", "commentId");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Дописано руками: инвариант «жалоба ровно на один объект».
-- Prisma объявлять CHECK не умеет (прецедент ручной правки миграции —
-- add_fulltext_search_indexes), поэтому строка живёт только здесь: в
-- schema.prisma её нет и `migrate dev` дрейфом это не считает.
--
-- num_nonnulls() — встроенная функция Postgres, считает НЕ-NULL аргументы.
-- Ровно один заполненный FK: ни жалобы в никуда (оба NULL), ни жалобы
-- сразу на запись и комментарий (оба заполнены).
--
-- Это последняя линия обороны, а не единственная: экшен createReport
-- проверяет то же самое и отвечает пользователю по-человечески. Констрейнт
-- ловит то, что мимо экшена, — прямой SQL, будущий импорт, чужой скрипт.
ALTER TABLE "report" ADD CONSTRAINT "report_target_check"
  CHECK (num_nonnulls("postId", "commentId") = 1);
