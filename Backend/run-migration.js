import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', 'add-warranty-triggers.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing warranty triggers migration...');

        // Execute the migration
        await pool.query(migrationSQL);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();