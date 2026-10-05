const { Sequelize } = require('sequelize');

// Parse the DATABASE_URL and handle Neon-specific SSL
const dbUrl = process.env.DATABASE_URL || '';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  pool: {
    max: 5,
    // Keep one connection warm at all times instead of dropping to zero
    // after 10s idle — the pantry endpoint is hit constantly by the mixer
    // page, and re-establishing a fresh TLS connection to Neon on every
    // "cold" request was adding real, avoidable latency to it.
    min: 1,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✓ PostgreSQL Connected (Neon)');

      // Add any missing tables/columns, but never drop one. With alter: true,
      // a server running older code deletes every column it doesn't know
      // about — and several deployments share this database.
      await sequelize.sync({ alter: { drop: false } });
      console.log('✓ Database tables synced');

      return sequelize;
    } catch (error) {
      console.error(`✗ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`  Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('✗ All database connection attempts failed.');
        if (process.env.NODE_ENV === 'production') {
          console.error('✗ FATAL: Database connection required in production');
          process.exit(1);
        }
      }
    }
  }
};

module.exports = { sequelize, connectDB };
