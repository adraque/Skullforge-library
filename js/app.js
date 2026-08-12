let releases=[],models=[];
const searchInput=document.querySelector('#search');
const yearFilter=document.querySelector('#year-filter');
const results=document.querySelector('#results');
const status=document.querySelector('#status');
const template=document.querySelector('#release-card-template');

async function loadJson(path){
  const r=await fetch(path,{cache:'no-store'});
  if(!r.ok)throw new Error(`Could not load ${path}`);
  return r.json();
}
function modelsForRelease(id){return models.filter(m=>m.release_id===id);}
function searchableText(r){
  return [r.title,r.release_month,...modelsForRelease(r.id).flatMap(m=>[m.name,m.name_raw,...(m.tags||[])])]
    .filter(Boolean).join(' ').toLowerCase();
}

let lightbox,lightboxImage,lightboxCaption;
function ensureLightbox(){
  if(lightbox)return;
  lightbox=document.createElement('div');
  lightbox.className='image-lightbox';
  lightbox.hidden=true;

  const dialog=document.createElement('div');
  dialog.className='image-lightbox-dialog';

  const close=document.createElement('button');
  close.className='image-lightbox-close';
  close.type='button';
  close.textContent='×';
  close.setAttribute('aria-label','Close image');

  lightboxImage=document.createElement('img');
  lightboxImage.className='image-lightbox-image';

  lightboxCaption=document.createElement('div');
  lightboxCaption.className='image-lightbox-caption';

  close.onclick=closeLightbox;
  dialog.append(close,lightboxImage,lightboxCaption);
  lightbox.appendChild(dialog);
  document.body.appendChild(lightbox);

  lightbox.onclick=e=>{if(e.target===lightbox)closeLightbox();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lightbox.hidden)closeLightbox();});
}
function openLightbox(src,caption){
  ensureLightbox();
  lightboxImage.src=src;
  lightboxImage.alt=caption||'Skullforge release image';
  lightboxCaption.textContent=caption||'';
  lightbox.hidden=false;
  document.body.classList.add('lightbox-open');
}
function closeLightbox(){
  if(!lightbox)return;
  lightbox.hidden=true;
  lightboxImage.removeAttribute('src');
  document.body.classList.remove('lightbox-open');
}

function makeCarousel(wrap,release){
  wrap.replaceChildren();
  wrap.classList.add('carousel');

  const all=Array.isArray(release.images)?release.images:[];
  const cover=release.cover_image||all[0]||release.image;
  let paths=[...all];
  if(cover)paths=[cover,...paths.filter(x=>x!==cover)];

  if(!paths.length){
    const e=document.createElement('div');
    e.className='image-placeholder';
    e.textContent='No preview image';
    wrap.appendChild(e);
    return;
  }

  let index=0;
  const viewport=document.createElement('div');
  viewport.className='carousel-viewport';

  const slides=paths.map((path,i)=>{
    const slide=document.createElement('button');
    slide.className='carousel-slide';
    slide.type='button';
    slide.setAttribute('aria-label',`Open image ${i+1} larger`);

    const img=document.createElement('img');
    img.className='carousel-image';
    img.src=path;
    img.alt=`${release.title} image ${i+1} of ${paths.length}`;
    img.loading='eager';
    img.decoding='async';

    slide.onclick=()=>openLightbox(path,`${release.title} — image ${i+1} of ${paths.length}`);
    slide.appendChild(img);
    viewport.appendChild(slide);
    return slide;
  });

  const prev=document.createElement('button');
  prev.className='carousel-arrow carousel-prev';
  prev.type='button'; prev.textContent='‹';

  const next=document.createElement('button');
  next.className='carousel-arrow carousel-next';
  next.type='button'; next.textContent='›';

  const dots=document.createElement('div');
  dots.className='carousel-dots';

  const dotButtons=paths.map((_,i)=>{
    const d=document.createElement('button');
    d.type='button';
    d.className='carousel-dot';
    d.setAttribute('aria-label',`Show image ${i+1}`);
    d.onclick=()=>{index=i;update();};
    dots.appendChild(d);
    return d;
  });

  function update(){
    slides.forEach((s,i)=>{s.hidden=i!==index;s.classList.toggle('active',i===index);});
    dotButtons.forEach((d,i)=>d.classList.toggle('active',i===index));
    prev.hidden=paths.length<2;
    next.hidden=paths.length<2;
  }

  prev.onclick=e=>{e.stopPropagation();index=(index-1+paths.length)%paths.length;update();};
  next.onclick=e=>{e.stopPropagation();index=(index+1)%paths.length;update();};

  viewport.append(prev,next);
  wrap.append(viewport,dots);
  update();
}

function render(){
  const q=searchInput.value.trim().toLowerCase(),y=yearFilter.value;
  const filtered=releases
    .filter(r=>(!y||String(r.release_month).startsWith(y))&&(!q||searchableText(r).includes(q)))
    .sort((a,b)=>String(b.release_month).localeCompare(String(a.release_month)));

  results.replaceChildren();
  status.textContent=`${filtered.length} release${filtered.length===1?'':'s'} shown`;

  filtered.forEach(r=>{
    const node=template.content.cloneNode(true);
    const machine=node.querySelector('.month');
    if(machine)machine.hidden=true;

    node.querySelector('.title').textContent=r.title||r.release_month;
    makeCarousel(node.querySelector('.image-wrap'),r);

    const tags=node.querySelector('.models');
    modelsForRelease(r.id).forEach(m=>{
      if(m.store_url){
        const a=document.createElement('a');
        a.className='model-tag model-link';
        a.textContent=m.name;
        a.href=m.store_url;
        a.target='_blank';
        a.rel='noopener noreferrer';
        tags.appendChild(a);
      }else{
        const s=document.createElement('span');
        s.className='model-tag';
        s.textContent=m.name;
        tags.appendChild(s);
      }
    });

    const old=node.querySelector('.post-link');
    if(old)old.remove();

    results.appendChild(node);
  });
}

async function init(){
  [releases,models]=await Promise.all([loadJson('data/releases.json'),loadJson('data/models.json')]);
  [...new Set(releases.map(r=>String(r.release_month||'').slice(0,4)).filter(y=>/^20\d{2}$/.test(y)))]
    .sort().reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;yearFilter.appendChild(o);});
  ensureLightbox();
  render();
}

searchInput.addEventListener('input',render);
yearFilter.addEventListener('change',render);
init().catch(e=>{console.error(e);status.textContent=`Catalog failed to load: ${e.message}`;});

/* Skullforge uniform card carousel + navigable lightbox patch */
(() => {
  "use strict";

  if (window.__SFS_CARD_LIGHTBOX_PATCH__) return;
  window.__SFS_CARD_LIGHTBOX_PATCH__ = true;

  const MONTH_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}$/i;

  function findMonthHeading(card) {
    return [...card.querySelectorAll("h1,h2,h3,h4,strong")]
      .find(el => MONTH_RE.test((el.textContent || "").trim()));
  }

  function likelyMonthCard(node) {
    let el = node;
    while (el && el !== document.body) {
      if (findMonthHeading(el) && el.querySelector("img")) return el;
      el = el.parentElement;
    }
    return null;
  }

  function getCardImages(card) {
    const seen = new Set();

    return [...card.querySelectorAll("img")].filter(img => {
      const src = img.currentSrc || img.src || "";
      if (!src) return false;

      const low = ((img.alt || "") + " " + src).toLowerCase();
      if (/(icon|logo|avatar|emoji|favicon)/.test(low)) return false;
      if (seen.has(src)) return false;

      seen.add(src);
      return true;
    });
  }

  function findPrimaryMediaRegion(card) {
    const images = getCardImages(card);
    if (!images.length) return null;

    let node = images[0].parentElement;
    let best = node;

    while (node && node !== card) {
      if (node.querySelectorAll("img").length >= 1 && !findMonthHeading(node)) {
        best = node;
      }
      node = node.parentElement;
    }

    return best;
  }

  function findDotRow(card) {
    return [...card.querySelectorAll("div,nav,ol,ul")].find(row => {
      const children = [...row.children];
      if (children.length < 2) return false;

      const dotLike = children.filter(child => {
        const rect = child.getBoundingClientRect();
        const txt = (child.textContent || "").trim();
        const aria = child.getAttribute("aria-label") || "";

        return (
          (txt.length <= 2 && rect.width <= 28 && rect.height <= 28) ||
          /slide|image/i.test(aria)
        );
      });

      return dotLike.length >= 2 && dotLike.length >= children.length * 0.6;
    }) || null;
  }

  function normalizeCards() {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(el => MONTH_RE.test((el.textContent || "").trim()));

    const cards = new Set();

    headings.forEach(heading => {
      const card = likelyMonthCard(heading);
      if (card) cards.add(card);
    });

    cards.forEach(card => {
      card.classList.add("sfs-uniform-card");

      const media = findPrimaryMediaRegion(card);
      if (media) media.classList.add("sfs-carousel-viewport");

      const dots = findDotRow(card);
      if (dots) {
        dots.classList.add("sfs-dot-row");
        const count = dots.children.length;
        dots.classList.toggle("sfs-dots-medium", count >= 10 && count < 16);
        dots.classList.toggle("sfs-dots-dense", count >= 16);
      }
    });
  }

  let currentImages = [];
  let currentIndex = 0;
  let touchStartX = null;

  const lightbox = document.createElement("div");
  lightbox.className = "sfs-lightbox";
  lightbox.setAttribute("aria-hidden", "true");

  lightbox.innerHTML = `
    <div class="sfs-lightbox__stage" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button type="button" class="sfs-lightbox__close" aria-label="Close image viewer">×</button>
      <button type="button" class="sfs-lightbox__nav sfs-lightbox__prev" aria-label="Previous image">‹</button>
      <img class="sfs-lightbox__image" alt="">
      <button type="button" class="sfs-lightbox__nav sfs-lightbox__next" aria-label="Next image">›</button>
      <div class="sfs-lightbox__caption"></div>
      <div class="sfs-lightbox__counter"></div>
    </div>
  `;

  document.body.appendChild(lightbox);

  const stage = lightbox.querySelector(".sfs-lightbox__stage");
  const imageEl = lightbox.querySelector(".sfs-lightbox__image");
  const closeBtn = lightbox.querySelector(".sfs-lightbox__close");
  const prevBtn = lightbox.querySelector(".sfs-lightbox__prev");
  const nextBtn = lightbox.querySelector(".sfs-lightbox__next");
  const counter = lightbox.querySelector(".sfs-lightbox__counter");
  const caption = lightbox.querySelector(".sfs-lightbox__caption");

  function renderLightbox() {
    if (!currentImages.length) return;

    currentIndex = (currentIndex + currentImages.length) % currentImages.length;

    const sourceImg = currentImages[currentIndex];
    imageEl.src = sourceImg.currentSrc || sourceImg.src;
    imageEl.alt = sourceImg.alt || "";
    caption.textContent = sourceImg.alt || sourceImg.getAttribute("title") || "";
    counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

    const showNav = currentImages.length > 1;
    prevBtn.style.display = showNav ? "" : "none";
    nextBtn.style.display = showNav ? "" : "none";
  }

  function openLightbox(card, clickedImg) {
    currentImages = getCardImages(card);
    if (!currentImages.length) return;

    const clickedSrc = clickedImg.currentSrc || clickedImg.src;
    const idx = currentImages.findIndex(img => (img.currentSrc || img.src) === clickedSrc);
    currentIndex = idx >= 0 ? idx : 0;

    renderLightbox();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("sfs-lightbox-open");
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sfs-lightbox-open");
    imageEl.removeAttribute("src");
    currentImages = [];
    currentIndex = 0;
  }

  function nextImage() {
    if (currentImages.length < 2) return;
    currentIndex += 1;
    renderLightbox();
  }

  function prevImage() {
    if (currentImages.length < 2) return;
    currentIndex -= 1;
    renderLightbox();
  }

  closeBtn.addEventListener("click", closeLightbox);
  nextBtn.addEventListener("click", nextImage);
  prevBtn.addEventListener("click", prevImage);

  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });

  stage.addEventListener("touchstart", event => {
    if (!event.touches.length) return;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  stage.addEventListener("touchend", event => {
    if (touchStartX === null || !event.changedTouches.length) return;

    const delta = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;

    if (Math.abs(delta) < 45) return;
    delta < 0 ? nextImage() : prevImage();
  }, { passive: true });

  document.addEventListener("keydown", event => {
    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nextImage();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prevImage();
    }
  });

  document.addEventListener("click", event => {
    const img = event.target.closest("img");
    if (!img || lightbox.contains(img)) return;

    const card = likelyMonthCard(img);
    if (!card) return;

    const images = getCardImages(card);
    if (!images.includes(img)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openLightbox(card, img);
  }, true);

  let timer = null;

  function scheduleNormalize() {
    clearTimeout(timer);
    timer = setTimeout(normalizeCards, 80);
  }

  new MutationObserver(scheduleNormalize).observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("resize", scheduleNormalize);
  scheduleNormalize();
})();

/* Skullforge FORCE uniform month-card media sizing */
(() => {
  "use strict";

  if (window.__SFS_FORCE_UNIFORM_CARDS__) return;
  window.__SFS_FORCE_UNIFORM_CARDS__ = true;

  const MONTH_RE =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}$/i;

  function monthHeadingsWithin(el) {
    return [...el.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(h => MONTH_RE.test((h.textContent || "").trim()));
  }

  function cardForHeading(heading) {
    let node = heading.parentElement;
    let best = null;

    while (node && node !== document.body) {
      const monthHeadings = monthHeadingsWithin(node);
      const images = node.querySelectorAll("img");

      // The correct card should contain this one month heading,
      // at least one image, and should NOT contain multiple month headings.
      if (monthHeadings.length === 1 && images.length >= 1) {
        best = node;
      }

      // Once we hit an ancestor with multiple month headings, we've reached
      // the grid/list container, so stop climbing.
      if (monthHeadings.length > 1) break;

      node = node.parentElement;
    }

    return best;
  }

  function mediaContainerForCard(card, heading) {
    const imgs = [...card.querySelectorAll("img")];
    if (!imgs.length) return null;

    const first = imgs[0];
    let node = first.parentElement;
    let best = first.parentElement;

    while (node && node !== card) {
      // Keep climbing while this region contains images but NOT the month heading.
      if (node.contains(first) && !node.contains(heading)) {
        best = node;
      }
      node = node.parentElement;
    }

    return best;
  }

  function normalizeOne(card, heading) {
    const media = mediaContainerForCard(card, heading);
    if (!media) return;

    card.classList.add("sfs-force-month-card");
    media.classList.add("sfs-force-media");

    // Use the actual rendered card width so every month image area is square.
    // Subtract a tiny amount for borders/padding to prevent overflow.
    const width = Math.max(
      220,
      Math.round(card.getBoundingClientRect().width - 2)
    );

    card.style.setProperty("--sfs-card-media-height", `${width}px`);
    media.style.setProperty("--sfs-card-media-height", `${width}px`);

    [...media.querySelectorAll("img")].forEach(img => {
      img.style.width = "100%";
      img.style.height = `${width}px`;
      img.style.minHeight = `${width}px`;
      img.style.maxHeight = `${width}px`;
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
      img.style.display = "block";
    });
  }

  function normalizeAll() {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(h => MONTH_RE.test((h.textContent || "").trim()));

    headings.forEach(heading => {
      const card = cardForHeading(heading);
      if (card) normalizeOne(card, heading);
    });
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(normalizeAll, 60);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "src"]
  });

  window.addEventListener("resize", schedule);

  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);

  // Run several times because the release cards/images are populated asynchronously.
  schedule();
  setTimeout(normalizeAll, 300);
  setTimeout(normalizeAll, 900);
  setTimeout(normalizeAll, 1800);
})();

/* Skullforge LARGE carousel viewport + arrow repair */
(() => {
  "use strict";

  if (window.__SFS_LARGE_CAROUSEL_REPAIR__) return;
  window.__SFS_LARGE_CAROUSEL_REPAIR__ = true;

  const MONTH_RE =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}$/i;

  function monthHeadings(el) {
    return [...el.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(h => MONTH_RE.test((h.textContent || "").trim()));
  }

  function findCard(heading) {
    let node = heading.parentElement;
    let best = null;

    while (node && node !== document.body) {
      const months = monthHeadings(node);
      const images = node.querySelectorAll("img");

      if (months.length === 1 && images.length >= 1) {
        best = node;
      }

      if (months.length > 1) break;
      node = node.parentElement;
    }

    return best;
  }

  function findCarousel(card, heading) {
    const images = [...card.querySelectorAll("img")];
    if (!images.length) return null;

    const firstImage = images[0];
    let node = firstImage.parentElement;
    let best = firstImage.parentElement;

    while (node && node !== card) {
      if (!node.contains(heading) && node.querySelectorAll("img").length >= 1) {
        best = node;
      }
      node = node.parentElement;
    }

    return best;
  }

  function looksPrev(el) {
    const text = (el.textContent || "").trim();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const cls = (el.className || "").toString().toLowerCase();

    return (
      text === "‹" ||
      text === "←" ||
      text === "<" ||
      /prev|previous|left/.test(aria) ||
      /prev|previous/.test(cls)
    );
  }

  function looksNext(el) {
    const text = (el.textContent || "").trim();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const cls = (el.className || "").toString().toLowerCase();

    return (
      text === "›" ||
      text === "→" ||
      text === ">" ||
      /next|right/.test(aria) ||
      /next/.test(cls)
    );
  }

  function navButtons(carousel) {
    const candidates = [
      ...carousel.querySelectorAll("button"),
      ...carousel.querySelectorAll('[role="button"]')
    ];

    return {
      prev: candidates.find(looksPrev) || null,
      next: candidates.find(looksNext) || null
    };
  }

  function dotRow(card) {
    return [...card.querySelectorAll("div,nav,ol,ul")].find(row => {
      const children = [...row.children];
      if (children.length < 2) return false;

      const dotLike = children.filter(child => {
        const rect = child.getBoundingClientRect();
        const text = (child.textContent || "").trim();
        const aria = child.getAttribute("aria-label") || "";

        return (
          (text.length <= 2 && rect.width <= 28 && rect.height <= 28) ||
          /slide|image/i.test(aria)
        );
      });

      return dotLike.length >= 2 && dotLike.length >= children.length * 0.6;
    }) || null;
  }

  function repairCard(card, heading) {
    const carousel = findCarousel(card, heading);
    if (!carousel) return;

    card.classList.add("sfs-large-card");
    carousel.classList.add("sfs-large-carousel");

    /*
      4:5 viewport.
      A 300px card becomes roughly a 375px-tall image area, which is close
      to the larger original presentation but remains consistent card-to-card.
    */
    const cardWidth = Math.max(
      220,
      Math.round(card.getBoundingClientRect().width - 2)
    );

    const mediaHeight = Math.round(cardWidth * 1.25);

    card.style.setProperty(
      "--sfs-large-carousel-height",
      `${mediaHeight}px`
    );

    carousel.style.setProperty(
      "--sfs-large-carousel-height",
      `${mediaHeight}px`
    );

    [...carousel.querySelectorAll("img")].forEach(img => {
      img.style.width = "100%";
      img.style.height = `${mediaHeight}px`;
      img.style.minHeight = `${mediaHeight}px`;
      img.style.maxHeight = `${mediaHeight}px`;
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
      img.style.display = "block";
    });

    const { prev, next } = navButtons(carousel);

    /*
      Re-parenting the buttons into the carousel makes their absolute positioning
      relative to the repaired viewport rather than a clipped inner slide.
    */
    if (prev) {
      prev.classList.add("sfs-large-prev");
      if (prev.parentElement !== carousel) carousel.appendChild(prev);
    }

    if (next) {
      next.classList.add("sfs-large-next");
      if (next.parentElement !== carousel) carousel.appendChild(next);
    }

    const dots = dotRow(card);

    if (dots) {
      dots.classList.add("sfs-large-dots");

      const count = dots.children.length;

      dots.classList.toggle(
        "sfs-large-dots-medium",
        count >= 10 && count < 16
      );

      dots.classList.toggle(
        "sfs-large-dots-dense",
        count >= 16
      );
    }
  }

  function repairAll() {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(h => MONTH_RE.test((h.textContent || "").trim()));

    headings.forEach(heading => {
      const card = findCard(heading);
      if (card) repairCard(card, heading);
    });
  }

  let timer = null;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(repairAll, 80);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "src"]
  });

  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.addEventListener("DOMContentLoaded", schedule);

  schedule();
  setTimeout(repairAll, 300);
  setTimeout(repairAll, 900);
  setTimeout(repairAll, 1800);
})();
