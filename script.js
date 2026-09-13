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

// بدون هیچ آستانه‌ی زمانی: همین که موس تکون بخوره، اتفاق میفته
document.addEventListener("mousemove", () => {
    if (!trackingEnabled) return;

    if (!sequenceStarted) {
        sequenceStarted = true;
        runIntroSequence();
    }
});

function runIntroSequence() {
    // ریزش برگ با تراکم بالا (سرعت عادی)
    startLeafSpawn(100, 3.2, 3);

    setTimeout(() => {
        introText.textContent = "سریع تر!!";
        introText.classList.add("fast");
    }, 3000);

    setTimeout(() => {
        startLeafSpawn(60, 1.4, 3); // تراکم بیشتر و سریع‌تر
    }, 5000);

    setTimeout(() => {
        // به‌جای حذف، برگ‌های روی صفحه رو سریع می‌ریزونیم پایین
        stopLeafSpawn(false);
        speedUpExisting(0.45);

        introText.classList.remove("fast");
        introText.textContent = "یه موسم نمی‌تونی تکون بدی؟";
        document.getElementById("lolIcon").classList.remove("hidden");
        document.getElementById("titleImage").classList.add("hidden");
        startLolSpawn(90, 2.4, 4); // تراکم خیلی بیشتر

        // یه فاصله‌ی حداقلی تا LOL حتماً چند لحظه دیده بشه، بعد میره سراغ مرحله‌ی YAVASH
        setTimeout(() => {
            runYavashSequence();
        }, 3500);
    }, 8000);
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

// مرحله‌ی نهایی: گرید متراکم و هم‌پوشان که کل صفحه رو بدون جای خالی می‌پوشونه
function runFinalStage() {
    stopLolSpawn();
    speedUpExisting(0.45); // هرچی روی صفحه‌ست (برگ یا LOL) سریع می‌ریزه پایین، نه حذف ناگهانی
    introText.textContent = "";
    document.getElementById("lolIcon").classList.add("hidden");

    const tileSize = 40; // ریزتر شد = تراکم بیشتر
    const cols = Math.ceil(window.innerWidth / tileSize) + 2;
    const rows = Math.ceil(window.innerHeight / tileSize) + 2;

    let index = 0;
    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({ r, c });
        }
    }
    // به‌هم‌ریختن ترتیب پر شدن خونه‌ها برای جلوه‌ی طبیعی‌تر
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const spawnedLeaves = [];

    cells.forEach(({ r, c }) => {
        const delay = index * 2; // میلی‌ثانیه، خیلی سریع پر می‌شه
        setTimeout(() => {
            // هر خونه دو تا برگ همپوشان می‌گیره تا حتی با فرم نامنظم برگ‌ها هم جای خالی نمونه
            for (let k = 0; k < 2; k++) {
                const el = document.createElement("div");
                el.className = "leaf-fill";
                const asset = LEAF_ASSETS[Math.floor(Math.random() * LEAF_ASSETS.length)];
                // سایز خیلی بزرگ‌تر از خونه‌ی گرید تا هم‌پوشانی شدید بشه
                const size = tileSize * (2.1 + Math.random() * 0.6);
                el.style.backgroundImage = `url(${asset})`;
                el.style.width = size + "px";
                el.style.height = size + "px";
                el.style.left = (c * tileSize - tileSize / 2 + (Math.random() * 12 - 6)) + "px";
                el.style.top = (r * tileSize - tileSize / 2 + (Math.random() * 12 - 6)) + "px";
                el.style.setProperty("--rot", (Math.random() * 60 - 30) + "deg");
                leafContainer.appendChild(el);
                spawnedLeaves.push(el);
                requestAnimationFrame(() => el.classList.add("show"));
            }
        }, delay);
        index++;
    });

    const fillDuration = cells.length * 2 + 500;

    // بعد از پر شدن کامل صفحه: همینجا بک‌گراند جدید پشت برگ‌ها فعال می‌شه
    // (چون صفحه کاملاً پوشیده‌ست، دیده نمی‌شه) و بعد محو شدن تدریجی شروع می‌شه
    setTimeout(() => {
        mainScreen.classList.remove("hidden");
        requestAnimationFrame(() => mainScreen.classList.add("show"));
        fadeOutLeaves(spawnedLeaves);
    }, fillDuration + 400);
}

// محو کردن پلکانی برگ‌ها به ترتیب تصادفی، دقیقاً برعکس روندی که ظاهر شدن
function fadeOutLeaves(elements) {
    // یک ثانیه بعد از شروعِ محو شدن برگ‌ها، صدا و انیمیشن حروف/space هماهنگ باهاش شروع می‌شن
    setTimeout(() => {
        startMainAudioSequence();
    }, 1000);

    const order = [...elements];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    order.forEach((el, i) => {
        const delay = i * 2; // همون سرعت پلکانیِ ظاهر شدن
        setTimeout(() => {
            el.classList.remove("show");
            setTimeout(() => el.remove(), 300); // بعد از اتمام ترنزیشن از DOM حذف بشه
        }, delay);
    });

    const fadeDuration = order.length * 2 + 400;
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
        if (soulText) soulText.classList.add("reveal");
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