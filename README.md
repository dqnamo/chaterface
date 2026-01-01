# 🎯 Chaterface

A privacy-first chat interface for AI conversations with end-to-end encryption and local-first storage.

## ✨ Features

- **🔒 Privacy First**: End-to-end encrypted cloud storage with zero-knowledge architecture
- **💾 Local-First**: Works offline with IndexedDB, sync when you want
- **🎨 Beautiful UI**: Modern, minimal interface built with Next.js and Tailwind CSS
- **🤖 Multi-Model**: Support for multiple AI models via OpenRouter
- **⚡ Real-time**: Instant synchronization across devices with InstantDB
- **🔑 Your Keys**: Client-side encryption - your data, your keys

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm, pnpm, or bun

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/dqnamo/chaterface.git
cd chaterface
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# Required: InstantDB App ID (get from https://instantdb.com/dash)
NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id

# Optional: Analytics (Userplex API key)
NEXT_PUBLIC_USERPLEX_API_KEY=your_userplex_key
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📦 One-Click Deployment

Deploy Chaterface to your favorite platform:

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dqnamo/chaterface&env=NEXT_PUBLIC_INSTANT_APP_ID&envDescription=InstantDB%20App%20ID%20required%20for%20cloud%20sync&envLink=https://instantdb.com/dash)

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/dqnamo/chaterface)

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/dqnamo/chaterface&envs=NEXT_PUBLIC_INSTANT_APP_ID)

### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dqnamo/chaterface)

**Note:** After deploying, you'll need to add your environment variables in your platform's dashboard.

## 🔐 Privacy & Security

Chaterface is built with privacy as the core principle:

### Zero-Knowledge Architecture

- **Client-Side Encryption**: All message content is encrypted on your device before being sent to the cloud
- **Your Keys, Your Data**: Encryption keys are generated and stored locally - we can't read your messages
- **Direct AI Calls**: Your prompts go directly to OpenRouter, not through our servers

### Local-First Design

- **Offline Support**: Works completely offline with IndexedDB storage
- **Optional Cloud Sync**: Choose to sync encrypted data across devices or keep everything local
- **No Account Required**: Use as a guest with local-only storage

## 📊 Analytics

We use [Userplex](https://userplex.com) for basic product analytics. Here's what we track:

- **Page views**: Which pages are visited (e.g., home, conversation view)
- **Feature usage**: When features like "new conversation" or "model selection" are used
- **General location**: Country and region (from Vercel edge headers)

**What we DON'T track:**

- ❌ Your conversation content (it's encrypted!)
- ❌ Your API keys
- ❌ Personal identifiable information
- ❌ IP addresses
- ❌ Detailed user behavior or keystrokes

Analytics can be disabled by not providing the `NEXT_PUBLIC_USERPLEX_API_KEY` environment variable.

## 🏗️ Architecture

Chaterface uses a **Union Architecture** that combines two data stores:

### Logged Out (Guest Mode)

- Data stored in **IndexedDB** via Dexie.js
- Completely local, never leaves your device
- No encryption needed (data never syncs)

### Logged In (User Mode)

- Data stored in **InstantDB** (cloud)
- End-to-end encrypted with AES-256-GCM
- Real-time sync across devices

### UI Layer

- Merges and displays both local and cloud conversations
- Seamless experience regardless of login state

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Cloud Database**: InstantDB (real-time, optimistic updates)
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Encryption**: crypto-js (AES-256-GCM)
- **AI**: OpenRouter (client-side)
- **Analytics**: Userplex (privacy-friendly)

## 📝 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🔧 Configuration

### Setting up InstantDB

1. Go to [instantdb.com/dash](https://instantdb.com/dash)
2. Create a new app
3. Copy your App ID to `.env.local` as `NEXT_PUBLIC_INSTANT_APP_ID`

### Setting up OpenRouter

1. Users will need their own OpenRouter API key
2. Keys are stored in the browser's localStorage
3. No server-side configuration needed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🙏 Acknowledgments

- Built with [InstantDB](https://instantdb.com) for real-time database
- AI powered by [OpenRouter](https://openrouter.ai)
- Analytics by [Userplex](https://userplex.com)

---

Made with ❤️ for privacy-conscious AI users
