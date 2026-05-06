-- CreateIndex
CREATE INDEX "appointments_cras_id_status_data_idx" ON "appointments"("cras_id", "status", "data");

-- CreateIndex
CREATE INDEX "appointments_data_status_idx" ON "appointments"("data", "status");
