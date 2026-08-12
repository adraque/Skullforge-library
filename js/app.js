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

/* Skullforge CONSOLIDATED carousel repair */
(() => {
  "use strict";

  if (window.__SFS_CONSOLIDATED_CAROUSEL_REPAIR__) return;
  window.__SFS_CONSOLIDATED_CAROUSEL_REPAIR__ = true;

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
          (text.length <= 2 && rect.width <= 30 && rect.height <= 30) ||
          /slide|image/i.test(aria)
        );
      });

      return dotLike.length >= 2 && dotLike.length >= children.length * 0.6;
    }) || null;
  }

  function candidateSlides(carousel) {
    const imgs = [...carousel.querySelectorAll("img")];
    const slides = new Set();

    imgs.forEach(img => {
      let node = img.parentElement;

      while (node && node !== carousel) {
        const rect = node.getBoundingClientRect();
        const parentRect = carousel.getBoundingClientRect();

        /*
          Prefer the nearest image wrapper that is approximately carousel-sized.
          This catches the slide track items without touching the whole carousel.
        */
        if (
          rect.width > 0 &&
          parentRect.width > 0 &&
          rect.width <= parentRect.width * 1.15
        ) {
          slides.add(node);
          break;
        }

        node = node.parentElement;
      }
    });

    return [...slides];
  }

  function repairCard(card, heading) {
    const carousel = findCarousel(card, heading);
    if (!carousel) return;

    carousel.classList.add("sfs-carousel-repair");

    /*
      Remove classes from our previous experiments so their CSS no longer wins.
      This is important for February / Nov 2025 / Sep 2024.
    */
    card.classList.remove(
      "sfs-uniform-card",
      "sfs-force-month-card",
      "sfs-repaired-card",
      "sfs-large-card"
    );

    carousel.classList.remove(
      "sfs-carousel-viewport",
      "sfs-force-media",
      "sfs-repaired-carousel",
      "sfs-large-carousel"
    );

    // Remove inline variables/heights added by older patches.
    [
      "--sfs-card-media-height",
      "--sfs-carousel-size",
      "--sfs-large-carousel-height"
    ].forEach(name => {
      card.style.removeProperty(name);
      carousel.style.removeProperty(name);
    });

    [...carousel.querySelectorAll("img")].forEach(img => {
      img.style.removeProperty("height");
      img.style.removeProperty("min-height");
      img.style.removeProperty("max-height");
      img.style.removeProperty("width");
      img.style.removeProperty("object-fit");
      img.style.removeProperty("object-position");
      img.style.removeProperty("display");

      // Then enforce only the safe, non-destructive constraints.
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
    });

    candidateSlides(carousel).forEach(slide => {
      slide.classList.add("sfs-repair-slide");

      /*
        Only neutralize pathological horizontal positioning.
        Do NOT reset the normal visibility/display state used by the carousel.
      */
      const style = getComputedStyle(slide);
      const rect = slide.getBoundingClientRect();
      const carouselRect = carousel.getBoundingClientRect();

      const tooFarRight = rect.left > carouselRect.right - 20;
      const tooFarLeft = rect.right < carouselRect.left + 20;

      if (tooFarRight || tooFarLeft) {
        slide.style.transform = "none";
        slide.style.translate = "none";
        slide.style.left = "0";
        slide.style.right = "0";
      }
    });

    const { prev, next } = navButtons(carousel);

    if (prev) {
      prev.classList.remove(
        "sfs-carousel-prev",
        "sfs-large-prev"
      );
      prev.classList.add("sfs-repair-prev");

      if (prev.parentElement !== carousel) {
        carousel.appendChild(prev);
      }
    }

    if (next) {
      next.classList.remove(
        "sfs-carousel-next",
        "sfs-large-next"
      );
      next.classList.add("sfs-repair-next");

      if (next.parentElement !== carousel) {
        carousel.appendChild(next);
      }
    }

    const dots = dotRow(card);

    if (dots) {
      dots.classList.remove(
        "sfs-dot-row",
        "sfs-repaired-dots",
        "sfs-large-dots",
        "sfs-dots-medium",
        "sfs-dots-dense",
        "sfs-large-dots-medium",
        "sfs-large-dots-dense"
      );

      dots.classList.add("sfs-repair-dots");

      if (dots.children.length >= 16) {
        dots.classList.add("sfs-repair-dots-dense");
      } else {
        dots.classList.remove("sfs-repair-dots-dense");
      }

      dots.style.removeProperty("overflow");
      dots.style.removeProperty("gap");
      dots.style.removeProperty("transform");
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
    timer = setTimeout(repairAll, 100);
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

/* Skullforge targeted carousel centering fix */
(() => {
  "use strict";

  if (window.__SFS_TARGETED_CENTER_FIX__) return;
  window.__SFS_TARGETED_CENTER_FIX__ = true;

  const TARGET_MONTHS = new Set([
    "February 2026",
    "November 2025",
    "September 2024"
  ]);

  function findHeading() {
    return [...document.querySelectorAll("h1,h2,h3,h4,strong")]
      .filter(el => TARGET_MONTHS.has((el.textContent || "").trim()));
  }

  function findCard(heading) {
    let node = heading.parentElement;
    let best = null;

    while (node && node !== document.body) {
      const targetHeadings = [...node.querySelectorAll("h1,h2,h3,h4,strong")]
        .filter(el => TARGET_MONTHS.has((el.textContent || "").trim()));

      const images = node.querySelectorAll("img");

      if (targetHeadings.length === 1 && images.length >= 1) {
        best = node;
      }

      if (targetHeadings.length > 1) break;
      node = node.parentElement;
    }

    return best;
  }

  function findCarousel(card, heading) {
    const imgs = [...card.querySelectorAll("img")];
    if (!imgs.length) return null;

    const first = imgs[0];
    let node = first.parentElement;
    let best = first.parentElement;

    while (node && node !== card) {
      if (!node.contains(heading) && node.querySelectorAll("img").length >= 1) {
        best = node;
      }
      node = node.parentElement;
    }

    return best;
  }

  function slideForImage(img, carousel) {
    let node = img.parentElement;
    let best = img.parentElement;

    while (node && node !== carousel) {
      const rect = node.getBoundingClientRect();
      const carouselRect = carousel.getBoundingClientRect();

      if (
        rect.width > 0 &&
        carouselRect.width > 0 &&
        rect.width <= carouselRect.width * 1.25
      ) {
        best = node;
      }

      node = node.parentElement;
    }

    return best;
  }

  function isVisibleSlide(slide, carousel) {
    const style = getComputedStyle(slide);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity || 1) === 0
    ) {
      return false;
    }

    const rect = slide.getBoundingClientRect();
    const c = carousel.getBoundingClientRect();

    const overlap =
      Math.min(rect.right, c.right) -
      Math.max(rect.left, c.left);

    return overlap > Math.min(rect.width, c.width) * 0.35;
  }

  function repairOne(heading) {
    const card = findCard(heading);
    if (!card) return;

    const carousel = findCarousel(card, heading);
    if (!carousel) return;

    carousel.classList.add("sfs-target-center-carousel");

    const images = [...carousel.querySelectorAll("img")];
    const slides = [];

    images.forEach(img => {
      const slide = slideForImage(img, carousel);
      if (slide && !slides.includes(slide)) {
        slides.push(slide);
      }
    });

    slides.forEach(slide => {
      slide.classList.add("sfs-target-center-slide");
      slide.classList.remove("sfs-target-visible");

      /*
        Remove only horizontal offsets left behind by the carousel.
        We do NOT touch vertical sizing, dots, arrows, or hidden-slide state.
      */
      slide.style.removeProperty("margin-left");
      slide.style.removeProperty("margin-right");

      if (isVisibleSlide(slide, carousel)) {
        slide.classList.add("sfs-target-visible");

        slide.style.transform = "none";
        slide.style.translate = "none";
        slide.style.left = "0px";
        slide.style.right = "0px";
        slide.style.marginLeft = "auto";
        slide.style.marginRight = "auto";
        slide.style.width = "100%";
        slide.style.maxWidth = "100%";

        [...slide.querySelectorAll("img")].forEach(img => {
          img.style.transform = "none";
          img.style.translate = "none";
          img.style.left = "auto";
          img.style.right = "auto";
          img.style.marginLeft = "auto";
          img.style.marginRight = "auto";
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.objectFit = "contain";
          img.style.objectPosition = "center center";
        });
      }
    });
  }

  function repairAll() {
    findHeading().forEach(repairOne);
  }

  let timer = null;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(repairAll, 60);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "src"]
  });

  document.addEventListener("click", event => {
    if (event.target.closest("button,[role='button']")) {
      setTimeout(repairAll, 20);
      setTimeout(repairAll, 150);
    }
  }, true);

  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.addEventListener("DOMContentLoaded", schedule);

  schedule();
  setTimeout(repairAll, 300);
  setTimeout(repairAll, 900);
})();
