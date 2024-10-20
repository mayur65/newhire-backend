const mysql = require('mysql2/promise');
require('dotenv').config();

const HOST = process.env.DB_HOST || "PASTE YOUR SINGLESTORE ADMIN ENDPOINT HERE";
const USER = process.env.DB_USER || "admin";
const PASSWORD = process.env.DB_PASSWORD || "PASTE YOUR PASSWORD HERE";
const DATABASE = process.env.DB_NAME || "app";
const PORT = process.env.DB_PORT || "8080";

// Define a class to manage the connection pool and database operations
class SingleStoreDB {
    constructor() {
        this.pool = mysql.createPool({
            host: HOST,
            port: PORT,
            user: USER,
            password: PASSWORD,
            database: DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }

    // Utility function to get a connection from the pool
    async getConnection() {
        return this.pool.getConnection();
    }

    // Function to insert data into the database
    async createInterview({ data }) {
        const conn = await this.getConnection();
        try {
            const query = `
            INSERT INTO data (id, name, role, company, job_description, questions)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
            // Inserting the new fields into the database
            await conn.query(query, [
                data.id,
                data.name,
                data.role,
                data.company,
                data.job_description,
                data.linkedin_profile,
                data.github_profile,
                data.questions
            ]);
        } finally {
            conn.release();
        }
    }

    async updateData({ data }) {
        const conn = await this.getConnection();
        try {
            const query = `
            UPDATE data SET interview_record=? WHERE id = ?
        `;
            // Inserting the new fields into the database
            await conn.query(query, [
                data.interview_record,
                data.id
            ]);
        } finally {
            conn.release();
        }
    }

    async getAll() {
        const conn = await this.getConnection();
        try {
            const query = `
            SELECT * FROM data
        `;
            // Inserting the new fields into the database
            const [rows] = await conn.query(query);
            return rows
        } finally {
            conn.release();
        }
    }

    async readOne({ id }) {
        const conn = await this.getConnection();
        try {
            const [rows] = await conn.execute("SELECT * FROM data WHERE id = ?", [id]);
            return rows[0];
        } finally {
            conn.release();
        }
    }

    async readOneRecord({ id }) {
        const conn = await this.getConnection();
        try {
            const [rows] = await conn.execute("SELECT * FROM interviewRecords WHERE id = ?", [id]);
            return rows[0];
        } finally {
            conn.release();
        }
    }

    // async deleteAll() {
    //     const conn = await this.getConnection();
    //     try {
    //         const [rows] = await conn.execute("DELETE FROM data");
    //         return rows;
    //     } finally {
    //         conn.release();
    //     }
    // }

    // Other functions (for example, performance tests) can be added similarly...
}

// Export a singleton instance of the class
module.exports = new SingleStoreDB();