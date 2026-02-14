<div align="center">

# 🎭 Real-Time AI Conversation - Story Friend

A delightful real-time voice conversation application where an AI storyteller engages children in magical, interactive discussions based on displayed images.

## ✨ Features

- **Real-Time Voice Interaction**: Bi-directional audio conversation using Google's Gemini 2.5 Flash with native audio capabilities
- **1-Minute Engaging Sessions**: Perfect-length conversations designed for children's attention spans
- **Dynamic Atmospheres**: AI-triggered visual theme changes (sunny, night, party, underwater)
- **Audio Visualization**: Beautiful animated audio bars showing speaker status
- **Child-Friendly Interface**: Colorful, engaging UI with playful typography and animations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Tool Integration**: Demonstrates AI tool calling for UI modifications

## 🚀 Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **AI Engine**: Google Genai SDK (Gemini 2.5 Flash Native Audio Preview)
- **Styling**: Tailwind CSS
- **Audio Processing**: Web Audio API

## 📋 Prerequisites

- Node.js (v16 or higher)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

## 🎯 Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get your API Key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key for the Gemini API
   - Copy your API key

3. **Configure Environment:**
   - Open `.env.local` file in the project root
   - Replace `YOUR_API_KEY_HERE` with your actual Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   - The app will be available at `http://localhost:3000`

5. **Build for production:**
   ```bash
   npm run build
   ```

## 🎮 How to Use

1. **Start the conversation**: Click the "Say Hello! 👋" button to begin
2. **Grant permissions**: Allow microphone access when prompted
3. **Interact naturally**: Speak naturally with the AI storyteller - it will respond with voice
4. **Explore magic**: Try saying things like "Can you do a magic trick?" to trigger atmosphere changes
5. **Watch the timer**: The conversation runs for 60 seconds
6. **End anytime**: Click "Bye Bye! 👋" to end the conversation

## 🌈 Atmosphere Themes

The AI can trigger visual atmosphere changes through tool calls:
- **Sunny**: Bright yellow background with floating sun
- **Night**: Dark indigo theme with moon
- **Party**: Pink background with animated balloons and confetti
- **Underwater**: Cyan theme with floating bubbles

## 🛠️ Project Structure

```
├── App.tsx                 # Main application component
├── index.tsx              # React entry point
├── index.html             # HTML template
├── audioUtils.ts          # Audio encoding/decoding utilities
├── types.ts               # TypeScript type definitions
├── components/
│   └── Visualizer.tsx     # Audio visualization component
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── .env.local             # Environment variables (API key)
```

## 🔧 Key Components

### App.tsx
- Manages the overall application state
- Handles Gemini real-time audio session
- Processes tool calls for atmosphere changes
- Manages microphone input and audio output
- Implements 60-second timer

### Visualizer.tsx
- Real-time audio visualization
- Shows listening/speaking state
- Animated bars that respond to audio activity

### audioUtils.ts
- Base64 encoding/decoding for audio data
- PCM audio format conversion
- Web Audio API buffer creation

## 🎯 How It Works

1. **Session Initialization**: User clicks "Say Hello!" which requests microphone permission
2. **Audio Streaming**: Microphone input is continuously encoded and sent to Gemini
3. **Real-Time Response**: Gemini responds with audio that's decoded and played back
4. **Tool Handling**: AI can call `setAtmosphere` tool to change the visual theme
5. **Session Management**: Conversation auto-stops after 60 seconds or when user clicks "Bye Bye!"

## 💡 Design Highlights

- **Engaging UI**: Bright colors, playful animations, and child-friendly copy
- **Smooth Audio**: Continuous audio streaming with proper buffering
- **Visual Feedback**: Real-time indicators for connection status and speaker status
- **Error Handling**: User-friendly error messages
- **Responsive Layout**: Adapts to different screen sizes

## 📝 System Prompt

The AI is instructed to:
- Act as a friendly, magical storyteller
- Focus on engaging children (5-year-old level)
- Ask engaging questions about displayed images
- Keep responses short and warm
- Proactively respond to "magic" keywords for theme changes
- Support natural, conversational dialogue

## 🐛 Troubleshooting

**Blank Screen**: Make sure `index.html` has the correct script tag referencing `index.tsx`

**No Sound**: 
- Check microphone permissions
- Verify speakers are working
- Check browser console for errors

**API Key Error**: 
- Verify you've set `GEMINI_API_KEY` in `.env.local`
- Check the API key is valid and enabled
- Restart the dev server after updating `.env.local`

**Connection Issues**: 
- Check your internet connection
- Verify the API key has quota remaining
- Try refreshing the page

## 📄 License

MIT

---

**Powered by Gemini Real-Time Voice** ✨
