# Implementation Guide - Real-Time AI Conversation

## Project Overview

This is a real-time AI conversation application built with React and TypeScript that uses Google's Gemini 2.5 Flash model to have engaging 1-minute voice conversations with children based on displayed images.

## Architecture Overview

### Core Flow
```
User Interface
      ↓
[Microphone Input] → Audio Processing → Gemini API
                                           ↓
                                    [AI Response]
                                           ↓
                                    Audio Decoding → Speaker Output
                                           ↓
                                    [Tool Calls]
                                           ↓
                                    UI Updates (Atmosphere)
```

## Key Implementation Details

### 1. Real-Time Audio Session (App.tsx)

**Audio Context Setup**:
- Two separate AudioContext instances:
  - `audioContextRef`: 16kHz for microphone input
  - `outputAudioContextRef`: 24kHz for model output

**Microphone Input Processing**:
```typescript
const scriptProcessor = audioContextRef!.createScriptProcessor(4096, 1, 1);
scriptProcessor.onaudioprocess = (e) => {
  const inputData = e.inputBuffer.getChannelData(0);
  // Convert float32 to int16
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = inputData[i] * 32768;
  }
  // Encode and send to API
};
```

**Audio Output Processing**:
- Decode base64 audio from API
- Convert to AudioBuffer with proper sample rate
- Schedule playback with precise timing
- Track audio sources to avoid overlapping

### 2. Tool Implementation

**Tool Definition in System Prompt**:
```typescript
tools: [{
  functionDeclarations: [{
    name: 'setAtmosphere',
    description: 'Changes the visual atmosphere of the screen.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        theme: {
          type: Type.STRING,
          description: 'The theme name: sunny, night, party, or underwater.'
        }
      },
      required: ['theme']
    }
  }]
}]
```

**Tool Call Handler**:
```typescript
if (message.toolCall) {
  for (const fc of message.toolCall.functionCalls) {
    if (fc.name === 'setAtmosphere') {
      const result = applyAtmosphere(fc.args.theme as string);
      sessionPromise.then(s => s.sendToolResponse({
        functionResponses: { id: fc.id, name: fc.name, response: { result } }
      }));
    }
  }
}
```

### 3. Session Management

**State Machine**:
- `IDLE`: Initial state, waiting for user to click "Say Hello!"
- `CONNECTING`: Connecting to Gemini API, requesting microphone
- `ACTIVE`: Real-time conversation in progress
- `ERROR`: Error occurred during session
- `FINISHED`: Conversation ended (timeout or user click)

**Timer Management**:
```typescript
useEffect(() => {
  if (status === SessionStatus.ACTIVE && timeLeft > 0) {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopConversation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
}, [status, timeLeft, stopConversation]);
```

### 4. Audio Utilities (audioUtils.ts)

**Base64 Encoding**:
```typescript
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

**Audio Buffer Decoding**:
```typescript
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
```

### 5. Audio Visualization (Visualizer.tsx)

**Canvas-Based Animation**:
- 20 animated bars
- Bar height varies based on `isModelSpeaking` state
- Smooth animation using `requestAnimationFrame`
- Changes color from blue (listening) to purple (speaking)

```typescript
const magnitude = isModelSpeaking 
  ? Math.sin(offset + i * 0.5) * 20 + 25
  : Math.sin(offset + i * 0.2) * 5 + 10;
```

### 6. UI/UX Design

**Atmosphere Effects**:
- **Sunny**: Yellow background + floating sun emoji
- **Night**: Dark indigo + dimmed content + moon emoji
- **Party**: Pink background + animated balloons + confetti effect
- **Underwater**: Cyan theme + floating bubble animation

**Responsive Layout**:
- Header with status indicator and timer
- Two-column layout: Image (left) + Controls (right)
- Mobile-friendly stacked layout
- Smooth transitions between states

### 7. Error Handling

**API Key Validation**:
```typescript
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
  setError("Please set your Gemini API key in .env.local file");
  setStatus(SessionStatus.ERROR);
  return;
}
```

**Graceful Error States**:
- Clear error messages for users
- Connection error handling
- Microphone permission errors
- API quota/limit errors

## Configuration

### Environment Variables (vite.config.ts)
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

### System Instruction
The AI is instructed to:
- Be a friendly, magical storyteller
- Target 5-year-old comprehension level
- Ask engaging questions about displayed images
- Keep responses short and warm
- Respond to "magic" keywords for tool calls
- Support natural conversation flow

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with webkit prefix for AudioContext)
- Requires:
  - Web Audio API support
  - getUserMedia support
  - Canvas support for visualization

## Performance Optimizations

1. **Audio Buffering**: Prevents buffer underruns with proper timing
2. **Lazy Component Loading**: React suspense for code splitting
3. **Animation Optimization**: Canvas instead of DOM for visualization
4. **Memory Management**: Proper cleanup of audio sources and intervals

## Testing Considerations

**Manual Testing Checklist**:
- [ ] Microphone permission prompt appears
- [ ] Audio from AI is heard
- [ ] User audio is being transmitted
- [ ] Visualizer animates properly
- [ ] Atmosphere changes trigger when AI says "magic"
- [ ] Timer counts down correctly
- [ ] Session stops after 60 seconds
- [ ] Stop button works
- [ ] Error states display correctly

## Deployment

**Build**:
```bash
npm run build
```

**Deployment Platforms**:
- Vercel (recommended for Vite)
- Netlify
- GitHub Pages
- Any static host

**Important**: Ensure API key is set via environment variables on deployment platform, not in code.

## Future Enhancements

1. Multiple image selection
2. Conversation history/transcripts
3. Multi-language support
4. Volume control
5. Recording/playback of conversations
6. More tool actions
7. Customizable age/conversation topics
