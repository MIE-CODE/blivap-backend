import { resolve } from 'path';

import { config } from 'dotenv';

// Load the test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
