/**
 * Occurs when a request for a pooled object times out
 * @extends {Error}
 */
class TimeoutError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, TimeoutError);
    this.name = 'TimeoutError';
  }
}

module.exports = TimeoutError;
