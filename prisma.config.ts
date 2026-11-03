import "dotenv/config"
import { defineConfig } from "prisma/config"

const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `mysql://${encodeURIComponent(MYSQL_USER ?? "")}:${encodeURIComponent(MYSQL_PASSWORD ?? "")}@${MYSQL_HOST}:3306/${MYSQL_DATABASE}`,
  },
})
