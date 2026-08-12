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
