/** Quick health report of the database:  npm run db:check */
import { DB_PATH, openDb } from "../lib/server/db";

const db = openDb();
console.log("Database:", DB_PATH);
const t = (sql: string) => console.table(db.prepare(sql).all());
t("SELECT COUNT(*) incidents, SUM(category='MAJOR') major, SUM(category='OTHER') other, MIN(incident_date) first, MAX(incident_date) last FROM incidents");
t("SELECT year, COUNT(*) incidents FROM incidents GROUP BY year ORDER BY year");
t("SELECT region, COUNT(*) incidents FROM incidents i JOIN districts d ON d.name=i.district GROUP BY region");
t("SELECT district, COUNT(*) incidents FROM incidents GROUP BY 1 ORDER BY 2 DESC LIMIT 10");
db.close();
