// testConnection.js
// Test script to verify API connectivity before running the agent
const fetch = require('node-fetch');
require('dotenv').config();

console.log('Testing connection to Groq API...');
console.log('API URL:', process.env.GROQ_API_URL);
console.log('API Key (truncated):', process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 5)}...` : 'Not set');
console.log('Model:', process.env.GROQ_MODEL || 'Not set (will use default)');

(async () => {
  // Try to list models to test connection
  try {
    console.log('\nListing available models...');
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      }
    });

    const statusText = response.ok ? '✅ Connection successful!' : '❌ API returned an error';
    console.log(`Status: ${response.status} - ${statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\nAvailable models:');
      data.data.forEach(model => {
        console.log(`- ${model.id}`);
      });
    } else {
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
})(); 