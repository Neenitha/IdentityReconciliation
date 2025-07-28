/** Database Configurations **/

const { Pool } = require('pg');
const config = require('../config/config');

// To connect to local db
const pool = new Pool({
  connectionString: config.POSTGRES_URL
});


pool.on('connect', () => {
  console.log('Connection to db successfull!');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
