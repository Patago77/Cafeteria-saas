-- CreateEnum
CREATE TYPE "CanalPedido" AS ENUM ('salon', 'take_away', 'delivery');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('pendiente', 'en_camino', 'entregado');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "canal" "CanalPedido" NOT NULL DEFAULT 'salon',
ADD COLUMN     "direccionEntrega" TEXT,
ADD COLUMN     "estadoEntrega" "EstadoEntrega",
ADD COLUMN     "notasEntrega" TEXT,
ADD COLUMN     "repartidorId" TEXT,
ADD COLUMN     "telefonoEntrega" TEXT;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
