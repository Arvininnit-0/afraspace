const paperVideo = document.getElementById("paper-video");
const introScreen = document.getElementById("intro-screen");
const mainScreen = document.getElementById("main-screen");
const introText = document.getElementById("introText");
const leafContainer = document.getElementById("leaf-container");
const mainAudio = document.getElementById("mainAudio");

const AUDIO_FPS = 25;

function tcToSeconds(h, m, s, f) {
    return h * 3600 + m * 60 + s + f / AUDIO_FPS;
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

const WELCOME_TEXT = "به افرا خوش اومدی!";
const PROMPT_TEXT = "موس رو تکون بده!";
const WELCOME_DURATION_MS = 2200; // کوتاه‌تر شد

paperVideo.addEventListener("ended", () => {
    paperVideo.pause();
    introScreen.classList.add("show");
    setTextFade(WELCOME_TEXT);
    // در این مرحله موس هنوز غیرفعاله

    setTimeout(() => {
        setTextFade(PROMPT_TEXT);
        trackingEnabled = true; // از همینجا اولین حرکت موس، مرحله رو شروع می‌کنه
    }, WELCOME_DURATION_MS);
});

// برای تست سریع: روی دکمه‌ی "رد کردن اینترو" کلیک کن
// هر لحظه از اینترو که باشی، مستقیم میره رو صفحه‌ی اصلی
// نکته: این فقط تا قبل از انیمیشن حروف میره، انیمیشن حروف و مراحل بعدش رو صدا نمی‌زنه
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
    // عمداً revealLetters() اینجا صدا زده نمی‌شه
};

const skipBtn = document.getElementById("skipIntroBtn");
if (skipBtn) {
    skipBtn.addEventListener("click", window.skipToMain);
}

const startBtn = document.getElementById("startBtn");
if (startBtn) {
    startBtn.addEventListener("click", () => {
        if (mainAudio) {
            mainAudio.play().then(() => {
                mainAudio.pause();
                mainAudio.currentTime = 0;
            }).catch(() => {});
        }
        startBtn.classList.remove("show");
    });
}

/* ---------------------------------------------------
   منطق حرکت‌محور موس: پیشرفت درصدی (0 تا 100) که فقط
   با حرکت مداوم و پیوسته بالا می‌ره، نه با یه تکون آنی
--------------------------------------------------- */

let mouseSpeed = 0;         // سرعت لحظه‌ای صاف‌شده‌ی موس (بعد از clamp)
let progress = 0;           // درصد پیشرفت، بین 0 تا 100
let lastMouseX = null, lastMouseY = null, lastMoveTime = null;
let currentStage = 0;       // 0: شروع نشده، 2: متن سریع‌تر، 3: مرحله‌ی LOL، 4: یواش
let introLoopId = null;

// سقف سرعت: هر تکونی سریع‌تر از این باشه، همینقدر حساب می‌شه (نه بیشتر)
const SPEED_CAP = 2.2;          // پیکسل بر میلی‌ثانیه
const SPEED_SMOOTHING = 0.5;    // چقدر سرعت جدید با قدیم میکس بشه (0 تا 1)
const SPEED_DECAY = 0.8;        // هر تیک، سرعت ثبت‌شده چقدر افت کنه اگه موس تکون نخوره

// حداکثر درصدی که حتی با بیشترین سرعت ممکن، در هر تیک (100ms) اضافه می‌شه
// یعنی برای پر شدن کامل (100%) با سرعت ثابت و پیوسته، حداقل باید:
// 100 / PROGRESS_PER_TICK_MAX تیک بگذره = (100/1.4)*100ms ≈ 7.1 ثانیه حرکت مداوم
const PROGRESS_PER_TICK_MAX = 1.4;

// آستانه‌های درصدی برای هر مرحله (از 0 تا 100)
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
        let speed = dist / dt; // پیکسل بر میلی‌ثانیه

        speed = Math.min(speed, SPEED_CAP); // سقف زدن، تا یه تکون تند بی‌نهایت بزرگ نشه

        // صاف کردن (smoothing) به‌جای جمع خام، تا نوسان‌های لحظه‌ای اثر کمتری بذارن
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
    startLeafSpawn(100, 3.2, 3); // ریزش برگ همون اول شروع می‌شه

    introLoopId = setInterval(() => {
        // اگه موس تکون نخوره، سرعت ثبت‌شده به‌سرعت افت می‌کنه و progress دیگه بالا نمی‌ره
        mouseSpeed *= SPEED_DECAY;
        if (mouseSpeed < 0.02) mouseSpeed = 0;

        // نرمالایز بین 0 و 1، بعد ضرب در حداکثر مجاز هر تیک
        const normalizedSpeed = mouseSpeed / SPEED_CAP; // بین 0 تا 1
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

// تغییر متن با محو شدن نرم (fade out قدیمی، fade in جدید)
function setTextFade(newText) {
    introText.style.opacity = 0;
    setTimeout(() => {
        introText.textContent = newText;
        introText.style.opacity = 1;
    }, 300);
}

// مرحله‌ی جدید: عکس YAVASH میاد، بعد چند تا متن پشت‌سرهم زیرش نشون داده می‌شه
// و در نهایت خودکار می‌ره سراغ مرحله‌ی آخر (پر شدن کامل صفحه از برگ)
function runYavashSequence() {
    stopLolSpawn();
    speedUpExisting(0.45); // هرچی روی صفحه‌ست سریع می‌ریزه پایین
    document.getElementById("lolIcon").classList.add("hidden");
    introText.textContent = "";

    const yavashImage = document.getElementById("yavashImage");
    yavashImage.classList.remove("hidden");

    setTimeout(() => setTextFade("یواش"), 1500);
    setTimeout(() => setTextFade("چرا انقدر با خشونت؟"), 4000);

    setTimeout(() => {
        introText.style.opacity = 0;
        setTimeout(() => {
            introText.textContent = "";
            const startBtn = document.getElementById("startBtn");
            if (startBtn) startBtn.classList.add("show");
        }, 300);
    }, 6500);

    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
        startBtn.addEventListener("click", function onStartClick() {
            startBtn.removeEventListener("click", onStartClick);
            startBtn.classList.remove("show");
            yavashImage.classList.add("hidden");
            introText.textContent = "";
            trackingEnabled = false;
            runFinalStage();
        });
    }
}

// سرعت‌بخشی به عناصر در حال سقوطِ فعلی، به‌جای حذف ناگهانی‌شون
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
            el.style.willChange = "opacity, transform"; // اینجا، همون لحظه‌ی ساخت، نه بعداً یه‌جا

            fragment.appendChild(el);
            spawnedLeaves.push(el);
        }

        leafContainer.appendChild(fragment);

        if (cellIndex < cells.length) {
            requestAnimationFrame(buildChunk);
        } else {
            // دیگه نیازی به فوروچ جدا برای will-change نیست، چون بالا انجام شد
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

    const STAGGER_MS_OUT = 6; // از 2 به 6 → پخش‌شدگی بیشتر بین محو شدن‌ها
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

// حروف a-f-r-a2 و عکس space، هر کدوم دقیقاً روی تایم‌استمپ خودشون تو فایل صوتی، با تکیه بر currentTime واقعیِ صدا (نه setTimeout) شلیک می‌شن
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

// حرف رو سریع (snap) دقیقاً همون لحظه می‌بره سرجای خودش
function snapLetter(elId) {
    const el = document.getElementById(elId);
    if (!el) return;

    el.currentTime = 0;
    el.play().catch(() => {});
    el.classList.add("play");
}

// ویدیوی space از بالا میاد و طوری فرود میاد که انگار کوبیده شده رو صفحه
// (overshoot در سایز + لرزش صفحه + فلاش سفید لحظه‌ی برخورد)
// بعدش ستاره‌ها دور صفحه شروع به چشمک زدن می‌کنن
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

            // بعد از تموم شدن کامل انیمیشن متن، برو سراغ books و movieroll
            soulText.addEventListener("animationend", function onSoulTextRevealed(e) {
                if (e.animationName !== "fadeSlideIn") return; // فقط برای همین انیمیشن خاص
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
