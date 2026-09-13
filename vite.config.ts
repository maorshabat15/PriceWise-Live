import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const reqData = JSON.parse(body || '{}');
            const { message, history, persona, systemInstruction, temperature } = reqData;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply:
                    "⚠️ **GEMINI_API_KEY environment variable is missing.**\n\nPlease add your API key in the Secrets panel to activate direct Gemini API responses, or continue using the interactive workspace tools!",
                })
              );
              return;
            }

            const ai = new GoogleGenAI({ apiKey });

            let systemPrompt =
              systemInstruction ||
              'You are a helpful, intelligent, concise AI workspace assistant. Use markdown formatting with clear bullet points and code blocks where relevant.';
            if (persona === 'code_developer') {
              systemPrompt +=
                ' You specialize in clean, performant TypeScript/React code and software architecture.';
            } else if (persona === 'creative_writer') {
              systemPrompt +=
                ' You specialize in creative copywriting, polished documentation, and engaging messaging.';
            } else if (persona === 'strategy_analyst') {
              systemPrompt +=
                ' You specialize in product strategy, executive summaries, and structured analysis.';
            }

            const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
            if (history && Array.isArray(history)) {
              for (const item of history) {
                contents.push({
                  role: item.role === 'user' ? 'user' : 'model',
                  parts: [{ text: item.content }],
                });
              }
            }
            contents.push({
              role: 'user',
              parts: [{ text: message || 'Hello' }],
            });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents,
              config: {
                systemInstruction: systemPrompt,
                temperature: typeof temperature === 'number' ? temperature : 0.7,
              },
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply: response.text }));
          } catch (err: unknown) {
            console.error('Gemini API Error:', err);
            const msg = err instanceof Error ? err.message : 'Internal server error';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: msg }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
