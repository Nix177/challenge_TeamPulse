/**
 * VoiceAssistantApp — Controller for Interactive Report Assistant
 * 
 * Binds UI controls, MicrophoneCapture, PcmAudioPlayer, GeminiLiveClient,
 * TeamPulseReportRetriever, and ReportAvatarAnimator.
 */
import { TeamPulseReportRetriever } from './TeamPulseReportRetriever.js';
import { PcmAudioPlayer } from './PcmAudioPlayer.js';
import { GeminiLiveClient } from './GeminiLiveClient.js';
import { MicrophoneCapture } from './MicrophoneCapture.js';
import { ReportAvatarAnimator } from './ReportAvatarAnimator.js';

export class VoiceAssistantApp {
  constructor() {
    this.retriever = new TeamPulseReportRetriever();
    this.transcriptEntries = [];
    this.isTranscriptEnabled = false;

    this.initDOM();
    this.initAudioAndClient();
    this.initAvatar();
    this.bindEvents();
  }

  initDOM() {
    this.statusBadgeEl = document.getElementById('assistant-status-badge');
    this.statusTextEl = document.getElementById('assistant-status-text');
    this.textInputEl = document.getElementById('report-text-input');
    this.sendBtnEl = document.getElementById('btn-send-question');
    this.micBtnEl = document.getElementById('btn-toggle-mic');
    this.micLabelEl = document.getElementById('mic-button-label');
    this.stopSpeechBtnEl = document.getElementById('btn-stop-speech');
    this.avatarContainerEl = document.getElementById('avatar-container');
    this.suggestedBtnEls = document.querySelectorAll('.suggested-question-btn');
    this.transcriptCheckboxEl = document.getElementById('chk-local-transcript');
    this.transcriptBoxEl = document.getElementById('transcript-container');
    this.transcriptListEl = document.getElementById('transcript-list');
    this.downloadTranscriptBtnEl = document.getElementById('btn-download-transcript');
    this.staticNoticeEl = document.getElementById('static-deployment-notice');
  }

  initAudioAndClient() {
    this.audioPlayer = new PcmAudioPlayer({
      onStart: () => {
        this.updateState('speaking');
      },
      onIdle: () => {
        if (this.micCapture && this.micCapture.isCapturing) {
          this.updateState('listening');
        } else {
          this.updateState('idle');
        }
      }
    });

    this.client = new GeminiLiveClient({
      retriever: this.retriever,
      audioPlayer: this.audioPlayer,
      onStateChange: (state) => {
        this.updateState(state);
      },
      onTranscript: (role, text) => {
        this.addTranscriptEntry(role, text);
      },
      onError: (err) => {
        this.showErrorNotice(err.message || "Assistant momentanément indisponible.");
      }
    });

    this.micCapture = new MicrophoneCapture({
      onAudioChunk: (base64Pcm) => {
        this.client.sendRealtimeAudioChunk(base64Pcm);
      },
      onError: (err) => {
        console.error('[VoiceAssistantApp] Microphone error:', err);
        this.updateState('idle');
        this.showErrorNotice("Accès au micro refusé ou indisponible. Vous pouvez continuer à poser vos questions par écrit.");
      }
    });
  }

  initAvatar() {
    if (this.avatarContainerEl) {
      this.animator = new ReportAvatarAnimator({
        containerEl: this.avatarContainerEl,
        manifestPath: 'public/assets/report-assistant/avatar-manifest.json'
      });
    }
  }

  bindEvents() {
    // Suggested Questions buttons
    if (this.suggestedBtnEls) {
      this.suggestedBtnEls.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const questionText = e.currentTarget.getAttribute('data-question') || e.currentTarget.textContent.trim();
          this.submitQuestion(questionText);
        });
      });
    }

    // Text Form Submit
    if (this.sendBtnEl && this.textInputEl) {
      const handleTextSubmit = () => {
        const text = this.textInputEl.value.trim();
        if (text) {
          this.textInputEl.value = '';
          this.submitQuestion(text);
        }
      };

      this.sendBtnEl.addEventListener('click', handleTextSubmit);
      this.textInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTextSubmit();
        }
      });
    }

    // Microphone Toggle Button
    if (this.micBtnEl) {
      this.micBtnEl.addEventListener('click', async () => {
        // Unlock audio context during direct user gesture
        this.audioPlayer.ensureContext();

        if (this.micCapture.isCapturing) {
          this.micCapture.stop();
          this.client.sendAudioStreamEnd();
          this.updateState('idle');
        } else {
          this.client.interrupt();
          this.updateState('listening');
          const connected = await this.client.connect();
          if (connected) {
            await this.micCapture.start();
          } else {
            this.updateState('error');
          }
        }
      });
    }

    // Stop Speech Button
    if (this.stopSpeechBtnEl) {
      this.stopSpeechBtnEl.addEventListener('click', () => {
        this.client.interrupt();
        this.audioPlayer.stop();
        if (this.micCapture.isCapturing) {
          this.updateState('listening');
        } else {
          this.updateState('idle');
        }
      });
    }

    // Local Transcript Checkbox
    if (this.transcriptCheckboxEl) {
      this.transcriptCheckboxEl.addEventListener('change', (e) => {
        this.isTranscriptEnabled = e.target.checked;
        if (this.transcriptBoxEl) {
          this.transcriptBoxEl.style.display = this.isTranscriptEnabled ? 'block' : 'none';
        }
        if (!this.isTranscriptEnabled) {
          this.transcriptEntries = [];
          this.renderTranscriptList();
        }
      });
    }

    // Download Transcript Button
    if (this.downloadTranscriptBtnEl) {
      this.downloadTranscriptBtnEl.addEventListener('click', () => {
        this.downloadTranscriptMarkdown();
      });
    }
  }

  async submitQuestion(questionText) {
    if (!questionText) return;
    // Unlock audio context during direct user gesture before first await
    this.audioPlayer.ensureContext();
    this.client.interrupt();
    await this.client.sendTextQuestion(questionText);
  }

  updateState(state) {
    // States: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
    if (this.animator) {
      this.animator.setState(state);
    }

    if (this.statusBadgeEl) {
      this.statusBadgeEl.className = `assistant-status-badge state-${state}`;
    }

    let statusText = 'Disponible';
    if (state === 'listening') statusText = 'Écoute…';
    else if (state === 'thinking') statusText = 'Recherche dans le rapport…';
    else if (state === 'speaking') statusText = 'Réponse en cours…';
    else if (state === 'error') statusText = 'Assistant momentanément indisponible';

    if (this.statusTextEl) {
      this.statusTextEl.textContent = statusText;
    }

    if (this.stopSpeechBtnEl) {
      this.stopSpeechBtnEl.style.display = (state === 'speaking') ? 'inline-flex' : 'none';
    }

    if (this.micBtnEl && this.micLabelEl) {
      if (this.micCapture && this.micCapture.isCapturing) {
        this.micBtnEl.classList.add('is-active');
        this.micLabelEl.textContent = 'Arrêter le micro';
      } else {
        this.micBtnEl.classList.remove('is-active');
        this.micLabelEl.textContent = 'Parler au micro';
      }
    }
  }

  addTranscriptEntry(role, text) {
    if (!this.isTranscriptEnabled) return;
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.transcriptEntries.push({ role, text, timestamp: timeStr });
    this.renderTranscriptList();
  }

  renderTranscriptList() {
    if (!this.transcriptListEl) return;
    if (this.transcriptEntries.length === 0) {
      this.transcriptListEl.innerHTML = '<p style="color: var(--ink-soft); font-style: italic;">Aucun échange enregistré pour le moment.</p>';
      return;
    }

    this.transcriptListEl.innerHTML = this.transcriptEntries.map(entry => `
      <div class="transcript-item ${entry.role === 'user' ? 'from-user' : 'from-assistant'}">
        <span class="transcript-meta">${entry.role === 'user' ? 'Visiteur' : 'Assistant Rapport'} (${entry.timestamp}) :</span>
        <p class="transcript-body">${entry.text}</p>
      </div>
    `).join('');

    this.transcriptListEl.scrollTop = this.transcriptListEl.scrollHeight;
  }

  downloadTranscriptMarkdown() {
    if (this.transcriptEntries.length === 0) return;
    let md = `# Transcription - Rapport interactif Team Pulse\n\n`;
    md += `*Date : ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}*\n\n---\n\n`;

    this.transcriptEntries.forEach(e => {
      const speaker = e.role === 'user' ? '**Visiteur**' : '**Assistant Rapport**';
      md += `### ${speaker} (${e.timestamp})\n\n${e.text}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-team-pulse-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showErrorNotice(msg) {
    const errorNoticeEl = document.getElementById('report-error-notice');
    if (errorNoticeEl) {
      errorNoticeEl.textContent = msg;
      errorNoticeEl.style.display = 'block';
    }
  }
}

// Auto-initialize when DOM is ready on rapport-interactif.html
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('report-assistant-app')) {
      window.voiceAssistantApp = new VoiceAssistantApp();
    }
  });
}
