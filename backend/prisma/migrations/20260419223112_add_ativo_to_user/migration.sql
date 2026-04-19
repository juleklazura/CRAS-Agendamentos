-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'entrevistador', 'recepcao');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'realizado', 'ausente');

-- CreateEnum
CREATE TYPE "MotivoAgendamento" AS ENUM ('atualizacao_cadastral', 'inclusao', 'transferencia_municipio', 'orientacoes_gerais');

-- CreateTable
CREATE TABLE "cras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,

    CONSTRAINT "cras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "matricula" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "cras_id" TEXT,
    "horariosDisponiveis" TEXT[] DEFAULT ARRAY['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']::TEXT[],
    "diasAtendimento" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "entrevistador_id" TEXT NOT NULL,
    "cras_id" TEXT NOT NULL,
    "pessoa" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cpf_hash" TEXT NOT NULL,
    "telefone1" TEXT NOT NULL,
    "telefone2" TEXT,
    "motivo" "MotivoAgendamento" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'agendado',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL,
    "entrevistador_id" TEXT NOT NULL,
    "cras_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cras_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cras_nome_idx" ON "cras"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_matricula_key" ON "users"("matricula");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_cras_id_idx" ON "users"("cras_id");

-- CreateIndex
CREATE INDEX "users_cras_id_role_idx" ON "users"("cras_id", "role");

-- CreateIndex
CREATE INDEX "appointments_entrevistador_id_data_status_idx" ON "appointments"("entrevistador_id", "data", "status");

-- CreateIndex
CREATE INDEX "appointments_cras_id_data_idx" ON "appointments"("cras_id", "data");

-- CreateIndex
CREATE INDEX "appointments_cpf_hash_idx" ON "appointments"("cpf_hash");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_data_idx" ON "appointments"("data");

-- CreateIndex
CREATE INDEX "appointments_motivo_idx" ON "appointments"("motivo");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_entrevistador_id_data_key" ON "appointments"("entrevistador_id", "data");

-- CreateIndex
CREATE INDEX "blocked_slots_data_idx" ON "blocked_slots"("data");

-- CreateIndex
CREATE INDEX "blocked_slots_entrevistador_id_idx" ON "blocked_slots"("entrevistador_id");

-- CreateIndex
CREATE INDEX "blocked_slots_cras_id_idx" ON "blocked_slots"("cras_id");

-- CreateIndex
CREATE INDEX "blocked_slots_entrevistador_id_data_idx" ON "blocked_slots"("entrevistador_id", "data");

-- CreateIndex
CREATE INDEX "blocked_slots_cras_id_data_idx" ON "blocked_slots"("cras_id", "data");

-- CreateIndex
CREATE INDEX "logs_user_id_idx" ON "logs"("user_id");

-- CreateIndex
CREATE INDEX "logs_cras_id_idx" ON "logs"("cras_id");

-- CreateIndex
CREATE INDEX "logs_action_idx" ON "logs"("action");

-- CreateIndex
CREATE INDEX "logs_user_id_date_idx" ON "logs"("user_id", "date" DESC);

-- CreateIndex
CREATE INDEX "logs_cras_id_date_idx" ON "logs"("cras_id", "date" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cras_id_fkey" FOREIGN KEY ("cras_id") REFERENCES "cras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_entrevistador_id_fkey" FOREIGN KEY ("entrevistador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cras_id_fkey" FOREIGN KEY ("cras_id") REFERENCES "cras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_entrevistador_id_fkey" FOREIGN KEY ("entrevistador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_cras_id_fkey" FOREIGN KEY ("cras_id") REFERENCES "cras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_cras_id_fkey" FOREIGN KEY ("cras_id") REFERENCES "cras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
