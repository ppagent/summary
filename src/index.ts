import "dotenv/config";
import { configDotenv } from "dotenv";
import path from "node:path";

const env = process.env.NODE_ENV;
const envFile = path.resolve("./config", env === "development" ? `.env.${env}` : ".env");
console.info("using env file " + envFile);
configDotenv({
    path: envFile,
});
import("./app.js");
