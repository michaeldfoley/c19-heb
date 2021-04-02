const UserAgent = require('user-agents')

/**
 * Resolves the returned promise after the set amount of ms. This should be used with
 * async-await to take advantage of the waiting.
 * @param {number} ms The time in ms to sleep.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

/**
 * Generates a random user agent string.
 * @returns {string}
 */
const genUserAgent = () => {
  const userAgent = new UserAgent()
  return userAgent.toString()
}

/** no-op function */
const noop = () => { }

module.exports = {
  sleep,
  genUserAgent,
  noop,
}
