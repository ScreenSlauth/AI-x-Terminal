# CLI AI Agent

A command-line interface (CLI) agent that uses Groq's API to interact with AI models and provides various tools for enhanced functionality.

## Features

- Interactive AI chat with multiple language models
- Text-to-speech functionality (with adjustable settings)
- File operations (read/write)
- Web search capabilities
- Math and string manipulation tools
- Date formatting
- HTTP request handling

## Setup

1. Install dependencies:
   ```
   npm install dotenv node-fetch say
   ```

2. Create a `.env` file with the following variables:
   ```
   GROQ_API_KEY=your_groq_api_key
   GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
   GROQ_MODEL=llama3-70b-8192
   ```

3. Make sure you have the following files:
   - `agent.js` - Main interface
   - `tools.js` - Tool definitions
   - `config.js` - Configuration
   - `logger.js` - Logging utility
   - `plugin-loader.js` - Plugin system

## Usage

Run the agent:
```
node agent.js
```

### Available Commands

- `exit`: Quit the application
- `setModel <model>`: Change the AI model (e.g., `setModel llama3-8b-8192`)
- `listTools`: Show available tools
- `listModels`: Show available AI models
- `voice on/off`: Enable or disable voice output
- `voice male`: Use male voice (Windows)
- `voice female`: Use female voice (Windows)
- `voice use <name>`: Use specific voice
- `voice mode <text|voice|both>`: Set output mode
- `voice speed <0.5-2.0>`: Set voice speed
- `voice info`: Show current voice settings
- `help`: Show help

### Available Tools

#### Basic Tools
- `getTime`: Returns the current time
- `echo`: Repeats a message
- `add`: Adds two numbers

#### Math Operations
- `calculate`: Evaluates a mathematical expression (e.g., `"2 * (3 + 4)"`)

#### String Manipulation
- `reverse`: Reverses a string
- `countWords`: Counts the number of words in a text

#### Date Formatting
- `formatDate`: Formats the current date (formats: full, date, time, iso, unix)

#### File Operations
- `readTextFile`: Reads content from a text file
- `writeTextFile`: Writes content to a text file

#### Web Requests
- `fetchURL`: Fetches content from a URL

#### Web Search
- `webSearch`: Searches the web using reliable free APIs (NYT for news, Wikipedia for general knowledge)

#### Speech
- `speak`: Converts text to speech (usage: text, speed, voice)
- `getVoices`: Lists available system voices

### Using Tools

To use a tool, provide input in JSON format:
```
{ "tool": "toolName", "args": [arg1, arg2, ...] }
```

Examples:
```
{ "tool": "add", "args": [5, 3] }
{ "tool": "calculate", "args": ["2 * (3 + 4)"] }
{ "tool": "reverse", "args": ["hello world"] }
{ "tool": "formatDate", "args": ["iso"] }
{ "tool": "readTextFile", "args": ["example.txt"] }
{ "tool": "fetchURL", "args": ["https://example.com"] }
{ "tool": "webSearch", "args": ["nodejs tutorial", 5] }
{ "tool": "speak", "args": ["Hello world", 1.0, null] }
```

## Available Models

This agent supports various Groq models, including:
- `llama3-70b-8192`
- `llama3-8b-8192`
- `llama-3.1-8b-instant`
- `llama-3.3-70b-versatile`
- `gemma2-9b-it`
- `compound-beta`
- `compound-beta-mini`
- `mistral-saba-24b`
- `qwen-qwq-32b`

## Memory

The agent stores interaction history in a `memory.json` file to maintain context between sessions.
