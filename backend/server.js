import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
import { supabase } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan("dev")); // logs requests to the console
app.use(express.json());
app.use(cors());

app.use("/api/admin", adminRoutes);

async function initDB() {
    try {
        // Test the connection by querying the users table
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error) {
            console.log("❌ Error connecting to Supabase:", error.message);
            console.log("Error details:", error);
            console.log("\nPlease check:");
            console.log("1. Your SUPABASE_URL in .env file");
            console.log("2. Your SUPABASE_ANON_KEY in .env file");
            console.log("3. Make sure there are no quotes around the values");
            console.log("4. Verify the table 'users' exists in your Supabase database");
        } else {
            console.log("✅ Successfully connected to Supabase database");
            console.log(`📊 Database is ready`);
        }
    } catch (error) {
        console.log("❌ Error initializing database:", error.message);
        console.log("\nTroubleshooting steps:");
        console.log("1. Check if SUPABASE_URL and SUPABASE_ANON_KEY are set in .env");
        console.log("2. Verify your network connection");
        console.log("3. Check if Supabase project is active");
    }
}

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
});