// databaseFunctions.js

// Assuming you have initialized and configured your database connection
const pool = require('./databaseFunctions');

// Function to fetch app details by ID from the database
async function fetchAppDetailsById(appId) {
    try {
        // Connect to the database
        const client = await pool.connect();

        // Query to fetch app details by ID
        const query = `
            SELECT * FROM apps WHERE id = $1;
        `;

        // Execute the query
        const result = await client.query(query, [appId]);

        // Release the client back to the pool
        client.release();

        // Check if app details were found
        if (result.rows.length === 0) {
            throw new Error('App not found.');
        }

        // Return the app details
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error fetching app details by ID: ${error.message}`);
    }
}

module.exports = { fetchAppDetailsById };
