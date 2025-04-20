const { API_URL, API_KEY, MODEL } = require('./config');
const fetch = require('node-fetch');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const say = require('say');
// const cron = require('node-cron');
// const blessed = require('blessed');
// const Fuse = require('fuse.js');
const { logInteraction, logError } = require('./logger');
const { callTool, addTool, tools } = require('./tools');

// Path to the memory file
const MEMORY_FILE = path.join(__dirname, 'memory.json');

// Load memory from the file (if it exists)
let memory = {
  interactions: []
};

// Try to read the memory file if it exists
try {
  if (fs.existsSync(MEMORY_FILE)) {
    const rawData = fs.readFileSync(MEMORY_FILE);
    memory = JSON.parse(rawData);
  }
} catch (error) {
  console.log("Error reading memory file. Starting fresh.");
  logError(`Memory file error: ${error.message}`);
}

// Speech settings
let speechSettings = {
  enabled: false,          // Whether speech is enabled
  outputMode: 'both',      // 'voice', 'text', or 'both'
  voice: null,             // Default system voice
  speed: 1.0               // Speech rate (1.0 = normal)
};

let currentModel = MODEL; // Start with the default model

// Available models for Groq API
const AVAILABLE_MODELS = [
  'llama3-70b-8192',
  'llama3-8b-8192',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'gemma2-9b-it',
  'compound-beta',
  'compound-beta-mini',
  'mistral-saba-24b',
  'qwen-qwq-32b'
];

const SYSTEM_PROMPT = `You are a helpful CLI assistant. 
You have access to the following tools:
${Object.keys(tools).map(tool => `- ${tool}`).join('\n')}

To use a tool, respond in this JSON format:
{ "tool": "toolName", "args": [arg1, arg2, ...] }

Otherwise, respond with a helpful text answer.`;

// Function to speak text
function speakText(text) {
  if (!speechSettings.enabled) return;
  
  // Clean up text for speech - remove URLs, code blocks, etc.
  const cleanText = text
    .replace(/https?:\/\/[^\s]+/g, 'URL omitted') // Replace URLs
    .replace(/\[\s\S]*?\n/g, 'Code block omitted') // Remove code blocks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
    .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove markdown links
  
  return new Promise((resolve) => {
    say.speak(cleanText, speechSettings.voice, speechSettings.speed, (err) => {
      if (err) {
        console.error('Speech error:', err);
      }
      resolve();
    });
  });
}

// Function to output response based on settings
async function outputResponse(text) {
  // Always log the interaction regardless of output mode
  logInteraction('agent output', text);
  
  if (speechSettings.outputMode === 'text' || speechSettings.outputMode === 'both') {
    console.log(`\n🤖 Response:\n${text}`);
  }
  
  if ((speechSettings.outputMode === 'voice' || speechSettings.outputMode === 'both') && speechSettings.enabled) {
    if (speechSettings.outputMode === 'voice') {
      console.log(`\n🔊 Speaking response (voice only)...`);
    } else {
      console.log(`\n🔊 Speaking response...`);
    }
    await speakText(text);
  }
}

async function callAgent(prompt) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result?.error?.message || 'Unknown API error occurred');

    const replyText = result?.choices?.[0]?.message?.content || '[No content returned]';

    // Log the interaction in memory
    memory.interactions.push({ prompt, response: replyText });
    saveMemory();

    // Try to parse for tool call
    let toolCall = null;
    try {
      // Check if the response looks like JSON
      if (replyText.trim().startsWith('{') && replyText.trim().endsWith('}')) {
        const parsed = JSON.parse(replyText);
        if (parsed.tool && Array.isArray(parsed.args)) toolCall = parsed;
      }
    } catch (error) {
      // Not a tool call - just continue with text response
    }

    if (toolCall) {
      try {
        const result = await Promise.resolve(callTool(toolCall.tool, toolCall.args));
        console.log(`🔧 Tool [${toolCall.tool}] executed with result:`, result);
        logInteraction(prompt, `Tool used: ${toolCall.tool}, Result: ${result}`);
        
        // Speak tool results if speech is enabled
        if (speechSettings.enabled && 
            (speechSettings.outputMode === 'voice' || speechSettings.outputMode === 'both')) {
          await speakText(`Tool ${toolCall.tool} executed. The result is: ${result}`);
        }
      } catch (error) {
        console.error(`❌ Tool execution error: ${error.message}`);
        logError(`Tool execution error: ${error.message}`);
      }
    } else {
      // Output the response according to user settings
      await outputResponse(replyText);
    }
  } catch (error) {
    console.error(`❌ Agent Error: ${error.message}`);
    logError(error.message);
  }
}

// Save the memory to the file
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
  } catch (error) {
    console.error("❌ Error saving memory:", error.message);
    logError(`Memory save error: ${error.message}`);
  }
}

// Start interactive chat session
function startChatSession() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  console.log(`💬 Interactive AI Agent. Type 'exit' to quit.\n`);
  console.log(`Available commands:
  - exit: Quit the application
  - setModel <model>: Change the AI model
  - listTools: Show available tools
  - listModels: Show available AI models
  - help: Show this help
  - voice on/off: Enable/disable voice output
  - voice male: Use male voice (Windows)
  - voice female: Use female voice (Windows)
  - voice use <name>: Use specific voice
  - voice mode <text|voice|both>: Set output mode
  - voice speed <0.5-2.0>: Set voice speed
  - voice info: Show current voice settings\n`);
  
  rl.setPrompt('🧠 > ');
  rl.prompt();
  
  rl.on('line', async (line) => {
    const prompt = line.trim();
    if (!prompt) return rl.prompt();
    
    // First check for special commands
    const lowerPrompt = prompt.toLowerCase();
    
    // Handle exit command
    if (lowerPrompt === 'exit') {
      rl.close();
      return;
    }
    
    // Handle setModel command
    if (lowerPrompt === 'setmodel' || lowerPrompt.startsWith('setmodel ')) {
      const parts = prompt.split(' ');
      // We need at least one argument after "setModel"
      if (parts.length < 2 || !parts[1]) {
        console.log("⚠️ Please provide a model name. Usage: setModel llama3-8b-8192");
        console.log("Use 'listModels' to see available models.");
      } else {
        const requestedModel = parts[1];
        if (AVAILABLE_MODELS.includes(requestedModel)) {
          currentModel = requestedModel;
          console.log(`✅ Model switched to: ${currentModel}`);
        } else {
          console.log(`❌ Model '${requestedModel}' is not available.`);
          console.log(`Available models: ${AVAILABLE_MODELS.join(', ')}`);
        }
      }
      return rl.prompt();
    }
    
    // Handle listTools command
    if (lowerPrompt === 'listtools') {
      console.log("🧰 Available tools:");
      Object.keys(tools).forEach(tool => {
        console.log(`- ${tool}`);
      });
      return rl.prompt();
    }
    
    // Handle listModels command
    if (lowerPrompt === 'listmodels') {
      console.log("🤖 Available models:");
      AVAILABLE_MODELS.forEach(model => {
        const isCurrent = model === currentModel ? '(current)' : '';
        console.log(`- ${model} ${isCurrent}`);
      });
      return rl.prompt();
    }
    
    // Handle help command
    if (lowerPrompt === 'help') {
      console.log(`Available commands:
  - exit: Quit the application
  - setModel <model>: Change the AI model
  - listTools: Show available tools
  - listModels: Show available AI models
  - voice on/off: Enable/disable voice output
  - voice male: Use male voice (Windows)
  - voice female: Use female voice (Windows)
  - voice use <name>: Use specific voice
  - voice mode <text|voice|both>: Set output mode
  - voice speed <0.5-2.0>: Set voice speed
  - voice info: Show current voice settings
  - help: Show this help`);
      return rl.prompt();  
    }
    
    // Handle voice commands
    if (lowerPrompt === 'voice on') {
      speechSettings.enabled = true;
      console.log("🔊 Voice output enabled");
      return rl.prompt();
    }
    
    if (lowerPrompt === 'voice off') {
      speechSettings.enabled = false;
      console.log("🔇 Voice output disabled");
      return rl.prompt();
    }
    
    // Quick voice selection for Windows users
    if (lowerPrompt === 'voice male') {
      speechSettings.enabled = true;
      speechSettings.voice = 'Microsoft David Desktop';
      console.log("🔊 Voice set to male (Microsoft David Desktop) and enabled");
      return rl.prompt();
    }
    
    if (lowerPrompt === 'voice female') {
      speechSettings.enabled = true;
      speechSettings.voice = 'Microsoft Zira Desktop';
      console.log("🔊 Voice set to female (Microsoft Zira Desktop) and enabled");
      return rl.prompt();
    }
    
    if (lowerPrompt.startsWith('voice use ')) {
      const voiceName = prompt.substring('voice use '.length).trim();
      if (voiceName) {
        speechSettings.enabled = true;
        speechSettings.voice = voiceName;
        console.log(`🔊 Voice set to "${voiceName}" and enabled`);
      } else {
        console.log("⚠️ Please provide a voice name. Example: voice use Microsoft David Desktop");
      }
      return rl.prompt();
    }
    
    if (lowerPrompt.startsWith('voice mode ')) {
      const mode = lowerPrompt.split(' ')[2]?.trim();
      if (['text', 'voice', 'both'].includes(mode)) {
        speechSettings.outputMode = mode;
        console.log(`✅ Output mode set to: ${mode}`);
      } else {
        console.log("⚠️ Invalid mode. Use 'text', 'voice', or 'both'");
      }
      return rl.prompt();
    }
    
    if (lowerPrompt.startsWith('voice speed ')) {
      const speed = parseFloat(lowerPrompt.split(' ')[2]);
      if (!isNaN(speed) && speed >= 0.5 && speed <= 2.0) {
        speechSettings.speed = speed;
        console.log(`✅ Voice speed set to: ${speed}`);
      } else {
        console.log("⚠️ Invalid speed. Use a value between 0.5 and 2.0");
      }
      return rl.prompt();
    }
    
    if (lowerPrompt === 'voice info') {
      console.log("🔊 Voice settings:");
      console.log(`- Enabled: ${speechSettings.enabled ? 'Yes' : 'No'}`);
      console.log(`- Output mode: ${speechSettings.outputMode}`);
      console.log(`- Speed: ${speechSettings.speed}`);
      console.log(`- Voice: ${speechSettings.voice || 'System default'}`);
      return rl.prompt();
    }
    
    // If we get here, it's not a special command, so process normally
    try {
      await callAgent(prompt);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      logError(error.message);
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log("👋 Chat session ended.");
    process.exit(0);
  });
}

// Create dummy plugin-loader
try {
  // Try to require the plugin-loader
  const plugins = require('./plugin-loader');
} catch (error) {
  // Plugin loader is missing, ignore it
  console.log("Plugin loader not found. Continuing without plugins.");
}

// Start the chat session
startChatSession();