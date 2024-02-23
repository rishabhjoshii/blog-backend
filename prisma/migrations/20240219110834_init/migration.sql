/*
  Warnings:

  - You are about to drop the column `body` on the `blog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `blog` table. All the data in the column will be lost.
  - Added the required column `authorId` to the `blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `blog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "blog" DROP COLUMN "body",
DROP COLUMN "userId",
ADD COLUMN     "authorId" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "blog" ADD CONSTRAINT "blog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
