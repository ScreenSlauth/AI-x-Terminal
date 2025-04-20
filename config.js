// config.js
require('dotenv').config();

function getEnvVar(key, defaultValue = null) {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== null) {
      console.warn(`⚠️ Using default value for ${key}`);
      return defaultValue;
    }
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

// Required environment variables
const API_URL = getEnvVar('GROQ_API_URL');
const API_KEY = getEnvVar('GROQ_API_KEY');
const MODEL = getEnvVar('GROQ_MODEL', 'llama3-70b-8192');

// Validation
if (!API_URL.startsWith('http')) {
  console.error('❌ API_URL must be a valid URL');
  process.exit(1);
}

if (API_KEY.length < 10) {
  console.error('❌ API_KEY appears to be invalid');
  process.exit(1);
}

module.exports = { API_URL, API_KEY, MODEL };
