/**
 * GeminiLiveClient — WebSocket Client for Gemini Live API & RAG Tool Handling
 * 
 * Manages WebSocket connection to Gemini Live, handles setupComplete handshake,
 * inputAudioTranscription / outputAudioTranscription event accumulation,
 * toolCall / toolResponse for retrieve_team_pulse_report_context, streams 24kHz PCM
 * audio to PcmAudioPlayer, and handles text / microphone input.
 */

export const SYSTEM_INSTRUCTION = `Vous êtes l’assistant vocal du rapport de défi Team Pulse de Nicolas Tuor.
Répondez naturellement et poliment en français parlé.

PRONONCIATION ET ACCENT :
Parlez exclusivement en français standard européen, avec une prononciation naturelle et neutre de Suisse romande. N’utilisez pas d’accent québécois ou canadien marqué, ni de tournures ou de régionalismes québécois. Le ton doit être chaleureux, professionnel et naturel.
RESPOND EXCLUSIVELY IN STANDARD EUROPEAN FRENCH, WITH A NATURAL NEUTRAL FRENCH-SWISS PRONUNCIATION. DO NOT USE A QUEBEC OR CANADIAN FRENCH ACCENT OR QUEBEC REGIONAL EXPRESSIONS.

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

    // Connection & Handshake lifecycle fields
    this.connectPromise = null;
    this.resolveSetup = null;
    this.rejectSetup = null;
    this.setupTimeout = null;
    this.manualClose = false;
    this.isSetupComplete = false;

    // Per-turn audio transcription accumulation buffers
    this.currentInputTranscript = '';
    this.currentOutputTranscript = '';
    this.isTypedQuestion = false;

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
    if (this.isSetupComplete && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      const token = await this.fetchToken();
      if (!token || this.isStaticMode) {
        this.connectPromise = null;
        return false;
      }

      return new Promise((resolve, reject) => {
        try {
          const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;
          this.ws = new WebSocket(wsUrl);
          this.manualClose = false;

          this.resolveSetup = () => {
            if (this.setupTimeout) {
              clearTimeout(this.setupTimeout);
              this.setupTimeout = null;
            }
            this.isSetupComplete = true;
            resolve(true);
          };

          this.rejectSetup = (err) => {
            if (this.setupTimeout) {
              clearTimeout(this.setupTimeout);
              this.setupTimeout = null;
            }
            this.isSetupComplete = false;
            reject(err);
          };

          this.ws.onopen = () => {
            this.sendSetup();
            // 12-second setup timeout
            this.setupTimeout = setTimeout(() => {
              const err = new Error("Le serveur Gemini Live met trop de temps à répondre (timeout 12s).");
              if (this.rejectSetup) {
                this.rejectSetup(err);
                this.resolveSetup = null;
                this.rejectSetup = null;
              }
              this.setState('error');
              if (this.ws) {
                try { this.ws.close(); } catch (_) {}
              }
            }, 12000);
          };

          this.ws.onmessage = async (event) => {
            await this.handleServerMessage(event);
          };

          this.ws.onerror = (err) => {
            console.error('[GeminiLiveClient] WebSocket error:', err);
            if (this.rejectSetup) {
              this.rejectSetup(new Error('Erreur de connexion WebSocket avec Gemini Live.'));
              this.resolveSetup = null;
              this.rejectSetup = null;
            }
            this.setState('error');
          };

          this.ws.onclose = () => {
            this.isSetupComplete = false;
            if (this.rejectSetup) {
              this.rejectSetup(new Error('La connexion WebSocket s’est fermée avant la fin de l’initialisation.'));
              this.resolveSetup = null;
              this.rejectSetup = null;
            }
            if (this.state === 'speaking' || this.state === 'thinking') {
              this.setState('idle');
            }
          };
        } catch (err) {
          console.error('[GeminiLiveClient] Connection initialization failed:', err);
          if (this.rejectSetup) {
            this.rejectSetup(err);
            this.resolveSetup = null;
            this.rejectSetup = null;
          }
          this.setState('error');
          resolve(false);
        }
      }).catch(err => {
        console.warn('[GeminiLiveClient] Setup handshake rejected:', err.message);
        this.setState('error');
        this.onError?.(err);
        return false;
      }).finally(() => {
        this.connectPromise = null;
      });
    })();

    return this.connectPromise;
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
        inputAudioTranscription: {},
        outputAudioTranscription: {},
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

  async handleServerMessage(event) {
    let msg;
    try {
      const data = event && event.data !== undefined ? event.data : event;
      let raw;
      if (typeof data === 'string') {
        raw = data;
      } else if (data && typeof data.text === 'function') {
        raw = await data.text();
      } else if (data instanceof ArrayBuffer) {
        raw = new TextDecoder().decode(data);
      } else {
        raw = String(data);
      }
      msg = JSON.parse(raw);
    } catch (e) {
      console.warn('[GeminiLiveClient] Could not parse server message:', e);
      return;
    }

    if (!msg) return;

    // Handle setupComplete handshake from server
    if (msg.setupComplete) {
      if (this.resolveSetup) {
        this.resolveSetup();
        this.resolveSetup = null;
        this.rejectSetup = null;
      }
      return;
    }

    // Handle toolCall (functionCalls)
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

    // Handle toolCallCancellation
    if (msg.toolCallCancellation) {
      if (this.state === 'thinking') {
        this.setState('idle');
      }
      return;
    }

    // Handle goAway
    if (msg.goAway) {
      console.warn('[GeminiLiveClient] Server sent goAway, disconnecting');
      this.disconnect();
      return;
    }

    // Accumulate input transcription chunks (microphone speech from visitor)
    const inputChunk = msg.serverContent?.inputTranscription?.text ||
                       msg.serverContent?.inputAudioTranscription?.text ||
                       msg.inputTranscription?.text ||
                       msg.inputAudioTranscription?.text;

    if (inputChunk && !this.isTypedQuestion) {
      this.currentInputTranscript += inputChunk;
    }

    // Accumulate output transcription chunks (Gemini spoken answer)
    const outputChunk = msg.serverContent?.outputTranscription?.text ||
                        msg.serverContent?.outputAudioTranscription?.text ||
                        msg.outputTranscription?.text ||
                        msg.outputAudioTranscription?.text;

    if (outputChunk) {
      this.currentOutputTranscript += outputChunk;
    }

    // Handle serverContent
    if (msg.serverContent) {
      const parts = msg.serverContent.modelTurn?.parts || [];
      for (const part of parts) {
        // Stream audio immediately to PcmAudioPlayer (non-blocking)
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/') && part.inlineData.data) {
          if (this.audioPlayer) {
            this.audioPlayer.playChunk(part.inlineData.data);
          }
        }
        if (part.text && !outputChunk) {
          this.currentOutputTranscript += part.text;
        }
      }

      if (msg.serverContent.interrupted) {
        this.interrupt();
      }

      if (msg.serverContent.turnComplete) {
        // Emit accumulated visitor voice transcription if present and not typed
        if (this.currentInputTranscript.trim() && !this.isTypedQuestion) {
          this.onTranscript('user', this.currentInputTranscript.trim());
        }

        // Emit accumulated assistant voice transcription if present
        if (this.currentOutputTranscript.trim()) {
          this.onTranscript('assistant', this.currentOutputTranscript.trim());
        }

        // Reset per-turn transcription buffers
        this.currentInputTranscript = '';
        this.currentOutputTranscript = '';
        this.isTypedQuestion = false;

        if (!this.audioPlayer || !this.audioPlayer.isPlaying) {
          this.setState('idle');
        }
      }
    }
  }

  sendToolResponse(callId, name, resultText) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;

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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;

    this.isTypedQuestion = false;

    const audioMsg = {
      realtimeInput: {
        audio: {
          data: base64PcmData,
          mimeType: 'audio/pcm;rate=16000'
        }
      }
    };

    this.ws.send(JSON.stringify(audioMsg));
  }

  sendAudioStreamEnd() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return;

    const endMsg = {
      realtimeInput: {
        audioStreamEnd: true
      }
    };

    this.ws.send(JSON.stringify(endMsg));
  }

  async sendTextQuestion(question) {
    this.interrupt();
    this.isTypedQuestion = true;
    this.currentInputTranscript = '';
    this.currentOutputTranscript = '';
    this.setState('thinking');
    this.onTranscript('user', question);

    const connected = await this.connect();
    if (!connected || this.isStaticMode) {
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
    this.currentInputTranscript = '';
    this.currentOutputTranscript = '';
    this.isTypedQuestion = false;

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
    this.manualClose = true;
    this.isSetupComplete = false;
    this.currentInputTranscript = '';
    this.currentOutputTranscript = '';
    this.isTypedQuestion = false;

    if (this.setupTimeout) {
      clearTimeout(this.setupTimeout);
      this.setupTimeout = null;
    }
    if (this.rejectSetup) {
      this.rejectSetup(new Error('Connection closed manually'));
      this.resolveSetup = null;
      this.rejectSetup = null;
    }
    this.connectPromise = null;
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
