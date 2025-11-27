/* PAGE ELEMENTS */
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const page4 = document.getElementById("page4");

const nextBtn = document.getElementById("nextBtn");
const startGameBtn = document.getElementById("startGameBtn");
const exitToEndBtn = document.getElementById("exitToEndBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const exitToPosterBtn = document.getElementById("exitToPosterBtn");

const video = document.getElementById("webcam");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");
const exitBtn = document.getElementById("exitBtn");

const livesBox = document.getElementById("livesBox");
const scoreBox = document.getElementById("scoreBox");

/* GAME VARIABLES */
let detector;
let gameState = "idle";
let balls = [];
let score = 0;
let lives = 5;
let missedGold = 0;
let level = 1;

/* PADDLE */
let paddle = {
  x: canvas.width / 2 - 60,
  y: canvas.height - 40,
  width: 120,
  height: 18
};

/* HAND CONNECTION LINES */
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

/* PAGE SWITCHING */
function showPage(page) {
  [page1, page2, page3, page4].forEach(p => p.classList.add("hidden"));
  page.classList.remove("hidden");
}

nextBtn.onclick = () => showPage(page2);
exitToEndBtn.onclick = () => showPage(page4);
playAgainBtn.onclick = () => showPage(page2);
exitToPosterBtn.onclick = () => showPage(page1);

/* WEBCAM SETUP */
async function setupWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.setAttribute("playsinline", true);

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}

/* HAND DETECTOR SETUP */
async function initHandDetector() {
  const model = handPoseDetection.SupportedModels.MediaPipeHands;
  const config = {
    runtime: "mediapipe",
    modelType: "full",
    maxHands: 1,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
  };

  detector = await handPoseDetection.createDetector(model, config);
}

/* DRAW LANDMARKS */
function drawHands(hands) {
  hands.forEach(hand => {
    const pts = hand.keypoints;

    HAND_CONNECTIONS.forEach(([i,j]) => {
      const a = pts[i], b = pts[j];
      if (!a || !b) return;

      ctx.strokeStyle = "#00eaff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    pts.forEach(k => {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00eaff";
      ctx.fill();
    });
  });
}

/* PADDLE MOVEMENT — BOTTOM ZONE ONLY */
function updatePaddle(hands) {
  if (hands.length === 0) return;

  const wrist = hands[0].keypoints.find(k => k.name === "wrist");
  if (wrist) {
    const mappedX = wrist.x - paddle.width / 2;
    const mappedY = wrist.y - paddle.height / 2;

    paddle.x += (mappedX - paddle.x) * 0.35;
    paddle.y += (mappedY - paddle.y) * 0.35;
  }

  /* BOTTOM MOVEMENT ZONE */
  const zoneTop = canvas.height * 0.70;
  const zoneBottom = canvas.height - paddle.height - 5;
  const zoneLeft = 10;
  const zoneRight = canvas.width - paddle.width - 10;

  if (paddle.x < zoneLeft) paddle.x = zoneLeft;
  if (paddle.x > zoneRight) paddle.x = zoneRight;

  if (paddle.y < zoneTop) paddle.y = zoneTop;
  if (paddle.y > zoneBottom) paddle.y = zoneBottom;

  /* Draw zone (optional) */
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(0, zoneTop, canvas.width, canvas.height - zoneTop);

  /* Draw paddle */
  ctx.fillStyle = "#00c9ff";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

/* SPAWN BALLS */
function spawnBall() {
  const isGold = Math.random() < 0.85;
  const r = isGold ? 12 : 15;

  balls.push({
    x: Math.random() * (canvas.width - 2*r) + r,
    y: -r,
    radius: r,
    speed: 1.5 + level * 0.8,   // smoother difficulty
    type: isGold ? "gold" : "red"
  });
}

/* UPDATE BALLS */
function updateBalls() {
  balls.forEach(b => b.y += b.speed);

  balls = balls.filter(b => {
    if (b.y > canvas.height) {
      if (b.type === "gold") missedGold++;
      return false;
    }
    return true;
  });
}

/* COLLISIONS + SCORING */
function checkCollisions() {
  balls.forEach(b => {
    if (
      b.y + b.radius >= paddle.y &&
      b.y - b.radius <= paddle.y + paddle.height &&
      b.x >= paddle.x &&
      b.x <= paddle.x + paddle.width
    ) {
      if (b.type === "gold") {
        score += 5;
      } else {
        score -= 10;
        if (score < 0) score = 0;
      }

      /* LIVE SCORE UPDATE */
      scoreBox.innerText = "Score: " + score;

      /* FLASH ANIMATION */
      scoreBox.classList.add("score-animate");
      setTimeout(() => scoreBox.classList.remove("score-animate"), 250);

      b.y = 9999; // remove
    }
  });
}

/* DRAW BALLS */
function drawBalls() {
  balls.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.type === "gold" ? "#ffd700" : "#ff4a4a";
    ctx.fill();
  });
}

/* LEVEL SYSTEM */
function updateLevel() {
  if (score < 50) level = 1;
  else if (score < 150) level = 2;
  else if (score < 300) level = 3;
  else level = 4;
}

/* UI UPDATE */
function updateUI() {
  livesBox.innerHTML = "💖".repeat(lives);
  scoreBox.innerText = "Score: " + score;
}

/* GAME LOOP */
async function gameLoop() {
  if (gameState !== "playing") return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Draw camera mirrored */
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  const hands = await detector.estimateHands(video);

  hands.forEach(hand => {
    hand.keypoints.forEach(pt => {
      pt.x = canvas.width - (pt.x / video.videoWidth) * canvas.width;
      pt.y = (pt.y / video.videoHeight) * canvas.height;
    });
  });

  drawHands(hands);
  updatePaddle(hands);

  if (Math.random() < 0.12) spawnBall();

  updateBalls();
  checkCollisions();
  updateLevel();
  updateUI();
  drawBalls();

  if (lives <= 0 || missedGold >= 5) {
    endGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

/* START GAME */
async function startGame() {
  showPage(page3);

  score = 0;
  lives = 5;
  missedGold = 0;
  level = 1;
  balls = [];

  paddle.x = canvas.width / 2 - paddle.width / 2;
  paddle.y = canvas.height - 40;

  await setupWebcam();
  await initHandDetector();

  updateUI();

  gameState = "playing";
  gameLoop();
}

/* END GAME */
function endGame() {
  gameState = "idle";
  showPage(page4);
  document.getElementById("finalScoreText").innerText = "Score: " + score;
}

/* MENU ACTIONS */
menuBtn.onclick = () => {
  if (gameState !== "playing") return;
  gameState = "paused";
  menuPanel.classList.remove("hidden");
};

resumeBtn.onclick = () => {
  menuPanel.classList.add("hidden");
  gameState = "playing";
  gameLoop();
};

restartBtn.onclick = () => {
  menuPanel.classList.add("hidden");
  startGame();
};

exitBtn.onclick = () => endGame();

/* START GAME BUTTON */
startGameBtn.onclick = startGame;
