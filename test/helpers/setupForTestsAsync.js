const setupForTests = require('./setupForTests');

async function setupForTestsAsync(testOptions = {}) {
  const { pool, ...rest } = setupForTests(testOptions);
  if (testOptions.shouldAutoStart !== false) await pool.start();
  return { pool, ...rest };
}

module.exports = setupForTestsAsync;
