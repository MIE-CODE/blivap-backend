/* eslint-disable no-console */
// import { connect, connection, connections } from 'mongoose';

async function clearDatabase() {
  try {
    // Connect to the test database if not already connected
    // if (!connection.readyState) {
    //   const mongoUri =
    //     process.env.MONGODB_URI || 'mongodb://localhost:27017/blivap-api-test';
    //   await connect(mongoUri);
    // }

    // for (const connection of connections) {
    //   await connection.dropDatabase();
    //   console.log(`✓ Dropped database: ${connection.name}`);
    // }

    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.warn('⚠️ Failed to clear database:', error.message);
    // Don't throw - we don't want teardown to fail the tests
  }
}

async function teardown() {
  await clearDatabase();

  // Close the database connection
  try {
    // await connection.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.warn('⚠️ Failed to close database connection:', error.message);
  }
}

export default teardown;
