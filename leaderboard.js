/**
 * Voyager - Leaderboard Persistence Layer & UI Overlay
 * Agent B: Full-Stack/Cloud Architect
 *
 * Responsibilities:
 * - Initialize Firebase, Firestore, and Anonymous Auth using Firebase Hosting's reserved URL.
 * - Access the database using firebase.app().firestore().
 * - Implement window.Voyager.showLeaderboard(score):
 *    * Reveal the #leaderboard-screen overlay.
 *    * Fetch the top 10 from the scores collection, ordered by score descending.
 *    * Do not seed the leaderboard with test data.
 *    * Handle 3-letter initial submission UI and persist to Firestore.
 * - Manage keyboard (Enter) and UI restart interactions.
 * - Call window.Voyager.resetGame() to notify the engine.
 */

(function () {
  'use strict';

  // Ensure window.Voyager namespace exists
  window.Voyager = window.Voyager || {};

  // Internal state
  let currentScore = 0;
  let hasSubmittedForCurrentScore = false;
  let isSubmitting = false;
  let authInitialized = false;

  /**
   * Initialize Anonymous Authentication via Firebase Auth
   */
  function initAnonymousAuth() {
    if (authInitialized) return;
    try {
      if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        const auth = firebase.auth();
        auth.onAuthStateChanged(function (user) {
          if (!user) {
            auth.signInAnonymously()
              .then(function (cred) {
                console.log('[Voyager Leaderboard] Signed in anonymously as:', cred.user.uid);
              })
              .catch(function (err) {
                console.warn('[Voyager Leaderboard] Anonymous auth warning:', err);
              });
          } else {
            console.log('[Voyager Leaderboard] Active user session:', user.uid);
          }
        });
        authInitialized = true;
      }
    } catch (e) {
      console.warn('[Voyager Leaderboard] Auth init failed:', e);
    }
  }

  /**
   * Helper to safely escape HTML strings for display
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Inject stylesheet for Leaderboard Overlay
   */
  function injectLeaderboardStyles() {
    if (document.getElementById('voyager-leaderboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'voyager-leaderboard-styles';
    style.textContent = `
      #leaderboard-screen {
        position: absolute;
        inset: 0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(4, 6, 18, 0.96);
        backdrop-filter: blur(10px);
        color: #f8fafc;
        padding: 20px;
        box-sizing: border-box;
        font-family: 'Orbitron', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
      }

      .voyager-lb-modal {
        width: 100%;
        max-width: 540px;
        background: rgba(10, 15, 30, 0.85);
        border: 2px solid rgba(0, 240, 255, 0.45);
        border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25), inset 0 0 25px rgba(0, 240, 255, 0.05);
        padding: 24px 28px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .voyager-lb-title {
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 4px;
        margin: 0 0 4px 0;
        color: #00f0ff;
        text-shadow: 0 0 15px rgba(0, 240, 255, 0.8), 0 0 30px rgba(0, 240, 255, 0.4);
      }

      .voyager-lb-subtitle {
        font-size: 11px;
        letter-spacing: 2px;
        color: #94a3b8;
        margin-bottom: 16px;
      }

      .voyager-lb-score-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: rgba(0, 240, 255, 0.08);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 8px;
        padding: 8px 20px;
        margin-bottom: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      .voyager-lb-score-label {
        font-size: 12px;
        letter-spacing: 2px;
        color: #38bdf8;
      }

      .voyager-lb-score-val {
        font-size: 20px;
        font-weight: bold;
        color: #fef08a;
        text-shadow: 0 0 10px rgba(254, 240, 138, 0.6);
      }

      .voyager-lb-submit-section {
        width: 100%;
        margin-bottom: 16px;
      }

      .voyager-lb-input-group {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }

      .voyager-lb-input-label {
        font-size: 11px;
        letter-spacing: 1.5px;
        color: #cbd5e1;
        display: block;
      }

      #leaderboard-initials-input {
        width: 110px;
        height: 38px;
        background: #090d1a;
        border: 2px solid #00f0ff;
        border-radius: 6px;
        color: #00ffcc;
        font-family: inherit;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        letter-spacing: 6px;
        text-transform: uppercase;
        outline: none;
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.35);
        transition: all 0.2s ease;
      }

      #leaderboard-initials-input:focus {
        border-color: #00ffcc;
        box-shadow: 0 0 20px rgba(0, 255, 204, 0.6);
      }

      #leaderboard-initials-input:disabled {
        opacity: 0.5;
        border-color: #475569;
        color: #64748b;
      }

      #leaderboard-submit-btn {
        height: 38px;
        padding: 0 18px;
        background: #00ffcc;
        color: #050714;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 2px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
        transition: all 0.2s ease;
      }

      #leaderboard-submit-btn:hover:not(:disabled) {
        transform: scale(1.04);
        background: #38bdf8;
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
      }

      #leaderboard-submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .voyager-lb-status {
        min-height: 18px;
        font-size: 11px;
        letter-spacing: 1px;
        margin-top: 6px;
      }

      .voyager-lb-status.info { color: #38bdf8; }
      .voyager-lb-status.success { color: #00ffcc; text-shadow: 0 0 8px rgba(0, 255, 204, 0.6); }
      .voyager-lb-status.error { color: #f43f5e; text-shadow: 0 0 8px rgba(244, 63, 94, 0.6); }

      .voyager-lb-table-wrap {
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: 6px;
        background: rgba(6, 9, 22, 0.7);
        margin-bottom: 14px;
      }

      .voyager-lb-table-wrap::-webkit-scrollbar {
        width: 6px;
      }
      .voyager-lb-table-wrap::-webkit-scrollbar-thumb {
        background: rgba(0, 240, 255, 0.3);
        border-radius: 3px;
      }

      .voyager-lb-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .voyager-lb-table th {
        background: rgba(15, 23, 42, 0.9);
        color: #38bdf8;
        padding: 8px 14px;
        letter-spacing: 1.5px;
        font-weight: 700;
        border-bottom: 1px solid rgba(0, 240, 255, 0.3);
        position: sticky;
        top: 0;
      }

      .voyager-lb-table td {
        padding: 6px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .voyager-lb-table tr:hover td {
        background: rgba(0, 240, 255, 0.08);
      }

      .rank-cell { width: 22%; text-align: left; font-weight: bold; }
      .initials-cell { width: 38%; text-align: center; letter-spacing: 3px; font-weight: bold; }
      .score-cell { width: 40%; text-align: right; color: #00f0ff; font-variant-numeric: tabular-nums; }

      .rank-1 td { color: #fef08a !important; text-shadow: 0 0 8px rgba(254, 240, 138, 0.5); }
      .rank-2 td { color: #e2e8f0 !important; }
      .rank-3 td { color: #f97316 !important; }

      .voyager-lb-restart-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }

      .voyager-lb-restart-hint {
        font-size: 11px;
        letter-spacing: 1.5px;
        color: #94a3b8;
        margin: 0;
      }

      .key-kbd {
        display: inline-block;
        border: 1px solid #00f0ff;
        background: rgba(0, 240, 255, 0.15);
        color: #00f0ff;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10px;
        box-shadow: 0 0 6px rgba(0, 240, 255, 0.4);
      }

      #leaderboard-restart-btn {
        background: transparent;
        border: 1px solid rgba(0, 240, 255, 0.5);
        color: #00f0ff;
        font-family: inherit;
        font-size: 11px;
        letter-spacing: 1.5px;
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      #leaderboard-restart-btn:hover {
        background: rgba(0, 240, 255, 0.2);
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Ensure #leaderboard-screen DOM structure exists
   */
  function ensureLeaderboardDOM() {
    injectLeaderboardStyles();

    let screen = document.getElementById('leaderboard-screen');
    if (!screen) {
      screen = document.createElement('div');
      screen.id = 'leaderboard-screen';
      screen.style.display = 'none';

      const container = document.getElementById('voyager-container') ||
                        document.getElementById('game-container') ||
                        document.body;
      container.appendChild(screen);
    }

    // Build the modal contents if not already built
    if (!screen.querySelector('.voyager-lb-modal')) {
      screen.innerHTML = `
        <div class="voyager-lb-modal">
          <h2 class="voyager-lb-title">LEADERBOARD</h2>
          <div class="voyager-lb-subtitle">DEEP SPACE PILOT REGISTRY</div>

          <div class="voyager-lb-score-banner">
            <span class="voyager-lb-score-label">MISSION SCORE:</span>
            <span id="leaderboard-player-score" class="voyager-lb-score-val">0</span>
          </div>

          <div id="leaderboard-submit-section" class="voyager-lb-submit-section">
            <label for="leaderboard-initials-input" class="voyager-lb-input-label">
              ENTER 3-LETTER CALLSIGN FOR ARCHIVE
            </label>
            <div class="voyager-lb-input-group">
              <input 
                id="leaderboard-initials-input" 
                type="text" 
                maxlength="3" 
                placeholder="AAA" 
                autocomplete="off" 
                autocapitalize="characters" 
                spellcheck="false" 
              />
              <button id="leaderboard-submit-btn" type="button">TRANSMIT</button>
            </div>
            <div id="leaderboard-status-msg" class="voyager-lb-status"></div>
          </div>

          <div class="voyager-lb-table-wrap">
            <table class="voyager-lb-table">
              <thead>
                <tr>
                  <th class="rank-cell">RANK</th>
                  <th class="initials-cell">CALLSIGN</th>
                  <th class="score-cell">SCORE</th>
                </tr>
              </thead>
              <tbody id="leaderboard-table-body">
                <tr>
                  <td colspan="3" style="text-align: center; color: #94a3b8; padding: 16px;">
                    ACCESSING BEACON RELAY...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="voyager-lb-restart-wrap">
            <p class="voyager-lb-restart-hint">
              PRESS <span class="key-kbd">ENTER</span> TO RESTART FLIGHT
            </p>
            <button id="leaderboard-restart-btn" type="button">PLAY AGAIN</button>
          </div>
        </div>
      `;

      // Attach input event listener for auto-uppercase and formatting
      const input = screen.querySelector('#leaderboard-initials-input');
      if (input) {
        input.addEventListener('input', function () {
          this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
          const statusEl = document.getElementById('leaderboard-status-msg');
          if (statusEl && statusEl.className.includes('error')) {
            statusEl.textContent = '';
            statusEl.className = 'voyager-lb-status';
          }
        });
      }

      // Attach submit button click listener
      const submitBtn = screen.querySelector('#leaderboard-submit-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', function () {
          submitScoreToFirestore();
        });
      }

      // Attach restart button click listener
      const restartBtn = screen.querySelector('#leaderboard-restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', function () {
          triggerGameRestart();
        });
      }
    }

    return screen;
  }

  /**
   * Set status text and styling in the submission section
   */
  function setStatus(msg, type) {
    const statusEl = document.getElementById('leaderboard-status-msg');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `voyager-lb-status ${type || 'info'}`;
  }

  /**
   * Fetch top 10 scores from Firestore ordered by score descending.
   * Accesses Firestore via firebase.app().firestore().
   * Does NOT seed test data.
   */
  function fetchTopScores() {
    const tableBody = document.getElementById('leaderboard-table-body');
    if (!tableBody) return;

    try {
      // Access the database using firebase.app().firestore()
      const db = firebase.app().firestore();

      db.collection('scores')
        .orderBy('score', 'desc')
        .limit(10)
        .get()
        .then(function (snapshot) {
          if (snapshot.empty) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="3" style="text-align: center; color: #94a3b8; padding: 18px;">
                  NO ARCHIVED FLIGHT RECORDS YET.
                </td>
              </tr>
            `;
            return;
          }

          let rows = '';
          let rank = 1;
          snapshot.forEach(function (doc) {
            const data = doc.data();
            const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
            const initials = escapeHtml(String(data.initials || '???').toUpperCase().slice(0, 3));
            const scoreFormatted = Number(data.score || 0).toLocaleString();

            rows += `
              <tr class="${rankClass}">
                <td class="rank-cell">#${rank}</td>
                <td class="initials-cell">${initials}</td>
                <td class="score-cell">${scoreFormatted}</td>
              </tr>
            `;
            rank++;
          });

          tableBody.innerHTML = rows;
        })
        .catch(function (error) {
          console.error('[Voyager Leaderboard] Fetch scores error:', error);
          tableBody.innerHTML = `
            <tr>
              <td colspan="3" style="text-align: center; color: #f43f5e; padding: 14px;">
                COULD NOT RETRIEVE LEADERBOARD DATA
              </td>
            </tr>
          `;
        });
    } catch (e) {
      console.error('[Voyager Leaderboard] Firestore query failed:', e);
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: #f43f5e; padding: 14px;">
            FIRESTORE CONNECTION ERROR
          </td>
        </tr>
      `;
    }
  }

  /**
   * Handle the 3-letter initial submission and save to Firestore
   */
  function submitScoreToFirestore() {
    if (isSubmitting || hasSubmittedForCurrentScore) return;

    const input = document.getElementById('leaderboard-initials-input');
    const submitBtn = document.getElementById('leaderboard-submit-btn');
    if (!input) return;

    const initials = input.value.trim().toUpperCase();
    if (initials.length !== 3) {
      setStatus('CALLSIGN MUST BE EXACTLY 3 LETTERS (A-Z)', 'error');
      input.focus();
      return;
    }

    isSubmitting = true;
    if (submitBtn) submitBtn.disabled = true;
    input.disabled = true;
    setStatus('TRANSMITTING FLIGHT DATA TO BEACON...', 'info');

    try {
      // Access the database using firebase.app().firestore()
      const db = firebase.app().firestore();

      const record = {
        initials: initials,
        score: Number(currentScore) || 0,
        createdAt: (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
          ? firebase.firestore.FieldValue.serverTimestamp()
          : new Date()
      };

      db.collection('scores').add(record)
        .then(function (docRef) {
          console.log('[Voyager Leaderboard] Score archived successfully:', docRef.id);
          isSubmitting = false;
          hasSubmittedForCurrentScore = true;
          setStatus(`CALLSIGN [${initials}] LOGGED TO GALAXY HALL OF FAME!`, 'success');

          // Refresh the leaderboard list with the new submission
          fetchTopScores();
        })
        .catch(function (error) {
          console.error('[Voyager Leaderboard] Error archiving score:', error);
          isSubmitting = false;
          if (submitBtn) submitBtn.disabled = false;
          input.disabled = false;
          setStatus('TRANSMISSION FAILED. PLEASE TRY AGAIN.', 'error');
        });
    } catch (e) {
      console.error('[Voyager Leaderboard] Firestore submission exception:', e);
      isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
      input.disabled = false;
      setStatus('DATABASE ERROR: ' + (e.message || 'Unknown error'), 'error');
    }
  }

  /**
   * Restart game and notify engine via window.Voyager.resetGame()
   */
  function triggerGameRestart() {
    const screen = document.getElementById('leaderboard-screen');
    if (screen) {
      screen.style.display = 'none';
    }

    // Call window.Voyager.resetGame() to notify the engine
    if (typeof window.Voyager.resetGame === 'function') {
      window.Voyager.resetGame();
    } else if (window.Voyager.game) {
      if (typeof window.Voyager.game.startMission === 'function') {
        window.Voyager.game.startMission();
      }
      if (typeof window.Voyager.game.startLoop === 'function') {
        window.Voyager.game.startLoop();
      }
    }
  }

  /**
   * Primary API: window.Voyager.showLeaderboard(score)
   *
   * Reveals the #leaderboard-screen overlay, fetches top 10 scores,
   * handles 3-letter initial submission UI, and sets up restart listeners.
   */
  window.Voyager.showLeaderboard = function (score) {
    // 1. Ensure DOM overlay is created
    const screen = ensureLeaderboardDOM();

    // 2. Hide core game engine overlay if present
    const gameOverlay = document.getElementById('voyager-overlay');
    if (gameOverlay) {
      gameOverlay.style.display = 'none';
    }

    // 3. Reset session submission state
    currentScore = typeof score === 'number' ? score : (Number(score) || 0);
    hasSubmittedForCurrentScore = false;
    isSubmitting = false;

    // 4. Update player score display
    const scoreVal = document.getElementById('leaderboard-player-score');
    if (scoreVal) {
      scoreVal.textContent = currentScore.toLocaleString();
    }

    // 5. Reset input fields
    const input = document.getElementById('leaderboard-initials-input');
    const submitBtn = document.getElementById('leaderboard-submit-btn');
    const statusMsg = document.getElementById('leaderboard-status-msg');

    if (input) {
      input.disabled = false;
      input.value = '';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
    }
    if (statusMsg) {
      statusMsg.textContent = '';
      statusMsg.className = 'voyager-lb-status';
    }

    // 6. Reveal the #leaderboard-screen overlay
    screen.style.display = 'flex';

    // 7. Ensure Anonymous Authentication is initialized
    initAnonymousAuth();

    // 8. Fetch the top 10 from the scores collection, ordered by score descending
    fetchTopScores();

    // 9. Autofocus initials input
    if (input) {
      setTimeout(function () {
        input.focus();
      }, 50);
    }
  };

  /**
   * Listen for Enter key:
   * - If player is focused on the 3-letter initial input and hasn't submitted yet:
   *     Submit the score if valid.
   * - Otherwise (or once submitted):
   *     Pressing Enter restarts the game and calls window.Voyager.resetGame().
   */
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      const screen = document.getElementById('leaderboard-screen');
      if (!screen || screen.style.display === 'none') {
        return;
      }

      const input = document.getElementById('leaderboard-initials-input');
      // If typing in input and not yet submitted
      if (input && document.activeElement === input && !hasSubmittedForCurrentScore) {
        if (input.value.trim().length === 3) {
          e.preventDefault();
          submitScoreToFirestore();
          return;
        }
      }

      // Restart game and notify engine
      e.preventDefault();
      triggerGameRestart();
    }
  });

  /**
   * Initialize on DOMContentLoaded or immediate execution
   */
  function initLeaderboard() {
    ensureLeaderboardDOM();
    initAnonymousAuth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeaderboard);
  } else {
    initLeaderboard();
  }
})();
