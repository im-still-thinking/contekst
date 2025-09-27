import { drizzle } from "drizzle-orm/mysql2";
import { config } from "./config";
import mysql from "mysql2/promise";
import * as schema from "../models";

const poolConnection = mysql.createPool({
    uri: config.MYSQL_URL,
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });

export { schema };