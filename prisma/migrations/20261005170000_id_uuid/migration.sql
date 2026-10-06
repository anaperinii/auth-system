ALTER TABLE "users"
  ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
