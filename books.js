window.addEventListener("DOMContentLoaded",()=>{

const title=document.getElementById("main-title");
const pageMain=document.getElementById("page2-main");
const books=[...document.querySelectorAll(".book-item")];
const loopAudio=document.getElementById("loopAudio");
const toBook=document.getElementById("to-book-transition");
const mainTransition=document.getElementById("main-transition");

const TITLE_START=2000;
const BOOK_STAGGER=200;
const LOOP_START=1;

let state="LIBRARY";
let activeBook=null;


function showBooks(){

    books.forEach((book,index)=>{

        setTimeout(()=>{

            book.classList.add("visible");

            const video=book.querySelector("video");

            if(video){

                video.currentTime=0;
                video.play().catch(()=>{});

            }

        },index*BOOK_STAGGER);

    });

}



function setupBooks(){

    books.forEach(book=>{

        const video=book.querySelector("video");


        if(video){

            video.addEventListener("ended",()=>{

                if(state==="LIBRARY"){

                    video.currentTime=LOOP_START;
                    video.play();

                }

            });


            book.addEventListener("mouseenter",()=>{

                if(state==="LIBRARY")
                    video.pause();

            });


            book.addEventListener("mouseleave",()=>{

                if(state==="LIBRARY")
                    video.play();

            });

        }


        book.addEventListener("click",()=>{

            if(state==="LIBRARY")
                selectBook(book);

        });


    });

}



function selectBook(book){

    state="SELECT_BOOK";

    activeBook=book;


    // بقیه‌ی کتاب‌ها خارج میشن
    books.forEach(item=>{

        if(item!==book){

            item.classList.add("exiting");

            const video=item.querySelector("video");

            if(video)
                video.pause();

        }

    });


    const rect=book.getBoundingClientRect();

    const video=book.querySelector("video");

    // ویدیوی لوپ کتاب انتخاب‌شده متوقف میشه
    if(video)
        video.pause();


    // محاسبه‌ی فاصله‌ی مرکز کتاب تا مرکز صفحه (تکنیک FLIP)
    const centerX=window.innerWidth/2;
    const centerY=window.innerHeight/2;

    const bookCenterX=rect.left+rect.width/2;
    const bookCenterY=rect.top+rect.height/2;

    const deltaX=bookCenterX-centerX;
    const deltaY=bookCenterY-centerY;


    // تبدیل کتاب اصلی به position:fixed با top/left همیشه ثابت روی
    // وسط صفحه؛ موقعیت واقعیش با transform شبیه‌سازی میشه تا
    // انیمیشن همیشه دقیقاً از جای خودش شروع بشه
    book.style.position="fixed";
    book.style.top="50%";
    book.style.left="50%";
    book.style.width=rect.width+"px";
    book.style.height=rect.height+"px";
    book.style.margin="0";
    book.style.zIndex="100";

    book.style.transition="none";

    book.style.transform=
    `translate(-50%,-50%) translate(${deltaX}px,${deltaY}px) scale(1)`;


    book.classList.add("selected");


    // اجبار به reflow تا مرورگر موقعیت اولیه (بدون ترنزیشن) رو حتماً commit کنه
    void book.offsetHeight;


    requestAnimationFrame(()=>{

        requestAnimationFrame(()=>{

            book.style.transition=
            "transform .8s cubic-bezier(.65,0,.35,1)";

            book.style.transform=
            "translate(-50%,-50%) scale(1.35)";

        });

    });


    setTimeout(()=>{

        playToBook(book);

    },900);


}



function playToBook(book){

    state="BOOK_TRANSITION";

    const video=book.querySelector("video");

    if(video)
        video.play().catch(()=>{});


    toBook.style.opacity="1";
    toBook.currentTime=0;

    let backgroundDone=false;
    let transitionFinished=false;


    function finishTransition(){

        if(transitionFinished)
            return;

        transitionFinished=true;


        toBook.style.opacity="0";

        toBook.ontimeupdate=null;
        toBook.onended=null;
        toBook.onerror=null;


        if(video)
            video.pause();


        state="BOOK_PAGE";


        book.classList.remove("selected");
        book.classList.add("book-page");


        
        const targetLeftPercent=20;

        const targetCenterX=
        (targetLeftPercent/100)*window.innerWidth;

        const deltaX=
        targetCenterX-window.innerWidth/2;


        book.style.transition=
        "transform .8s ease";


        requestAnimationFrame(()=>{

            book.style.transform=
            `translate(-50%,-50%) translate(${deltaX}px,0px) rotate(-10deg) scale(1.65)`;

        });


        book.onclick=()=>{

            returnToLibrary();

        };

    }


    toBook.play().catch(()=>{

        finishTransition();

    });


    toBook.ontimeupdate=()=>{

        if(
            !backgroundDone &&
            toBook.duration &&
            toBook.currentTime>=toBook.duration-0.5
        ){

            pageMain.style.backgroundImage=
            "url('images/bookback3.jpg')";

            backgroundDone=true;

        }

    };


    toBook.onended=finishTransition;

    toBook.onerror=()=>{

        finishTransition();

    };


    setTimeout(()=>{

        if(!transitionFinished)
            finishTransition();

    },3000);


}



function returnToLibrary(){

    if(state!=="BOOK_PAGE")
        return;

    state="RETURN_TRANSITION";


    if(activeBook)
        activeBook.onclick=null;


    const transitions=[

        "transitions/to_main2.mp4",
        "transitions/to_main3.mp4"

    ];


    mainTransition.src=
    transitions[
        Math.floor(Math.random()*transitions.length)
    ];


    mainTransition.load();

    mainTransition.style.opacity="1";
    mainTransition.currentTime=0;

    mainTransition.play().catch(()=>{});


    let mainTransitionFinished=false;


    function finishReturn(){

        if(mainTransitionFinished)
            return;

        mainTransitionFinished=true;


        mainTransition.style.opacity="0";

        mainTransition.onended=null;
        mainTransition.onerror=null;


        pageMain.style.backgroundImage=
        "url('images/boneback.png')";


        // ریست کامل همه‌ی کتاب‌ها به حالت اولیه‌ی کتابخانه
        books.forEach(b=>{

            b.classList.remove(
                "visible",
                "exiting",
                "selected",
                "book-page"
            );

            // پاک کردن تمام استایل‌های inline که موقع انتخاب اضافه شده بودن
            b.style.cssText="";

            b.onclick=null;


            const video=b.querySelector("video");

            if(video){

                video.pause();
                video.currentTime=0;

            }

        });


        activeBook=null;

        state="LIBRARY";


        setTimeout(()=>{

            showBooks();

        },500);

    }


    mainTransition.onended=finishReturn;

    mainTransition.onerror=()=>{

        finishReturn();

    };


    setTimeout(()=>{

        if(!mainTransitionFinished)
            finishReturn();

    },3000);


}




setupBooks();


title.style.opacity="0";


setTimeout(()=>{

    title.style.opacity="1";


    title.onended=()=>{

        title.style.opacity="0";


        setTimeout(()=>{

            showBooks();

        },800);

    };


    title.play().catch(()=>{});


},TITLE_START);


});

window.addEventListener("DOMContentLoaded",()=>{

const iris=document.getElementById("iris-transition");
const loopAudio=document.getElementById("loopAudio");


function startAudio(){

    if(loopAudio && loopAudio.paused){

        loopAudio.currentTime=0;
        loopAudio.play().catch(()=>{});

    }

}


if(iris){

    if(loopAudio){

        loopAudio.currentTime=0;

        const playPromise=loopAudio.play();

        if(playPromise!==undefined){

            playPromise.catch(()=>{

                const resume=()=>{

                    startAudio();

                    document.removeEventListener("click",resume);
                    document.removeEventListener("touchstart",resume);
                    document.removeEventListener("keydown",resume);

                };


                document.addEventListener("click",resume,{once:true});
                document.addEventListener("touchstart",resume,{once:true});
                document.addEventListener("keydown",resume,{once:true});

            });

        }

    }


    requestAnimationFrame(()=>{

        iris.classList.add("open");

    });

}

});