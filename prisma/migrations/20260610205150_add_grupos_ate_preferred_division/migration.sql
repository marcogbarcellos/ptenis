-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "gruposAte" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SeasonEntry" ADD COLUMN     "preferredDivisionId" TEXT;

-- AddForeignKey
ALTER TABLE "SeasonEntry" ADD CONSTRAINT "SeasonEntry_preferredDivisionId_fkey" FOREIGN KEY ("preferredDivisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
