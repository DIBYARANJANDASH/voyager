/**
 * Voyager - Core Game Engine
 * Agent A: Lead Game Developer
 * 
 * Implements:
 * - 8-Way Direct Ship Physics (Arrow keys, Base speed 2.5px/frame, SHIFT boost 2x, Z brake 0.5x, directional rotation)
 * - Constellation Trace Logic across 12 Zodiac levels (Aries through Pisces)
 * - Dotted guide lines & solid glowing neon connection lines
 * - Next star target indicators
 * - State transitions with narrative text and creative alien SVG
 * - Shift + D developer shortcut to trigger WIN state with valid score
 * - window.Voyager.showLeaderboard(score) handoff and loop termination
 */

(function () {
  'use strict';

  // Ensure window.Voyager namespace exists
  window.Voyager = window.Voyager || {};

  // Gameplay Constants
  const BASE_SPEED = 2.5; // pixels per frame
  const BOOST_MULTIPLIER = 2.0; // SHIFT key
  const BRAKE_MULTIPLIER = 0.5; // Z key
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const STAR_CONNECT_RADIUS = 30; // forgiving proximity threshold

  // Game States
  const STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    FAIL: 'FAIL',
    WIN: 'WIN',
    HANDOFF: 'HANDOFF'
  };

  // Narrative Texts (Verbatim requirements with preserved empty lines)
  const START_TEXT = `Astronaut 311-C,   

As humanity's best pilot, you have been selected for a crucial, top-secret mission: to find extraterrestrial life.

To do this, you must pilot your spacecraft between the stars of the 12 Zodiac constellations, as they appear. With each new constellation, you will have less time to connect the points. You must connect all of the constellations within the time limit to discover our intergalactic friends.  

Use your arrow keys to move the spacecraft. Press SHIFT to speed up and Z to slow down.  

Good luck, and bon voyage!`;

  const FAIL_TEXT = `You have failed your mission, Astronaut 311-A. Humanity remains alone among the stars. Unless you choose to try again...`;

  const SUCCESS_TEXT_P1 = `Hello, traveler. I am Zarg 966-Z. Welcome to Zargaborg!`;
  const SUCCESS_TEXT_P2 = `I just pumped some fresh oxygen into my biosphere! So come on in, kick your boots off, and tell me all about your travels.`;

  // Weird Creative Alien SVG (Zarg 966-Z)
  const ALIEN_SVG = `
  <svg class="alien-svg" viewBox="0 0 260 220" width="190" height="160" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 16px rgba(0, 255, 180, 0.7)); margin: 10px auto; display: block;">
    <defs>
      <radialGradient id="alienGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ffcc" stop-opacity="0.8"/>
        <stop offset="60%" stop-color="#9900ff" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#050518" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="alienSkin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00ffcc"/>
        <stop offset="40%" stop-color="#22d3ee"/>
        <stop offset="80%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="tentacleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
      <radialGradient id="eyeLens" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="40%" stop-color="#fef08a"/>
        <stop offset="70%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#713f12"/>
      </radialGradient>
    </defs>
    <!-- Background energy aura -->
    <circle cx="130" cy="110" r="95" fill="url(#alienGlow)" />
    
    <!-- Waving Tentacles / Limbs -->
    <path d="M 60 140 C 35 155, 25 180, 40 200 C 50 190, 65 170, 75 150 Z" fill="url(#tentacleGrad)" opacity="0.9"/>
    <path d="M 85 160 C 65 185, 75 210, 95 215 C 100 200, 100 180, 100 165 Z" fill="url(#tentacleGrad)" opacity="0.95"/>
    <path d="M 175 160 C 195 185, 185 210, 165 215 C 160 200, 160 180, 160 165 Z" fill="url(#tentacleGrad)" opacity="0.95"/>
    <path d="M 200 140 C 225 155, 235 180, 220 200 C 210 190, 195 170, 185 150 Z" fill="url(#tentacleGrad)" opacity="0.9"/>
    
    <!-- Waving welcoming hand -->
    <path d="M 45 100 C 20 85, 15 55, 30 45 C 40 55, 50 75, 65 95 Z" fill="url(#alienSkin)"/>
    <circle cx="28" cy="46" r="7" fill="#00ffcc"/>
    <circle cx="36" cy="38" r="5" fill="#f43f5e"/>
    <circle cx="48" cy="40" r="5" fill="#eab308"/>

    <!-- Antennae -->
    <path d="M 105 55 Q 90 20 70 25" stroke="#00ffcc" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="68" cy="25" r="9" fill="#f43f5e">
      <animate attributeName="r" values="8;11;8" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    
    <path d="M 155 55 Q 170 20 190 25" stroke="#00ffcc" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="192" cy="25" r="9" fill="#00ffcc">
      <animate attributeName="r" values="10;7;10" dur="1.5s" repeatCount="indefinite"/>
    </circle>

    <!-- Main Bloby Head / Body -->
    <path d="M 75 90 C 65 40, 195 40, 185 90 C 215 130, 180 180, 130 175 C 80 180, 45 130, 75 90 Z" fill="url(#alienSkin)" stroke="#38bdf8" stroke-width="2"/>
    
    <!-- Bioluminescent Spots -->
    <circle cx="95" cy="70" r="5" fill="#a7f3d0" opacity="0.7"/>
    <circle cx="108" cy="62" r="3.5" fill="#a7f3d0" opacity="0.7"/>
    <circle cx="165" cy="70" r="4.5" fill="#fbcfe8" opacity="0.7"/>
    <circle cx="152" cy="62" r="3" fill="#fbcfe8" opacity="0.7"/>

    <!-- Three Eyes: Left, Big Center, Right -->
    <!-- Left Eye -->
    <ellipse cx="98" cy="98" rx="14" ry="16" fill="#0f172a" stroke="#00ffcc" stroke-width="2"/>
    <ellipse cx="98" cy="98" rx="10" ry="12" fill="url(#eyeLens)"/>
    <ellipse cx="98" cy="98" rx="4" ry="8" fill="#050510"/>
    <circle cx="95" cy="94" r="3" fill="#ffffff"/>

    <!-- Big Center Cyclops / Lead Eye -->
    <ellipse cx="130" cy="85" rx="19" ry="21" fill="#0f172a" stroke="#ec4899" stroke-width="2.5"/>
    <ellipse cx="130" cy="85" rx="15" ry="17" fill="url(#eyeLens)"/>
    <ellipse cx="130" cy="85" rx="5" ry="11" fill="#050510"/>
    <circle cx="126" cy="80" r="4" fill="#ffffff"/>
    <circle cx="134" cy="90" r="2" fill="#ffffff"/>

    <!-- Right Eye -->
    <ellipse cx="162" cy="98" rx="14" ry="16" fill="#0f172a" stroke="#00ffcc" stroke-width="2"/>
    <ellipse cx="162" cy="98" rx="10" ry="12" fill="url(#eyeLens)"/>
    <ellipse cx="162" cy="98" rx="4" ry="8" fill="#050510"/>
    <circle cx="159" cy="94" r="3" fill="#ffffff"/>

    <!-- Friendly Goofy Smile -->
    <path d="M 105 132 Q 130 160 155 132" stroke="#090d16" stroke-width="4" stroke-linecap="round" fill="#701a75"/>
    <path d="M 112 135 Q 130 148 148 135" fill="#f8fafc"/>
    <circle cx="102" cy="132" r="4" fill="#f43f5e" opacity="0.6"/>
    <circle cx="158" cy="132" r="4" fill="#f43f5e" opacity="0.6"/>
  </svg>
  `;

  // 12 Zodiac Constellations (Aries through Pisces)
  // Time limits decrease across levels; Level 12 (Pisces) gives exactly 15 seconds.
  const CONSTELLATIONS = [
    {
      name: "Aries",
      symbol: "♈",
      timeLimit: 45,
      stars: [
        { x: 200, y: 320, name: "Mesarthim" },
        { x: 330, y: 270, name: "Sheratan" },
        { x: 480, y: 240, name: "Hamal" },
        { x: 620, y: 310, name: "41 Arietis" }
      ]
    },
    {
      name: "Taurus",
      symbol: "♉",
      timeLimit: 42,
      stars: [
        { x: 180, y: 270, name: "Pleiades" },
        { x: 290, y: 300, name: "Ain" },
        { x: 380, y: 330, name: "Hyades" },
        { x: 470, y: 280, name: "Aldebaran" },
        { x: 600, y: 200, name: "Elnath" },
        { x: 490, y: 370, name: "Tianguan" },
        { x: 630, y: 400, name: "Zeta Tauri" }
      ]
    },
    {
      name: "Gemini",
      symbol: "♊",
      timeLimit: 39,
      stars: [
        { x: 240, y: 190, name: "Castor" },
        { x: 320, y: 200, name: "Pollux" },
        { x: 350, y: 290, name: "Wasat" },
        { x: 430, y: 380, name: "Alhena" },
        { x: 490, y: 420, name: "Mebsuta" },
        { x: 330, y: 390, name: "Propus" },
        { x: 260, y: 310, name: "Mekbuda" },
        { x: 200, y: 240, name: "Tejat" }
      ]
    },
    {
      name: "Cancer",
      symbol: "♋",
      timeLimit: 36,
      stars: [
        { x: 400, y: 180, name: "Tegmine" },
        { x: 380, y: 280, name: "Asellus Bor." },
        { x: 440, y: 320, name: "Asellus Aust." },
        { x: 310, y: 410, name: "Acubens" },
        { x: 510, y: 400, name: "Altarf" }
      ]
    },
    {
      name: "Leo",
      symbol: "♌",
      timeLimit: 33,
      stars: [
        { x: 570, y: 230, name: "Regulus" },
        { x: 530, y: 170, name: "Algieba" },
        { x: 460, y: 160, name: "Adhafera" },
        { x: 410, y: 210, name: "Ras Elased" },
        { x: 370, y: 270, name: "Subra" },
        { x: 460, y: 310, name: "Chertan" },
        { x: 370, y: 360, name: "Zosma" },
        { x: 280, y: 340, name: "Denebola" },
        { x: 190, y: 290, name: "Al Minliar" }
      ]
    },
    {
      name: "Virgo",
      symbol: "♍",
      timeLimit: 30,
      stars: [
        { x: 220, y: 210, name: "Zavijava" },
        { x: 320, y: 230, name: "Zaniah" },
        { x: 410, y: 260, name: "Porrima" },
        { x: 490, y: 200, name: "Vindemiatrix" },
        { x: 590, y: 240, name: "Minelauva" },
        { x: 540, y: 350, name: "Spica" },
        { x: 440, y: 380, name: "Heze" },
        { x: 350, y: 360, name: "Syrma" },
        { x: 260, y: 410, name: "Rijl al Awwa" }
      ]
    },
    {
      name: "Libra",
      symbol: "♎",
      timeLimit: 27,
      stars: [
        { x: 400, y: 180, name: "Zubeneschamali" },
        { x: 270, y: 280, name: "Zubenelgenubi" },
        { x: 290, y: 400, name: "Brachium" },
        { x: 400, y: 330, name: "Zubenelhakrabi" },
        { x: 530, y: 290, name: "Zubenalgubi" },
        { x: 520, y: 420, name: "Upsilon Librae" }
      ]
    },
    {
      name: "Scorpio",
      symbol: "♏",
      timeLimit: 24,
      stars: [
        { x: 220, y: 200, name: "Graffias" },
        { x: 200, y: 250, name: "Dschubba" },
        { x: 240, y: 300, name: "Fang" },
        { x: 330, y: 280, name: "Antares" },
        { x: 400, y: 320, name: "Alniyat" },
        { x: 450, y: 370, name: "Larawag" },
        { x: 490, y: 430, name: "Girtab" },
        { x: 550, y: 440, name: "Iclil" },
        { x: 600, y: 390, name: "Sargas" },
        { x: 590, y: 330, name: "Shaula" },
        { x: 530, y: 300, name: "Lesath" }
      ]
    },
    {
      name: "Sagittarius",
      symbol: "♐",
      timeLimit: 21,
      stars: [
        { x: 230, y: 330, name: "Alnasl" },
        { x: 300, y: 250, name: "Kaus Media" },
        { x: 390, y: 210, name: "Kaus Borealis" },
        { x: 470, y: 270, name: "Phi Sagittarii" },
        { x: 550, y: 230, name: "Nunki" },
        { x: 590, y: 310, name: "Ascella" },
        { x: 510, y: 380, name: "Kaus Australis" },
        { x: 400, y: 390, name: "Namalsadirah" },
        { x: 310, y: 440, name: "Rukbat" },
        { x: 220, y: 410, name: "Arkab" }
      ]
    },
    {
      name: "Capricorn",
      symbol: "♑",
      timeLimit: 19,
      stars: [
        { x: 210, y: 220, name: "Algedi" },
        { x: 240, y: 280, name: "Dabih" },
        { x: 330, y: 360, name: "Oculus" },
        { x: 440, y: 390, name: "Castra" },
        { x: 550, y: 360, name: "Nashira" },
        { x: 610, y: 290, name: "Deneb Algedi" },
        { x: 550, y: 240, name: "Baten Algiedi" },
        { x: 390, y: 230, name: "Theta Cap" }
      ]
    },
    {
      name: "Aquarius",
      symbol: "♒",
      timeLimit: 17,
      stars: [
        { x: 240, y: 200, name: "Sadalmelik" },
        { x: 330, y: 190, name: "Sadalsuud" },
        { x: 410, y: 230, name: "Sadachbia" },
        { x: 370, y: 280, name: "Albali" },
        { x: 430, y: 320, name: "Ancha" },
        { x: 490, y: 280, name: "Situla" },
        { x: 560, y: 330, name: "Skat" },
        { x: 510, y: 400, name: "Hydor" },
        { x: 430, y: 440, name: "Tau Aqr" },
        { x: 340, y: 420, name: "Psi Aqr" }
      ]
    },
    {
      name: "Pisces",
      symbol: "♓",
      timeLimit: 15, // The final level gives players 15 seconds as instructed
      stars: [
        { x: 190, y: 210, name: "North Fish 1" },
        { x: 260, y: 220, name: "North Fish 2" },
        { x: 290, y: 280, name: "Cord Beta" },
        { x: 330, y: 340, name: "Cord Gamma" },
        { x: 390, y: 390, name: "Cord Delta" },
        { x: 460, y: 430, name: "Alrescha (Knot)" },
        { x: 520, y: 380, name: "Cord Epsilon" },
        { x: 570, y: 320, name: "Cord Zeta" },
        { x: 620, y: 260, name: "Circlet 1" },
        { x: 580, y: 210, name: "Circlet 2" },
        { x: 510, y: 230, name: "Circlet 3" }
      ]
    }
  ];

  // Game Engine Class
  class VoyagerGame {
    constructor() {
      this.state = STATE.START;
      this.currentLevelIndex = 0;
      this.score = 0;
      this.timeRemaining = 45;
      this.lastTimestamp = 0;
      this.animationFrameId = null;

      // Ship state
      this.ship = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: 14,
        angle: -Math.PI / 2, // starts facing up
        isThrusting: false,
        thrustMultiplier: 1.0
      };

      // Constellation trace state
      this.connectedIndices = [];
      this.nextTargetIndex = 0;

      // Particle system for star connections & thrusters
      this.particles = [];
      this.starfield = [];

      // Keyboard input state
      this.keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        Shift: false,
        z: false,
        KeyD: false
      };

      this.initStarfield();
      this.setupDOM();
      this.setupControls();
      this.showScreen(STATE.START);
      this.startLoop();
    }

    initStarfield() {
      this.starfield = [];
      for (let i = 0; i < 90; i++) {
        this.starfield.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          radius: Math.random() * 1.6 + 0.4,
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.03 + 0.01
        });
      }
    }

    setupDOM() {
      // Find or create main game container
      let container = document.getElementById('voyager-container') ||
                      document.getElementById('game-container') ||
                      document.getElementById('game');

      if (!container) {
        container = document.createElement('div');
        container.id = 'voyager-container';
        document.body.appendChild(container);
      }

      this.container = container;
      this.container.style.position = 'relative';
      this.container.style.width = '100%';
      this.container.style.maxWidth = `${CANVAS_WIDTH}px`;
      this.container.style.height = `${CANVAS_HEIGHT}px`;
      this.container.style.margin = '20px auto';
      this.container.style.backgroundColor = '#050714';
      this.container.style.borderRadius = '12px';
      this.container.style.boxShadow = '0 0 35px rgba(0, 240, 255, 0.25), inset 0 0 40px rgba(10, 15, 35, 0.8)';
      this.container.style.border = '2px solid rgba(0, 240, 255, 0.4)';
      this.container.style.overflow = 'hidden';
      this.container.style.boxSizing = 'border-box';
      this.container.style.fontFamily = "'Orbitron', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      // Canvas element
      let canvas = this.container.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'voyager-canvas';
        this.container.appendChild(canvas);
      }
      this.canvas = canvas;
      this.canvas.width = CANVAS_WIDTH;
      this.canvas.height = CANVAS_HEIGHT;
      this.canvas.style.display = 'block';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.ctx = canvas.getContext('2d');

      // Narrative UI Overlay (Ensures text fits cleanly inside container without overlapping borders)
      let overlay = this.container.querySelector('#voyager-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'voyager-overlay';
        this.container.appendChild(overlay);
      }
      this.overlay = overlay;
      this.overlay.style.position = 'absolute';
      this.overlay.style.inset = '0';
      this.overlay.style.display = 'flex';
      this.overlay.style.flexDirection = 'column';
      this.overlay.style.alignItems = 'center';
      this.overlay.style.justifyContent = 'center';
      this.overlay.style.padding = '24px 32px';
      this.overlay.style.boxSizing = 'border-box';
      this.overlay.style.backgroundColor = 'rgba(5, 7, 20, 0.88)';
      this.overlay.style.backdropFilter = 'blur(6px)';
      this.overlay.style.color = '#e2e8f0';
      this.overlay.style.zIndex = '20';
      this.overlay.style.overflowY = 'auto';
      this.overlay.style.textAlign = 'center';
    }

    setupControls() {
      // Key down listener
      window.addEventListener('keydown', (e) => {
        // Developer shortcut: Shift + D skips all levels and triggers WIN state
        if (e.shiftKey && (e.key === 'D' || e.key === 'd' || e.code === 'KeyD')) {
          if (this.state === STATE.PLAYING || this.state === STATE.START) {
            e.preventDefault();
            this.triggerDevWinShortcut();
            return;
          }
        }

        if (e.key === 'ArrowUp' || e.code === 'ArrowUp') {
          this.keys.ArrowUp = true;
          e.preventDefault();
        }
        if (e.key === 'ArrowDown' || e.code === 'ArrowDown') {
          this.keys.ArrowDown = true;
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
          this.keys.ArrowLeft = true;
          e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
          this.keys.ArrowRight = true;
          e.preventDefault();
        }
        if (e.key === 'Shift' || e.shiftKey) {
          this.keys.Shift = true;
        }
        if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') {
          this.keys.z = true;
        }

        // Space key triggers screen progression
        if (e.code === 'Space' || e.key === ' ') {
          if (this.state === STATE.START) {
            e.preventDefault();
            this.startMission();
          } else if (this.state === STATE.FAIL) {
            e.preventDefault();
            this.retryMission();
          } else if (this.state === STATE.WIN) {
            e.preventDefault();
            this.finishAndHandoff();
          }
        }
      });

      // Key up listener
      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.code === 'ArrowUp') this.keys.ArrowUp = false;
        if (e.key === 'ArrowDown' || e.code === 'ArrowDown') this.keys.ArrowDown = false;
        if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') this.keys.ArrowLeft = false;
        if (e.key === 'ArrowRight' || e.code === 'ArrowRight') this.keys.ArrowRight = false;
        if (e.key === 'Shift') this.keys.Shift = false;
        if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') this.keys.z = false;
      });

      // Window blur safety
      window.addEventListener('blur', () => {
        this.keys.ArrowUp = false;
        this.keys.ArrowDown = false;
        this.keys.ArrowLeft = false;
        this.keys.ArrowRight = false;
        this.keys.Shift = false;
        this.keys.z = false;
      });
    }

    // Displays narrative screens with preserved paragraphs fitting within container
    showScreen(stateName) {
      this.state = stateName;
      this.overlay.style.display = 'flex';
      this.overlay.innerHTML = '';

      const contentBox = document.createElement('div');
      contentBox.style.maxWidth = '680px';
      contentBox.style.width = '100%';
      contentBox.style.padding = '10px';
      contentBox.style.boxSizing = 'border-box';
      contentBox.style.display = 'flex';
      contentBox.style.flexDirection = 'column';
      contentBox.style.alignItems = 'center';

      if (stateName === STATE.START) {
        // Start Screen
        const titleEl = document.createElement('h1');
        titleEl.textContent = 'VOYAGER';
        titleEl.style.margin = '0 0 14px 0';
        titleEl.style.fontSize = '30px';
        titleEl.style.letterSpacing = '6px';
        titleEl.style.color = '#00f0ff';
        titleEl.style.textShadow = '0 0 15px rgba(0, 240, 255, 0.8)';
        contentBox.appendChild(titleEl);

        const textWrapper = document.createElement('div');
        textWrapper.style.fontSize = '14px';
        textWrapper.style.lineHeight = '1.6';
        textWrapper.style.color = '#cbd5e1';
        textWrapper.style.textAlign = 'left';
        textWrapper.style.marginBottom = '20px';
        textWrapper.style.background = 'rgba(15, 23, 42, 0.7)';
        textWrapper.style.padding = '18px 22px';
        textWrapper.style.borderRadius = '8px';
        textWrapper.style.border = '1px solid rgba(0, 240, 255, 0.3)';

        // Preserve empty lines for paragraph breaks
        const paragraphs = START_TEXT.split('\n\n');
        paragraphs.forEach((p, idx) => {
          const pEl = document.createElement('p');
          pEl.textContent = p.trim();
          pEl.style.margin = idx === paragraphs.length - 1 ? '0' : '0 0 12px 0';
          textWrapper.appendChild(pEl);
        });
        contentBox.appendChild(textWrapper);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '14px';
        btnRow.style.alignItems = 'center';
        btnRow.style.justifyContent = 'center';

        const btn = document.createElement('button');
        btn.innerHTML = 'LAUNCH MISSION &nbsp;[SPACE]';
        btn.style.padding = '12px 30px';
        btn.style.fontSize = '14px';
        btn.style.letterSpacing = '2px';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#050714';
        btn.style.backgroundColor = '#00f0ff';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.6)';
        btn.style.transition = 'all 0.2s';
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => this.startMission();
        btnRow.appendChild(btn);

        const lbBtn = document.createElement('button');
        lbBtn.innerHTML = 'LEADERBOARD';
        lbBtn.style.padding = '12px 22px';
        lbBtn.style.fontSize = '14px';
        lbBtn.style.letterSpacing = '2px';
        lbBtn.style.fontWeight = 'bold';
        lbBtn.style.color = '#00f0ff';
        lbBtn.style.backgroundColor = 'transparent';
        lbBtn.style.border = '1px solid #00f0ff';
        lbBtn.style.borderRadius = '6px';
        lbBtn.style.cursor = 'pointer';
        lbBtn.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.3)';
        lbBtn.style.transition = 'all 0.2s';
        lbBtn.onmouseover = () => lbBtn.style.transform = 'scale(1.05)';
        lbBtn.onmouseout = () => lbBtn.style.transform = 'scale(1)';
        lbBtn.onclick = () => {
          if (typeof window.Voyager?.showLeaderboard === 'function') {
            window.Voyager.showLeaderboard(0);
          }
        };
        btnRow.appendChild(lbBtn);

        contentBox.appendChild(btnRow);

      } else if (stateName === STATE.FAIL) {
        // Fail Screen
        const titleEl = document.createElement('h1');
        titleEl.textContent = 'MISSION FAILED';
        titleEl.style.margin = '0 0 18px 0';
        titleEl.style.fontSize = '28px';
        titleEl.style.letterSpacing = '4px';
        titleEl.style.color = '#ff3366';
        titleEl.style.textShadow = '0 0 15px rgba(255, 51, 102, 0.8)';
        contentBox.appendChild(titleEl);

        const textWrapper = document.createElement('div');
        textWrapper.style.fontSize = '15px';
        textWrapper.style.lineHeight = '1.7';
        textWrapper.style.color = '#e2e8f0';
        textWrapper.style.textAlign = 'center';
        textWrapper.style.marginBottom = '24px';
        textWrapper.style.background = 'rgba(30, 10, 20, 0.7)';
        textWrapper.style.padding = '18px 24px';
        textWrapper.style.borderRadius = '8px';
        textWrapper.style.border = '1px solid rgba(255, 51, 102, 0.4)';

        const pEl = document.createElement('p');
        pEl.textContent = FAIL_TEXT;
        pEl.style.margin = '0';
        textWrapper.appendChild(pEl);
        contentBox.appendChild(textWrapper);

        const btn = document.createElement('button');
        btn.innerHTML = 'RETRY MISSION &nbsp;[SPACE]';
        btn.style.padding = '12px 28px';
        btn.style.fontSize = '14px';
        btn.style.letterSpacing = '2px';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#ffffff';
        btn.style.backgroundColor = '#ff3366';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 0 20px rgba(255, 51, 102, 0.6)';
        btn.style.transition = 'all 0.2s';
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => this.retryMission();
        contentBox.appendChild(btn);

      } else if (stateName === STATE.WIN) {
        // Mission Success Screen with Alien SVG
        const titleEl = document.createElement('h1');
        titleEl.textContent = 'MISSION SUCCESS!';
        titleEl.style.margin = '0 0 10px 0';
        titleEl.style.fontSize = '26px';
        titleEl.style.letterSpacing = '4px';
        titleEl.style.color = '#00ffcc';
        titleEl.style.textShadow = '0 0 18px rgba(0, 255, 204, 0.8)';
        contentBox.appendChild(titleEl);

        const p1 = document.createElement('p');
        p1.textContent = SUCCESS_TEXT_P1;
        p1.style.fontSize = '15px';
        p1.style.fontWeight = '600';
        p1.style.color = '#f8fafc';
        p1.style.margin = '0 0 6px 0';
        contentBox.appendChild(p1);

        // Place weird creative alien SVG
        const svgContainer = document.createElement('div');
        svgContainer.innerHTML = ALIEN_SVG.trim();
        contentBox.appendChild(svgContainer);

        const p2 = document.createElement('p');
        p2.textContent = SUCCESS_TEXT_P2;
        p2.style.fontSize = '13.5px';
        p2.style.lineHeight = '1.6';
        p2.style.color = '#94a3b8';
        p2.style.margin = '8px 0 18px 0';
        p2.style.maxWidth = '580px';
        contentBox.appendChild(p2);

        const scoreEl = document.createElement('div');
        scoreEl.innerHTML = `FINAL MISSION SCORE: <span style="color:#00f0ff; font-weight:bold; font-size:18px;">${this.score}</span>`;
        scoreEl.style.marginBottom = '16px';
        scoreEl.style.fontSize = '14px';
        scoreEl.style.letterSpacing = '2px';
        contentBox.appendChild(scoreEl);

        const btn = document.createElement('button');
        btn.innerHTML = 'VIEW LEADERBOARD &nbsp;[SPACE]';
        btn.style.padding = '12px 30px';
        btn.style.fontSize = '14px';
        btn.style.letterSpacing = '2px';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#050714';
        btn.style.backgroundColor = '#00ffcc';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.6)';
        btn.style.transition = 'all 0.2s';
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => this.finishAndHandoff();
        contentBox.appendChild(btn);
      }

      this.overlay.appendChild(contentBox);
    }

    startMission() {
      this.currentLevelIndex = 0;
      this.score = 0;
      this.loadLevel(this.currentLevelIndex);
      this.state = STATE.PLAYING;
      this.overlay.style.display = 'none';
    }

    retryMission() {
      this.startMission();
    }

    // Developer shortcut: Shift + D triggers WIN state and sets player score
    triggerDevWinShortcut() {
      // Award score so developers can record it in the leaderboard
      if (this.score < 12000) {
        this.score = 14500;
      }
      this.currentLevelIndex = CONSTELLATIONS.length - 1;
      this.showScreen(STATE.WIN);
    }

    // Handoff to leaderboard when moving past mission success screen
    finishAndHandoff() {
      this.state = STATE.HANDOFF;
      this.stopLoop();

      // Call external leaderboard if present
      if (typeof window.Voyager.showLeaderboard === 'function') {
        window.Voyager.showLeaderboard(this.score);
      } else {
        console.log(`[Voyager] Handoff complete. Final Score: ${this.score}. window.Voyager.showLeaderboard called.`);
      }
    }

    loadLevel(index) {
      const constellation = CONSTELLATIONS[index];
      this.timeRemaining = constellation.timeLimit;
      this.connectedIndices = [0]; // star 0 starts connected
      this.nextTargetIndex = 1;

      // Position ship near the first star
      const startStar = constellation.stars[0];
      this.ship.x = startStar.x;
      this.ship.y = startStar.y;
      this.ship.angle = 0;
    }

    startLoop() {
      if (this.animationFrameId) return;
      this.lastTimestamp = performance.now();
      const loop = (timestamp) => {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
        this.lastTimestamp = timestamp;

        this.update(dt, timestamp);
        this.render(timestamp);

        if (this.state !== STATE.HANDOFF) {
          this.animationFrameId = requestAnimationFrame(loop);
        }
      };
      this.animationFrameId = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    update(dt, timestamp) {
      // Always update starfield twinkle
      for (let s of this.starfield) {
        s.alpha += Math.sin(timestamp * s.twinkleSpeed) * 0.01;
        if (s.alpha > 0.95) s.alpha = 0.95;
        if (s.alpha < 0.25) s.alpha = 0.25;
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2.0;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      if (this.state !== STATE.PLAYING) {
        return;
      }

      // 1. Timer logic
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.showScreen(STATE.FAIL);
        return;
      }

      // 2. 8-Way Direct Ship Physics
      // Input direction vector
      let dx = 0;
      let dy = 0;

      if (this.keys.ArrowUp) dy -= 1;
      if (this.keys.ArrowDown) dy += 1;
      if (this.keys.ArrowLeft) dx -= 1;
      if (this.keys.ArrowRight) dx += 1;

      // Speed multipliers: 2.0x for SHIFT (boost), 0.5x for Z (brake)
      let multiplier = 1.0;
      if (this.keys.Shift) {
        multiplier = BOOST_MULTIPLIER;
      } else if (this.keys.z) {
        multiplier = BRAKE_MULTIPLIER;
      }
      this.ship.thrustMultiplier = multiplier;

      if (dx !== 0 || dy !== 0) {
        this.ship.isThrusting = true;
        // Normalize direction vector for diagonal travel
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;

        // Apply speed per frame
        const currentSpeed = BASE_SPEED * multiplier;
        this.ship.x += dx * currentSpeed;
        this.ship.y += dy * currentSpeed;

        // Ship automatically rotates to face current direction of travel
        this.ship.angle = Math.atan2(dy, dx);

        // Keep ship clamped within bounds
        const pad = this.ship.radius + 4;
        this.ship.x = Math.max(pad, Math.min(CANVAS_WIDTH - pad, this.ship.x));
        this.ship.y = Math.max(50, Math.min(CANVAS_HEIGHT - pad, this.ship.y));

        // Add thruster flame particles
        if (Math.random() < (this.keys.Shift ? 0.8 : 0.4)) {
          const rearAngle = this.ship.angle + Math.PI;
          const flameSpeed = (Math.random() * 2 + 1) * multiplier;
          this.particles.push({
            x: this.ship.x + Math.cos(rearAngle) * (this.ship.radius + 2),
            y: this.ship.y + Math.sin(rearAngle) * (this.ship.radius + 2),
            vx: Math.cos(rearAngle + (Math.random() - 0.5) * 0.4) * flameSpeed,
            vy: Math.sin(rearAngle + (Math.random() - 0.5) * 0.4) * flameSpeed,
            life: 1.0,
            color: this.keys.Shift ? '#00f0ff' : (this.keys.z ? '#f59e0b' : '#ff7733'),
            size: Math.random() * 3 + 2
          });
        }
      } else {
        this.ship.isThrusting = false;
      }

      // 3. Constellation Trace Logic & Star Collision Detection
      const constellation = CONSTELLATIONS[this.currentLevelIndex];
      if (this.nextTargetIndex < constellation.stars.length) {
        const targetStar = constellation.stars[this.nextTargetIndex];
        const dist = Math.hypot(this.ship.x - targetStar.x, this.ship.y - targetStar.y);

        if (dist <= STAR_CONNECT_RADIUS) {
          // Connect star!
          this.connectedIndices.push(this.nextTargetIndex);
          this.score += 250;

          // Burst particles upon connection
          for (let p = 0; p < 18; p++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1.5;
            this.particles.push({
              x: targetStar.x,
              y: targetStar.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1.2,
              color: '#00ffff',
              size: Math.random() * 3.5 + 1.5
            });
          }

          this.nextTargetIndex++;

          // Check if constellation is fully connected
          if (this.nextTargetIndex >= constellation.stars.length) {
            // Level cleared!
            this.score += 1000 + Math.floor(this.timeRemaining) * 50;

            if (this.currentLevelIndex < CONSTELLATIONS.length - 1) {
              // Advance to next constellation
              this.currentLevelIndex++;
              this.loadLevel(this.currentLevelIndex);
            } else {
              // Completed all 12 Zodiac constellations!
              this.showScreen(STATE.WIN);
            }
          }
        }
      }
    }

    render(timestamp) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Starfield
      for (const s of this.starfield) {
        ctx.fillStyle = `rgba(220, 240, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Constellation Stars & Lines
      const constellation = CONSTELLATIONS[this.currentLevelIndex];
      if (constellation) {
        const stars = constellation.stars;

        // Render Dotted Guide Lines between all stars
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -timestamp * 0.02;
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(70, 130, 200, 0.45)';
        ctx.beginPath();
        for (let i = 0; i < stars.length - 1; i++) {
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
        }
        ctx.stroke();
        ctx.restore();

        // Render Solid Neon Lines upon connection
        if (this.connectedIndices.length > 1) {
          ctx.save();
          ctx.setLineDash([]);
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(stars[this.connectedIndices[0]].x, stars[this.connectedIndices[0]].y);
          for (let i = 1; i < this.connectedIndices.length; i++) {
            const idx = this.connectedIndices[i];
            ctx.lineTo(stars[idx].x, stars[idx].y);
          }
          ctx.stroke();

          // Bright inner core line
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.restore();
        }

        // Render Stars
        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          const isConnected = this.connectedIndices.includes(i);
          const isNext = (i === this.nextTargetIndex && this.state === STATE.PLAYING);

          if (isNext) {
            // Indicate which star the player needs to fly to next with pulsing neon radar
            ctx.save();
            const pulseRadius = 14 + 6 * Math.sin(timestamp * 0.008);
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(st.x, st.y, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Next label
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NEXT', st.x, st.y - pulseRadius - 4);
            ctx.restore();
          }

          // Star Core
          ctx.save();
          if (isConnected) {
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(st.x, st.y, 6.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(st.x, st.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(160, 200, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(st.x, st.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Star label
          if (st.name) {
            ctx.fillStyle = isConnected ? '#a5f3fc' : 'rgba(148, 163, 184, 0.6)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(st.name, st.x, st.y + 16);
          }
          ctx.restore();
        }
      }

      // 3. Draw Particles
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Draw Spacecraft
      if (this.state === STATE.PLAYING) {
        this.drawShip(ctx);
      }

      // 5. Draw HUD Overlay
      if (this.state === STATE.PLAYING) {
        this.drawHUD(ctx);
      }
    }

    drawShip(ctx) {
      ctx.save();
      ctx.translate(this.ship.x, this.ship.y);
      ctx.rotate(this.ship.angle);

      // Ship body glow
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;

      // Spaceship Hull
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Arrowhead style ship pointing forward (positive X axis)
      ctx.moveTo(16, 0);       // Nose
      ctx.lineTo(-12, -10);    // Left wing
      ctx.lineTo(-6, 0);       // Thruster indent
      ctx.lineTo(-12, 10);     // Right wing
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Window
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(2, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thruster flame when thrusting
      if (this.ship.isThrusting) {
        ctx.fillStyle = this.keys.Shift ? '#00f0ff' : (this.keys.z ? '#f59e0b' : '#ff7733');
        ctx.beginPath();
        const flameLength = (Math.random() * 8 + 8) * this.ship.thrustMultiplier;
        ctx.moveTo(-6, -4);
        ctx.lineTo(-6 - flameLength, 0);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    drawHUD(ctx) {
      const constellation = CONSTELLATIONS[this.currentLevelIndex];

      // HUD Background top bar
      ctx.fillStyle = 'rgba(5, 7, 20, 0.75)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 48);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 48);
      ctx.lineTo(CANVAS_WIDTH, 48);
      ctx.stroke();

      // Constellation Name & Symbol
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${constellation.symbol} ${constellation.name.toUpperCase()} (LEVEL ${this.currentLevelIndex + 1} / 12)`, 18, 28);

      // Star Connection Counter
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Stars: ${this.connectedIndices.length} / ${constellation.stars.length}`, 260, 28);

      // Score
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`SCORE: ${this.score}`, 400, 28);

      // Speed status
      let speedText = 'SPEED: NORMAL';
      let speedColor = '#94a3b8';
      if (this.keys.Shift) {
        speedText = 'SPEED: BOOST 2x [SHIFT]';
        speedColor = '#00ffcc';
      } else if (this.keys.z) {
        speedText = 'SPEED: BRAKE 0.5x [Z]';
        speedColor = '#f59e0b';
      }
      ctx.fillStyle = speedColor;
      ctx.font = '11px sans-serif';
      ctx.fillText(speedText, 530, 28);

      // Time Remaining Countdown
      const t = Math.ceil(this.timeRemaining);
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = t <= 5 ? '#ff3366' : (t <= 10 ? '#f59e0b' : '#00f0ff');
      ctx.fillText(`TIME: ${t}s`, CANVAS_WIDTH - 18, 28);
    }
  }

  // Initialize and attach instance to window.Voyager
  function initGame() {
    window.Voyager.game = new VoyagerGame();
    window.Voyager.resetGame = function () {
      const lbScreen = document.getElementById('leaderboard-screen');
      if (lbScreen) {
        lbScreen.style.display = 'none';
      }
      if (window.Voyager.game) {
        window.Voyager.game.startMission();
        window.Voyager.game.startLoop();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
