import { resolve } from 'path';

import { config } from 'dotenv';

// Load the test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// mock sendgrid so no emails are sent
jest.mock('@sendgrid/mail');

// mock firebase-admin so no real Firebase initialization happens
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn().mockReturnValue({
    messaging: jest.fn().mockReturnValue({
      send: jest.fn().mockResolvedValue({ success: true }),
      sendEach: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      }),
    }),
  }),
  credential: {
    cert: jest.fn().mockReturnValue({}),
  },
  app: {
    name: 'app',
  },
}));
