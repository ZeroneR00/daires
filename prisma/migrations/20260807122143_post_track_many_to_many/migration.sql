/*
  Warnings:

  - You are about to drop the column `trackId` on the `post` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_trackId_fkey";

-- AlterTable
ALTER TABLE "post" DROP COLUMN "trackId";

-- CreateTable
CREATE TABLE "post_track" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_track_trackId_idx" ON "post_track"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "post_track_postId_trackId_key" ON "post_track"("postId", "trackId");

-- AddForeignKey
ALTER TABLE "post_track" ADD CONSTRAINT "post_track_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_track" ADD CONSTRAINT "post_track_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
