# Pantry Pal - Recipe Assistant

A web application that helps you create recipes from ingredients in your pantry using AI.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Server

**Option 1: Using the batch file (Easiest for Windows)**
- Double-click `start-server.bat` in the project folder
- The server will start automatically

**Option 2: Using PowerShell script**
- Right-click `start-server.ps1` and select "Run with PowerShell"
- Or open PowerShell in the project folder and run: `.\start-server.ps1`

**Option 3: Using Command Prompt/Terminal**
```bash
npm start
```

Or directly with Node:
```bash
node server.js
```

**Option 4: If npm/node commands don't work**
1. Make sure Node.js is installed: Download from https://nodejs.org/
2. After installing, restart your terminal/command prompt
3. Try running `npm start` again

The server will start on **http://localhost:3000**

### Accessing the Website

1. **When the server is running:**
   - Open your browser and go to: `http://localhost:3000`
   - The website will be accessible as long as the server is running

2. **When the server is offline:**
   - The website will not be accessible
   - To turn the server back online, simply run `npm start` or `node server.js` again in your terminal
   - Then refresh your browser at `http://localhost:3000`

### Features

- **Recipe Generation**: Enter your ingredients and get AI-generated recipes
- **Chat Assistant**: Ask questions about cooking, ingredients, and recipes
- **Chat History**: Your chat conversations are automatically saved in your browser's localStorage and will persist even after closing the browser
- **Recipe Reviews**: See reviews and ratings for generated recipes
- **Budget Planning**: Add budget constraints to your recipe search

### Troubleshooting

**"npm is not recognized" or "node is not recognized" error?**
- Node.js is not installed or not in your system PATH
- **Solution 1**: Install Node.js from https://nodejs.org/ (download the LTS version)
  - After installation, restart your terminal/command prompt
  - Try `npm start` again
- **Solution 2**: Use the `start-server.bat` file (double-click it) - it will try to find Node.js automatically
- **Solution 3**: Use the `start-server.ps1` PowerShell script

**Server won't start?**
- Make sure Node.js is installed: Download from https://nodejs.org/
- Make sure you're in the project directory (the folder containing `server.js`)
- Check if port 3000 is already in use (close other applications using port 3000)
- Try using `start-server.bat` instead of `npm start`

**Chat history not saving?**
- Make sure your browser allows localStorage
- Check browser console for any errors (F12 → Console tab)
- Try clearing browser cache and reloading

**Can't access the website?**
- Make sure the server is running (you should see "🍳 Pantry Recipe App running at http://localhost:3000" in your terminal)
- Check that you're using the correct URL: `http://localhost:3000`
- Try restarting the server
- Make sure no firewall is blocking port 3000

### Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

