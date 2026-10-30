import { version } from "./package.json"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: version,
  },
  experimental: {
    middlewareClientMaxBodySize: "200mb",
  },
}

export default nextConfig
