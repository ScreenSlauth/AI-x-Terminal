const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const say = require('say');
const { loadPlugins } = require('./plugin-loader');

// Tool definitions
const tools = {
  // Basic tools
  getTime: () => new Date().toISOString(),
  
  echo: (msg) => {
    if (typeof msg !== 'string' && typeof msg !== 'number') {
      return 'Error: Echo requires a string or number argument';
    }
    return String(msg);
  },
  
  add: (a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    
    if (isNaN(numA) || isNaN(numB)) {
      return 'Error: Add requires numeric arguments';
    }
    
    return numA + numB;
  },
  
  // Speech tool
  speak: (text, speed = 1.0, voice = null) => {
    if (typeof text !== 'string' || text.trim() === '') {
      return 'Error: Speak requires non-empty text';
    }
    
    // Validate speed
    const validSpeed = Number(speed);
    if (isNaN(validSpeed) || validSpeed < 0.5 || validSpeed > 2.0) {
      return 'Error: Speed must be between 0.5 and 2.0';
    }
    
    // Handle voice selection for Windows
    let selectedVoice = voice;
    if (!selectedVoice && process.platform === 'win32') {
      // Use default Windows voice
      selectedVoice = 'Microsoft David Desktop';
    }
    
    try {
      // Speak the text (non-blocking)
      say.speak(text, selectedVoice, validSpeed);
      
      return `Speaking: "${text.length > 50 ? text.substring(0, 50) + '...' : text}" (${selectedVoice || 'default voice'}, speed: ${validSpeed})`;
    } catch (error) {
      console.error('Speech error:', error);
      // If specific voice fails, try with system default
      try {
        say.speak(text, null, validSpeed);
        return `Speaking with default voice: "${text.length > 50 ? text.substring(0, 50) + '...' : text}" (speed: ${validSpeed})`;
      } catch (fallbackError) {
        return `Error speaking text: ${error.message}. Fallback also failed.`;
      }
    }
  },
  
  // Get available voices
  getVoices: () => {
    return new Promise((resolve) => {
      // Windows-specific approach
      if (process.platform === 'win32') {
        // Windows typically has these default voices
        const defaultVoices = ['Microsoft David Desktop', 'Microsoft Zira Desktop'];
        resolve('Available voices on Windows: ' + defaultVoices.join(', ') + 
                '\n\nTo use a voice, try: { "tool": "speak", "args": ["Hello world", 1.0, "Microsoft David Desktop"] }');
        return;
      }
      
      // For other platforms, use the say library's method
      say.getInstalledVoices((err, voices) => {
        if (err) {
          resolve('Error getting voices: ' + err.message + 
                 '\n\nTry using voice null (default): { "tool": "speak", "args": ["Hello world", 1.0, null] }');
          return;
        }
        
        if (!voices || voices.length === 0) {
          resolve('No voices detected. Try using the default voice: { "tool": "speak", "args": ["Hello world"] }');
          return;
        }
        
        resolve('Available voices: ' + voices.join(', ') + 
                '\n\nTo use a voice, try: { "tool": "speak", "args": ["Hello world", 1.0, "' + voices[0] + '"] }');
      });
    });
  },
  
  // Math operations
  calculate: (expression) => {
    if (typeof expression !== 'string') {
      return 'Error: Expression must be a string';
    }
    
    // Sanitize the expression to allow only safe math operations
    // Remove anything that's not a number, operator, or parenthesis
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
    
    try {
      // Using Function constructor with sanitized input is still safer than eval
      const result = new Function(`return ${sanitized}`)();
      return result;
    } catch (error) {
      return `Error calculating expression: ${error.message}`;
    }
  },
  
  // String manipulation
  reverse: (text) => {
    if (typeof text !== 'string') {
      return 'Error: Text must be a string';
    }
    return text.split('').reverse().join('');
  },
  
  countWords: (text) => {
    if (typeof text !== 'string') {
      return 'Error: Text must be a string';
    }
    return text.trim().split(/\s+/).length;
  },
  
  // Date formatting
  formatDate: (format = 'full') => {
    const date = new Date();
    
    const formats = {
      full: date.toLocaleString(),
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      iso: date.toISOString(),
      unix: Math.floor(date.getTime() / 1000)
    };
    
    if (!formats[format]) {
      return `Error: Unknown format '${format}'. Available formats: ${Object.keys(formats).join(', ')}`;
    }
    
    return formats[format];
  },
  
  // File operations
  readTextFile: (filePath) => {
    try {
      // Prevent path traversal attacks by restricting to current directory
      const safePath = path.resolve(process.cwd(), filePath);
      if (!safePath.startsWith(process.cwd())) {
        return 'Error: Cannot access files outside current directory';
      }
      
      if (!fs.existsSync(safePath)) {
        return `Error: File '${filePath}' not found`;
      }
      
      const content = fs.readFileSync(safePath, 'utf8');
      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
  
  writeTextFile: (filePath, content) => {
    try {
      // Prevent path traversal attacks by restricting to current directory
      const safePath = path.resolve(process.cwd(), filePath);
      if (!safePath.startsWith(process.cwd())) {
        return 'Error: Cannot write files outside current directory';
      }
      
      fs.writeFileSync(safePath, content, 'utf8');
      return `File '${filePath}' written successfully`;
    } catch (error) {
      return `Error writing file: ${error.message}`;
    }
  },
  
  // HTTP request
  fetchURL: async (url) => {
    try {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return 'Error: URL must be a valid HTTP/HTTPS URL';
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        return `Error: HTTP request failed with status ${response.status}`;
      }
      
      const text = await response.text();
      // Limit response size to avoid huge outputs
      const maxLength = 1000;
      return text.length > maxLength 
        ? `${text.substring(0, maxLength)}... (truncated, total length: ${text.length})` 
        : text;
    } catch (error) {
      return `Error fetching URL: ${error.message}`;
    }
  },
  
  // Web search using reliable free APIs
  webSearch: async (query, limit = 5) => {
    if (typeof query !== 'string' || query.trim() === '') {
      return 'Error: Search query must be a non-empty string';
    }
    
    // Ensure limit is a reasonable number
    const resultLimit = Math.min(Math.max(1, Number(limit) || 5), 10);
    
    try {
      // Use a reliable free news API for news searches
      if (query.toLowerCase().includes('news') || 
          query.toLowerCase().includes('latest') || 
          query.toLowerCase().includes('current events')) {
        
        // Get news from a public news API
        const newsUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&api-key=demo`;
        
        const response = await fetch(newsUrl);
        
        if (response.ok) {
          const data = await response.json();
          const articles = data?.response?.docs || [];
          
          if (articles.length > 0) {
            let results = `News Search Results for: "${query}"\n\n`;
            
            articles.slice(0, resultLimit).forEach((article, index) => {
              results += `${index + 1}. ${article.headline?.main || 'News article'}\n`;
              results += `   ${article.abstract || article.snippet || article.lead_paragraph || ''}\n`;
              results += `   Published: ${article.pub_date ? new Date(article.pub_date).toDateString() : 'Unknown date'}\n`;
              results += `   URL: ${article.web_url || ''}\n\n`;
            });
            
            return results;
          }
        }
      }
      
      // Use Wikipedia API as a reliable fallback for general knowledge
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&utf8=1&srsearch=${encodeURIComponent(query)}&srlimit=${resultLimit}&origin=*`;
      
      const wikiResponse = await fetch(wikiUrl);
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        const searchResults = wikiData?.query?.search || [];
        
        if (searchResults.length > 0) {
          let results = `Search Results for: "${query}"\n\n`;
          
          searchResults.forEach((result, index) => {
            // Remove HTML tags from snippets
            const snippet = result.snippet.replace(/<\/?[^>]+(>|$)/g, "");
            
            results += `${index + 1}. ${result.title}\n`;
            results += `   ${snippet}\n`;
            results += `   URL: https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}\n\n`;
          });
          
          return results;
        }
      }
      
      // If no results found from both sources
      return `No search results found for query: "${query}"\n\nTry a different search query or be more specific.`;
    } catch (error) {
      return `Error performing web search: ${error.message}\n\nTry a different search query or use fetchURL to directly access websites.`;
    }
  }
};

loadPlugins();

// Function to dynamically add tools
function addTool(name, fn) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Tool name must be a non-empty string');
  }
  
  if (typeof fn !== 'function') {
    throw new Error('Tool function must be a valid function');
  }
  
  if (tools[name]) {
    return `Tool '${name}' already exists.`;
  }
  
  tools[name] = fn;  // Register the custom tool
  return `Successfully added tool: ${name}`;
}

// Function to call a tool dynamically
function callTool(name, args) {
  if (!tools[name]) {
    throw new Error(`Tool '${name}' not found`);
  }
  
  if (!Array.isArray(args)) {
    throw new Error('Tool arguments must be an array');
  }
  
  try {
    return tools[name](...args);  // Execute the tool
  } catch (error) {
    throw new Error(`Error executing tool '${name}': ${error.message}`);
  }
}

module.exports = { tools, addTool, callTool };