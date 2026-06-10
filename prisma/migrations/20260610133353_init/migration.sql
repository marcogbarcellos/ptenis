-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('rascunho', 'inscricoes', 'liga', 'playoffs', 'encerrada');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('amistoso', 'liga', 'playoff');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('pendente', 'aberto', 'proposto', 'marcado', 'aguardando_confirmacao', 'confirmado', 'cancelado', 'wo');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('bo3_mtb', 'set_unico', 'proset8');

-- CreateEnum
CREATE TYPE "PlayoffRound" AS ENUM ('semi1', 'semi2', 'final');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,
    "availability" JSONB,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "communityName" TEXT NOT NULL DEFAULT 'PTenis',
    "inviteCode" TEXT NOT NULL DEFAULT 'PTENIS2026',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'rascunho',
    "inscricoesAte" TIMESTAMP(3),
    "ligaAte" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonEntry" (
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonEntry_pkey" PRIMARY KEY ("seasonId","userId")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivisionPlayer" (
    "divisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ordemInscricao" INTEGER NOT NULL,
    "finalPosition" INTEGER,

    CONSTRAINT "DivisionPlayer_pkey" PRIMARY KEY ("divisionId","userId")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "type" "MatchType" NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "seasonId" TEXT,
    "divisionId" TEXT,
    "round" "PlayoffRound",
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT,
    "createdById" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "location" TEXT,
    "note" TEXT,
    "format" "MatchFormat" NOT NULL DEFAULT 'bo3_mtb',
    "proposedById" TEXT,
    "score" JSONB,
    "winnerId" TEXT,
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Match_status_type_idx" ON "Match"("status", "type");

-- CreateIndex
CREATE INDEX "Match_divisionId_idx" ON "Match"("divisionId");

-- CreateIndex
CREATE INDEX "Match_playerAId_idx" ON "Match"("playerAId");

-- CreateIndex
CREATE INDEX "Match_playerBId_idx" ON "Match"("playerBId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_divisionId_round_key" ON "Match"("divisionId", "round");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEntry" ADD CONSTRAINT "SeasonEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEntry" ADD CONSTRAINT "SeasonEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivisionPlayer" ADD CONSTRAINT "DivisionPlayer_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivisionPlayer" ADD CONSTRAINT "DivisionPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
