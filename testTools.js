// testTools.js - Test script for all available tools
const { tools, callTool } = require('./tools');

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  try {
    console.log('🧰 Testing CLI Agent Tools\n');
    await sleep(100);

    // Test basic tools
    console.log('--- Basic Tools ---');
    console.log('getTime:', callTool('getTime', []));
    console.log('echo:', callTool('echo', ['Hello, world!']));
    console.log('add:', callTool('add', [10, 20]));
    await sleep(100);

    // Test math operations
    console.log('\n--- Math Operations ---');
    console.log('calculate (2 * (3 + 4)):', callTool('calculate', ['2 * (3 + 4)']));
    await sleep(100);

    // Test string manipulation
    console.log('\n--- String Manipulation ---');
    console.log('reverse:', callTool('reverse', ['hello world']));
    console.log('countWords:', callTool('countWords', ['This is a test sentence with six words.']));
    await sleep(100);

    // Test date formatting
    console.log('\n--- Date Formatting ---');
    console.log('formatDate (default):', callTool('formatDate', []));
    console.log('formatDate (iso):', callTool('formatDate', ['iso']));
    console.log('formatDate (unix):', callTool('formatDate', ['unix']));
    await sleep(100);

    // Test file operations
    console.log('\n--- File Operations ---');
    // Create a test file
    const testFilePath = 'test-file.txt';
    const testContent = 'This is a test file created by testTools.js';
    console.log(`writeTextFile (${testFilePath}):`, callTool('writeTextFile', [testFilePath, testContent]));
    console.log(`readTextFile (${testFilePath}):`, callTool('readTextFile', [testFilePath]));
    await sleep(100);

    // Test web requests (async)
    console.log('\n--- Web Requests ---');
    try {
      console.log('fetchURL starting...');
      const result = await callTool('fetchURL', ['https://example.com']);
      console.log('fetchURL result (truncated):', 
        result.length > 100 ? result.substring(0, 100) + '...' : result);
    } catch (error) {
      console.error('fetchURL error:', error.message);
    }
    await sleep(100);
    
    // Test web search
    console.log('\n--- Web Search ---');
    try {
      console.log('webSearch starting...');
      const searchQuery = 'latest news';
      console.log(`Searching for: "${searchQuery}"`);
      const searchResults = await callTool('webSearch', [searchQuery, 3]);
      
      // Display a preview of the results
      const previewLines = searchResults.split('\n').slice(0, 10);
      console.log('Search results preview:');
      console.log(previewLines.join('\n') + (previewLines.length < searchResults.split('\n').length ? '\n...' : ''));
    } catch (error) {
      console.error('webSearch error:', error.message);
    }
    await sleep(100);
    
    // Test speech tools
    console.log('\n--- Speech Tools ---');
    try {
      console.log('Testing getVoices...');
      const voices = await callTool('getVoices', []);
      console.log(voices);
      
      console.log('\nTesting speak...');
      const speakResult = callTool('speak', ['This is a test of the text to speech functionality.', 1.0]);
      console.log(speakResult);
    } catch (error) {
      console.error('Speech tools error:', error.message);
    }
    await sleep(2000); // Wait for speech to complete

    console.log('\n✅ All tests completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run all tests
runTests(); 