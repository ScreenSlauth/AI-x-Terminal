// logger.js
const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, 'logs');

// Ensure the logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFilePath = path.join(logDir, 'agent-log.txt');

/**
 * Logs interaction between the agent and the user.
 * @param {string} prompt - The user's input.
 * @param {string} response - The agent's response.
 */
function logInteraction(prompt, response) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] User: ${prompt}\nResponse: ${response}\n\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

/**
 * Logs errors.
 * @param {string} errorMessage - The error message to log.
 */
function logError(errorMessage) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${errorMessage}\n\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

module.exports = { logInteraction, logError };
