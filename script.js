const paperVideo = document.getElementById("paper-video");
const introScreen = document.getElementById("intro-screen");
const mainScreen = document.getElementById("main-screen");
const introText = document.getElementById("introText");
const leafContainer = document.getElementById("leaf-container");
const mainAudio = document.getElementById("mainAudio");
const introAudio = document.getElementById("introAudio");
const stopAudio = document.getElementById("STOPAudio");
let introAudioEnded = false;

introAudio.addEventListener("ended", () => {
    introAudioEnded = true;
});

const AUDIO_FPS = 25;

function tcToSeconds(h, m, s, f) {
    return h * 3600 + m * 60 + s + f / AUDIO_FPS;
}

function fadeOutAudio(audio,duration=1000){

    const startVolume=audio.volume;
    const step=50;
    const decrease=startVolume/(duration/step);

    const fade=setInterval(()=>{

        audio.volume-=decrease;

        if(audio.volume<=0){

            audio.pause();
            audio.currentTime=0;
            audio.volume=startVolume;

            clearInterval(fade);

        }

    },step);

}

const CUE_POINTS = [
    { time: tcToSeconds(0, 0, 4, 12), fn: () => snapLetter("letterA1") },
    { time: tcToSeconds(0, 0, 5, 0), fn: () => snapLetter("letterF") },
    { time: tcToSeconds(0, 0, 6, 16) + 0.10, fn: () => snapLetter("letterR") },
    { time: tcToSeconds(0, 0, 7, 5), fn: () => snapLetter("letterA2") },
    { time: tcToSeconds(0, 0, 7, 17), fn: () => playSpaceImpact() }
];

let firedCues = new Set();

const LEAF_ASSETS = ["assets/leaf1.png", "assets/leaf2.png", "assets/leaf3.png"];
const LOL_ASSET = "assets/LOL.png";
const STAR_ASSETS = ["assets/star1.png", "assets/star2.png"];

let trackingEnabled = false;
let sequenceStarted = false;

let leafSpawnInterval = null;
let lolSpawnInterval = null;
let starSpawnInterval = null;

const WELCOME_TEXTS = [
    "به افرا خوش اومدی!",
    "اینجا دفترچه خاطرات افراست",
    "چیزایی که دیدیم و خوندیم، اینجا جمع شده."
];
const PROMPT_TEXT = "حالا موست رو تکون بده!";
const WELCOME_STEP_MS = 2600;

const paperClickArea = document.getElementById("paperClickArea");

paperClickArea.addEventListener("click", function onPaperClick() {
    paperClickArea.removeEventListener("click", onPaperClick);
    paperClickArea.style.pointerEvents = "none";
    const hint = document.getElementById("clickHint");
    if (hint) hint.remove();

    paperVideo.play().catch(() => {});
    introAudio.play().catch(() => {});
});

paperVideo.addEventListener("ended", () => {
    paperVideo.pause();
    introScreen.classList.add("show");

    WELCOME_TEXTS.forEach((text, i) => {
        setTimeout(() => setTextFade(text), i * WELCOME_STEP_MS);
    });

    setTimeout(() => {
        setTextFade(PROMPT_TEXT);
        trackingEnabled = true;
    }, WELCOME_TEXTS.length * WELCOME_STEP_MS);
});

window.skipToMain = function () {
    stopLeafSpawn(true);
    stopLolSpawn();
    document.querySelectorAll(".leaf-fill").forEach((el) => el.remove());
    trackingEnabled = false;
    sequenceStarted = true;

    if (introLoopId) {
        clearInterval(introLoopId);
        introLoopId = null;
    }

    paperVideo.pause();
    paperVideo.classList.add("hidden");
    introScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
    mainScreen.classList.add("show");
};

const skipBtn = document.getElementById("skipIntroBtn");
if (skipBtn) {
    skipBtn.addEventListener("click", window.skipToMain);
}

let mouseSpeed = 0;
let progress = 0;
let lastMouseX = null, lastMouseY = null, lastMoveTime = null;
let currentStage = 0;
let introLoopId = null;

const SPEED_CAP = 2.2;
const SPEED_SMOOTHING = 0.5;
const SPEED_DECAY = 0.8;

const PROGRESS_PER_TICK_MAX = 1.4;

const STAGE_2_PERCENT = 30;
const STAGE_3_PERCENT = 65;
const STAGE_4_PERCENT = 100;

document.addEventListener("mousemove", (e) => {
    if (!trackingEnabled) return;

    const now = performance.now();

    if (lastMouseX !== null) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = Math.max(now - lastMoveTime, 1);
        let speed = dist / dt;

        speed = Math.min(speed, SPEED_CAP);

        mouseSpeed = mouseSpeed * (1 - SPEED_SMOOTHING) + speed * SPEED_SMOOTHING;
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMoveTime = now;

    if (!sequenceStarted) {
        sequenceStarted = true;
        startIntroLoop();
    }
});

function startIntroLoop() {
    startLeafSpawn(100, 3.2, 3);

    introLoopId = setInterval(() => {
        mouseSpeed *= SPEED_DECAY;
        if (mouseSpeed < 0.02) mouseSpeed = 0;

        const normalizedSpeed = mouseSpeed / SPEED_CAP;
        progress += normalizedSpeed * PROGRESS_PER_TICK_MAX;
        progress = Math.min(progress, 100);

        updateStage();
    }, 100);
}

function updateStage() {
    if (currentStage < 2 && progress >= STAGE_2_PERCENT) {
        currentStage = 2;
        introText.textContent = "سریع تر!!";
        introText.classList.add("fast");
        startLeafSpawn(60, 1.4, 3);
    }

    if (currentStage < 3 && progress >= STAGE_3_PERCENT) {
        currentStage = 3;
        stopLeafSpawn(false);
        speedUpExisting(0.45);
        introText.classList.remove("fast");
        introText.textContent = "یه موسم نمی‌تونی تکون بدی؟";
        document.getElementById("lolIcon").classList.remove("hidden");
        document.getElementById("titleImage").classList.add("hidden");
        startLolSpawn(90, 2.4, 4);
    }

    if (currentStage < 4 && progress >= STAGE_4_PERCENT) {
        currentStage = 4;
        clearInterval(introLoopId);
        introLoopId = null;
        runYavashSequence();
    }
}

function setTextFade(newText) {
    introText.style.opacity = 0;
    setTimeout(() => {
        introText.textContent = newText;
        introText.style.opacity = 1;
    }, 300);
}

function runYavashSequence() {
    if (!introAudioEnded) {
        if (stopAudio) {
            stopAudio.currentTime = 0;
            stopAudio.play().catch(() => {});
        }
        setTimeout(() => {
            introAudio.pause();
        }, 400);
    }

    stopLolSpawn();
    speedUpExisting(0.45);
    document.getElementById("lolIcon").classList.add("hidden");
    introText.textContent = "";

    const yavashImage = document.getElementById("yavashImage");
    yavashImage.classList.remove("hidden");

    setTimeout(() => setTextFade("یواش"), 1500);
    setTimeout(() => setTextFade("چرا انقدر با خشونت؟"), 4000);

    setTimeout(() => {
        setTextFade("باشه، رفتیم...");
    }, 6500);

    setTimeout(() => {
        yavashImage.classList.add("hidden");
        introText.textContent = "";
        trackingEnabled = false;
        runFinalStage();
    }, 9000);
}

function speedUpExisting(targetDurationSec) {
    leafContainer.querySelectorAll(".leaf-img").forEach((el) => {
        el.style.animationDuration = targetDurationSec + "s";
    });
}

function startLeafSpawn(intervalMs, durationSec, perTick = 1) {
    stopLeafSpawn(false);
    leafSpawnInterval = setInterval(() => {
        for (let i = 0; i < perTick; i++) {
            spawnFallingItem(LEAF_ASSETS, durationSec);
        }
    }, intervalMs);
}

function stopLeafSpawn(clearVisible) {
    if (leafSpawnInterval) {
        clearInterval(leafSpawnInterval);
        leafSpawnInterval = null;
    }
    if (clearVisible) {
        leafContainer.querySelectorAll(".leaf-img").forEach((el) => el.remove());
    }
}

function startLolSpawn(intervalMs, durationSec, perTick = 1) {
    stopLolSpawn();
    lolSpawnInterval = setInterval(() => {
        for (let i = 0; i < perTick; i++) {
            spawnFallingItem([LOL_ASSET], durationSec);
        }
    }, intervalMs);
}

function stopLolSpawn() {
    if (lolSpawnInterval) {
        clearInterval(lolSpawnInterval);
        lolSpawnInterval = null;
    }
}

function spawnFallingItem(assetList, durationSec) {
    const el = document.createElement("div");
    el.className = "leaf-img";
    const asset = assetList[Math.floor(Math.random() * assetList.length)];
    const size = 36 + Math.random() * 34;
    el.style.backgroundImage = `url(${asset})`;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = Math.random() * 100 + "vw";
    el.style.setProperty("--rot", (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 300) + "deg");
    el.style.animationDuration = durationSec + Math.random() * 1 + "s";
    leafContainer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}

function runFinalStage() {
    stopLolSpawn();
    speedUpExisting(0.45);
    introText.textContent = "";
    document.getElementById("lolIcon").classList.add("hidden");

    const tileSize = 55;

    const cols = Math.ceil(window.innerWidth / tileSize) + 3;
    const rows = Math.ceil(window.innerHeight / tileSize) + 3;

    const cells = [];
    for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
            cells.push({ r, c });
        }
    }
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const STAGGER_MS_IN = 3;
    const CHUNK_SIZE = 100;
    const spawnedLeaves = [];
    let cellIndex = 0;

    function buildChunk() {
        const fragment = document.createDocumentFragment();
        const end = Math.min(cellIndex + CHUNK_SIZE, cells.length);

        for (; cellIndex < end; cellIndex++) {
            const { r, c } = cells[cellIndex];
            const el = document.createElement("div");
            el.className = "leaf-fill";
            const asset = LEAF_ASSETS[Math.floor(Math.random() * LEAF_ASSETS.length)];
            const rowOffset = (r % 2 !== 0) ? tileSize / 2 : 0;
            const size = tileSize * (3.4 + Math.random() * 0.5);

            el.style.backgroundImage = `url(${asset})`;
            el.style.width = size + "px";
            el.style.height = size + "px";
            el.style.left = (c * tileSize - size / 2 + tileSize / 2 + rowOffset + (Math.random() * 6 - 3)) + "px";
            el.style.top = (r * tileSize - size / 2 + tileSize / 2 + (Math.random() * 6 - 3)) + "px";
            el.style.setProperty("--rot", (Math.random() * 60 - 30) + "deg");
            el.style.transitionDelay = (cellIndex * STAGGER_MS_IN) + "ms";
            el.style.willChange = "opacity, transform";

            fragment.appendChild(el);
            spawnedLeaves.push(el);
        }

        leafContainer.appendChild(fragment);

        if (cellIndex < cells.length) {
            requestAnimationFrame(buildChunk);
        } else {
            requestAnimationFrame(() => {
                spawnedLeaves.forEach((el) => el.classList.add("show"));
            });

            const fillDuration = cells.length * STAGGER_MS_IN + 700;
            setTimeout(() => {
                mainScreen.classList.remove("hidden");
                requestAnimationFrame(() => mainScreen.classList.add("show"));
                fadeOutLeaves(spawnedLeaves);
            }, fillDuration + 400);
        }
    }

    buildChunk();
}

function fadeOutLeaves(elements) {
    setTimeout(() => {
        startMainAudioSequence();
    }, 1000);

    const order = [...elements];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    const STAGGER_MS_OUT = 6;
    order.forEach((el, i) => {
        el.style.transitionDelay = (i * STAGGER_MS_OUT) + "ms";
    });

    requestAnimationFrame(() => {
        order.forEach((el) => el.classList.remove("show"));
    });

    order.forEach((el) => {
        el.addEventListener("transitionend", function handler() {
            el.removeEventListener("transitionend", handler);
            el.style.willChange = "auto";
            el.remove();
        });
    });

    const fadeDuration = order.length * STAGGER_MS_OUT + 700;
    setTimeout(goToMain, fadeDuration);
}

function goToMain() {
    introScreen.classList.remove("show");
    setTimeout(() => {
        introScreen.classList.add("hidden");
    }, 500);
}

function startMainAudioSequence() {
    firedCues = new Set();

    if (mainAudio) {
        mainAudio.currentTime = 0;
        mainAudio.addEventListener("timeupdate", onAudioTimeUpdate);
        mainAudio.play().catch(() => {});
    }
}

function onAudioTimeUpdate() {
    CUE_POINTS.forEach((cue, i) => {
        if (!firedCues.has(i) && mainAudio.currentTime >= cue.time) {
            firedCues.add(i);
            cue.fn();
        }
    });
}

function snapLetter(elId) {
    const el = document.getElementById(elId);
    if (!el) return;

    el.currentTime = 0;
    el.play().catch(() => {});
    el.classList.add("play");
}

function playSpaceImpact() {
    const spaceVideo = document.getElementById("spaceVideo");
    const mainContent = document.querySelector(".main-content");
    const flash = document.getElementById("impact-flash");

    if (!spaceVideo) return;

    spaceVideo.classList.remove("hidden");
    spaceVideo.classList.add("impact");

    setTimeout(() => {
        spaceVideo.classList.remove("impact");
        spaceVideo.classList.add("sway");

        const soulText = document.querySelector(".soul-text");
        if (soulText) {
            soulText.classList.add("reveal");

            soulText.addEventListener("animationend", function onSoulTextRevealed(e) {
                if (e.animationName !== "fadeSlideIn") return;
                soulText.removeEventListener("animationend", onSoulTextRevealed);
                playCornerItems();
            });
        }
    }, 1000);

    setTimeout(() => {
        if (mainContent) mainContent.classList.add("shake");
        if (flash) flash.classList.add("flash");

        setTimeout(() => {
            if (mainContent) mainContent.classList.remove("shake");
            if (flash) flash.classList.remove("flash");
        }, 500);
    }, 380);

    setTimeout(() => {
        startStarSpawn();
    }, 900);
}

function playCornerItems() {
    const booksWrap = document.querySelector(".corner-wrap.corner-left");
    const movieRollWrap = document.querySelector(".corner-wrap.corner-right");
    const books = document.getElementById("booksVideo");
    const movieRoll = document.getElementById("movieRollVideo");

    [{ wrap: booksWrap, video: books }, { wrap: movieRollWrap, video: movieRoll }].forEach(({ wrap, video }) => {
        if (!wrap || !video) return;
        video.currentTime = 0;
        video.play().catch(() => {});
        wrap.classList.add("play");
    });
}

function setupCornerHoverEffects() {
    const pairs = [
        { wrap: document.querySelector(".corner-wrap.corner-left"), video: document.getElementById("booksVideo") },
        { wrap: document.querySelector(".corner-wrap.corner-right"), video: document.getElementById("movieRollVideo") }
    ];

    pairs.forEach(({ wrap, video }) => {
        if (!wrap || !video) return;

        wrap.addEventListener("mouseenter", () => {
            video.pause();
        });

        wrap.addEventListener("mouseleave", () => {
            video.play().catch(() => {});
        });
    });
}

setupCornerHoverEffects();

function startStarSpawn() {
    stopStarSpawn();
    starSpawnInterval = setInterval(() => {
        spawnStar();
        spawnStar();
    }, 280);
}

function stopStarSpawn() {
    if (starSpawnInterval) {
        clearInterval(starSpawnInterval);
        starSpawnInterval = null;
    }
}

function spawnStar() {
    const starContainer = document.getElementById("star-container");
    if (!starContainer) return;

    const el = document.createElement("div");
    el.className = "star";
    const asset = STAR_ASSETS[Math.floor(Math.random() * STAR_ASSETS.length)];
    const size = 26 + Math.random() * 38;
    const duration = 1.6 + Math.random() * 1.4;

    el.style.backgroundImage = `url(${asset})`;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.left = Math.random() * 100 + "vw";
    el.style.top = Math.random() * 100 + "vh";
    el.style.animationDuration = duration + "s";

    starContainer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}


const CORNER_POP_ASSETS = ["assets/1.png", "assets/2.png", "assets/3.png", "assets/4.png"];

function spawnMovieRollPop() {
    const movieRollWrap = document.querySelector(".corner-wrap.corner-right");
    if (!movieRollWrap) return;

    const el = document.createElement("img");
    el.className = "float-pop";
    el.src = CORNER_POP_ASSETS[Math.floor(Math.random() * CORNER_POP_ASSETS.length)];
    movieRollWrap.appendChild(el);

    el.addEventListener("animationend", () => el.remove());
}

const movieRollWrap = document.querySelector(".corner-wrap.corner-right");
if (movieRollWrap) {
    movieRollWrap.addEventListener("click", spawnMovieRollPop);
}

const booksButton=document.querySelector(".corner-wrap.corner-left");
const iris=document.getElementById("iris-transition");

if(booksButton){

booksButton.addEventListener("click",()=>{
    if(mainAudio){
        fadeOutAudio(mainAudio,1200);
}

    const rect=booksButton.getBoundingClientRect();

    const x=rect.left+rect.width/2;
    const y=rect.top+rect.height/2;


    iris.style.setProperty("--x",x+"px");
    iris.style.setProperty("--y",y+"px");


    iris.classList.add("close");


    setTimeout(()=>{

        window.location.href="books.html";

    },1200);


});

}
