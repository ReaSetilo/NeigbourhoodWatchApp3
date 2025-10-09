import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
import { sql } from "./config/db.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT;
app.use(helmet());
app.use(morgan("dev"));//logs requests to the console
app.use(express.json());
app.use(cors());


app.use("/api/admin", adminRoutes);

async function initDB() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS products(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL)`;
        console.log("successful connection")
    } catch (error) {
        console.log("Error initdb", error)
    }
}


initDB().then(() => {
    app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
});
})