/**
 * GeminiLiveClient — WebSocket Client for Gemini Live API & RAG Tool Handling
 * 
 * Manages WebSocket connection to Gemini Live, handles toolCall / toolResponse for
 * retrieve_team_pulse_report_context, streams 24kHz PCM audio to PcmAudioPlayer,
 * and handles text / microphone input.
 */

export const SYSTEM_INSTRUCTION = `Vous êtes l’assistant vocal du rapport de défi Team Pulse de Nicolas Tuor.
Répondez naturellement et poliment en français parlé.

RÈGLES IMPÉRATIVES DE RÉPONSE :
1. Utilisez UNIQUEMENT les faits et contextes vérifiés transmis par l'outil de recherche du rapport Team Pulse (retrieve_team_pulse_report_context).
2. Répondez habituellement en 2 à 5 phrases parlées concises. Pour une question complexe, donnez une réponse concise et proposez un détail utile complémentaire.
3. Parlez de Nicolas à la troisième personne ("Nicolas"). Ne vous faites jamais passer pour Nicolas.
4. N'inventez JAMAIS de retours clients, d'études utilisateurs, de nombres de participants réels, de dates, de résultats de tests non figurant dans le rapport, de technologies, d'engagements ou de motivations absentes du corpus.
5. Rappelez clairement si nécessaire que :
   - Team Pulse est un prototype fonctionnel / maquette de démonstration, pas un produit fini validé sur le marché.
   - Aucun vrai client ni groupe cible réel n'a encore donné de retour terrain.
   - La prochaine étape utile serait de le tester avec de vrais utilisateurs.
   - La fonctionnalité optionnelle de commentaire privé n'est qu'une proposition d'extension.
   - Le vibe coding a accéléré la construction mais n'a pas remplacé les tests, le jugement technique ni les connaissances de développement classique.
6. Quand le corpus ne contient pas l'information demandée, dites-le clairement et simplement en français.
7. Vos réponses sont dites à l'oral : évitez le markdown, les titres, les tableaux, les listes à puces et les URLs brutes.`;

export class GeminiLiveClient {
  constructor({ retriever, audioPlayer, onStateChange, onTranscript, onError }) {
    this.retriever = retriever;
    this.audioPlayer = audioPlayer;
    this.onStateChange = onStateChange || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onError = onError || (() => {});

    this.ws = null;
    this.token = null;
    this.model = 'gemini-3.1-flash-live-preview';
    this.voice = 'Sadaltager';
    this.state = 'idle'; // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
    this.isStaticMode = false;

    // Connect audio player callbacks to state
    if (this.audioPlayer) {
      this.audioPlayer.onStart = () => {
        this.setState('speaking');
      };
      this.audioPlayer.onIdle = () => {
        if (this.state === 'speaking') {
          this.setState('idle');
        }
      };
    }
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange(newState);
  }

  async fetchToken() {
    try {
      const res = await fetch('/api/live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`Token API returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.ok || !data.token) {
        throw new Error(data.error || 'Invalid token response');
      }
      this.token = data.token;
      if (data.model) this.model = data.model;
      if (data.voice) this.voice = data.voice;
      return this.token;
    } catch (err) {
      console.warn('[GeminiLiveClient] Live token endpoint unavailable (static mode):', err.message);
      this.isStaticMode = true;
      return null;
    }
  }

  async connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    const token = await this.fetchToken();
    if (!token || this.isStaticMode) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.sendSetup();
          resolve(true);
        };

        this.ws.onmessage = async (event) => {
          await this.handleServerMessage(event.data);
        };

        this.ws.onerror = (err) => {
          console.error('[GeminiLiveClient] WebSocket error:', err);
          this.setState('error');
          resolve(false);
        };

        this.ws.onclose = () => {
          if (this.state === 'speaking' || this.state === 'thinking') {
            this.setState('idle');
          }
        };
      } catch (err) {
        console.error('[GeminiLiveClient] Connection failed:', err);
        this.setState('error');
        resolve(false);
      }
    });
  }

  sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMsg = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'retrieve_team_pulse_report_context',
                description: 'Recherche les passages pertinents dans le rapport d’expérience Team Pulse pour répondre à une question.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    query: {
                      type: 'STRING',
                      description: 'Mots-clés ou question pour la recherche dans le rapport.'
                    }
                  },
                  required: ['query']
                }
              }
            ]
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(setupMsg));
  }

  async handleServerMessage(data) {
    let msg;
    try {
      msg = typeof data === 'string' ? JSON.parse(data) : JSON.parse(new TextDecoder().decode(data));
    } catch (e) {
      return;
    }

    // Handle Tool Call from Gemini Live
    if (msg.toolCall && Array.isArray(msg.toolCall.functionCalls)) {
      this.setState('thinking');
      for (const call of msg.toolCall.functionCalls) {
        if (call.name === 'retrieve_team_pulse_report_context') {
          const query = (call.args && call.args.query) ? call.args.query : '';
          const result = await this.retriever.retrieve(query);
          this.sendToolResponse(call.id, call.name, result.contextText);
        }
      }
      return;
    }

    // Handle Server Content (Audio / Text)
    if (msg.serverContent) {
      const parts = msg.serverContent.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          if (this.audioPlayer) {
            this.audioPlayer.playChunk(part.inlineData.data);
          }
        }
        if (part.text) {
          this.onTranscript('assistant', part.text);
        }
      }

      if (msg.serverContent.interrupted) {
        this.interrupt();
      }
    }
  }

  sendToolResponse(callId, name, resultText) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const responseMsg = {
      toolResponse: {
        functionResponses: [
          {
            name: name,
            id: callId,
            response: {
              result: resultText
            }
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(responseMsg));
  }

  sendRealtimeAudioChunk(base64PcmData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const audioMsg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64PcmData
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(audioMsg));
  }

  async sendTextQuestion(question) {
    this.interrupt();
    this.setState('thinking');
    this.onTranscript('user', question);

    const connected = await this.connect();
    if (!connected || this.isStaticMode) {
      // Static / Offline RAG fallback
      const retrieved = await this.retriever.retrieve(question);
      const fallbackText = this.generateStaticResponse(question, retrieved.contextText);
      this.onTranscript('assistant', fallbackText);
      this.setState('idle');
      return fallbackText;
    }

    const retrieved = await this.retriever.retrieve(question);
    const userPrompt = `Question du visiteur : ${question}\n\nContexte extrait du rapport :\n${retrieved.contextText}`;

    const textMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(textMsg));
  }

  interrupt() {
    if (this.audioPlayer) {
      this.audioPlayer.stop();
    }
    if (this.state === 'speaking' || this.state === 'thinking') {
      this.setState('idle');
    }
  }

  generateStaticResponse(question, contextText) {
    return `[Mode démonstration statique sans serveur Vercel]\n\nLes réponses vocales nécessitent le déploiement Vercel avec /api/live-token.\n\nContenu extrait du rapport pour votre question :\n${contextText}`;
  }

  disconnect() {
    this.interrupt();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.setState('idle');
  }
}
