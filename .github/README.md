<h1 align="center">
  <a href="https://prompts.chat">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://prompts.chat/logo-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://prompts.chat/logo.svg">
      <img height="60" alt="prompts.chat" src="https://prompts.chat/logo.svg">
    </picture>
    <br>
    Solution8 promptBar
  </a>
</h1>

<p align="center">
  <strong>The world's largest open-source prompt library for AI</strong><br>
  <sub>Works with ChatGPT, Claude, Gemini, Llama, Mistral, and more</sub>
</p>

<p align="center">
  <a href="https://prompts.chat"><img src="https://img.shields.io/badge/Website-prompts.chat-blue?style=flat-square" alt="Website"></a>
  <a href="https://github.com/sindresorhus/awesome"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome"></a>
  <a href="https://huggingface.co/datasets/fka/prompts.chat"><img src="https://img.shields.io/badge/🤗-Hugging_Face-yellow?style=flat-square" alt="Hugging Face"></a>
  <a href="https://deepwiki.com/f/prompts.chat"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

<p align="center">
  <a href="https://prompts.chat/prompts">🌐 Browse Prompts</a> •
  <a href="https://fka.gumroad.com/l/art-of-chatgpt-prompting">📖 Read the Book</a> •
  <a href="https://raw.githubusercontent.com/f/prompts.chat/main/PROMPTS.md">📄 View on GitHub</a> •
  <a href="#-self-hosting">🚀 Self-Host</a>
</p>

<p align="center">
  <sub>
    🏆 Featured in <a href="https://www.forbes.com/sites/tjmccue/2023/01/19/chatgpt-success-completely-depends-on-your-prompt/">Forbes</a> · 
    🎓 Referenced by <a href="https://www.huit.harvard.edu/news/ai-prompts">Harvard</a>, <a href="https://etc.cuit.columbia.edu/news/columbia-prompt-library-effective-academic-ai-use">Columbia</a> · 
    📄 <a href="https://scholar.google.com/citations?user=AZ0Dg8YAAAAJ&hl=en">40+ academic citations</a> · 
    ❤️ <a href="https://huggingface.co/datasets/fka/prompts.chat">Most liked dataset</a> on Hugging Face<br>
    ⭐ 143k+ GitHub stars · 
    🏅 <a href="https://spotlights-feed.github.com/spotlights/prompts-chat/index/">GitHub Staff Pick</a> · 
  </sub>
</p>

---

## What is this?

A community-curated SOTA prompt, skill and workflow-sharing platform for use with LLMs.

| Browse Prompts | Data Formats |
|----------------|--------------|
| [prompts.chat](https://prompts.chat/prompts) | [prompts.csv](prompts.csv) |
| [PROMPTS.md](https://raw.githubusercontent.com/f/prompts.chat/main/PROMPTS.md) | [Hugging Face Dataset](https://huggingface.co/datasets/fka/prompts.chat) |

**Want to contribute?** Add prompts at [prompts.chat/prompts/new](https://prompts.chat/prompts/new) — they sync here automatically.

---

## 🎮 Prompting for Kids

<p>
  <a href="https://prompts.chat/kids">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://prompts.chat/promi-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://prompts.chat/promi.svg">
      <img height="60" alt="Promi" src="https://prompts.chat/promi.svg" align="left">
    </picture>
  </a>
</p>

An interactive, game-based adventure to teach children (ages 8-14) how to communicate with AI through fun puzzles and stories.

**[Start Playing →](https://prompts.chat/kids)**

<br clear="left">

---

## 🚀 Self-Hosting

Deploy your own private prompt library with custom branding, themes, and authentication.

**Quick Start:**
```bash
npx prompts.chat new my-prompt-library
cd my-prompt-library
```

**Manual Setup:**
```bash
git clone https://github.com/f/prompts.chat.git
cd prompts.chat
npm install && npm run setup
```

The setup wizard configures branding, theme, authentication (GitHub/Google/Azure AD), and features.

📖 **[Full Self-Hosting Guide](https://github.com/solution8-com/S8-Utility-Promptschat/blob/main/SELF-HOSTING.md)** • 🐳 **[Docker Guide](https://github.com/solution8-com/S8-Utility-Promptschat/blob/main/DOCKER.md)**

---

## 🔌 Integrations

### CLI
```bash
npx prompts.chat
```

### Claude Code Plugin
```
/plugin marketplace add f/prompts.chat
/plugin install prompts.chat@prompts.chat
```
📖 [Plugin Documentation](https://github.com/solution8-com/S8-Utility-Promptschat/blob/main/CLAUDE-PLUGIN.md)

### MCP Server
Use prompts.chat as an MCP server in your AI tools.

**Remote (recommended):**
```json
{
  "mcpServers": {
    "prompts.chat": {
      "url": "https://prompts.chat/api/mcp"
    }
  }
}
```

**Local:**
```json
{
  "mcpServers": {
    "prompts.chat": {
      "command": "npx",
      "args": ["-y", "prompts.chat", "mcp"]
    }
  }
}
```

📖 [MCP Documentation](https://prompts.chat/docs/api)
