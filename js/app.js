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
function searchable(r){
  return [r.title,r.release_month,...modelsForRelease(r.id).flatMap(m=>[m.name,m.name_raw,...(m.tags||[])])]
    .filter(Boolean).join(' ').toLowerCase();
}

function makeCarousel(wrap,release){
  wrap.replaceChildren();
  wrap.classList.add('carousel');

  const all=Array.isArray(release.images)?release.images:[];
  const cover=release.cover_image||all[0]||release.image;
  let images=[...all];

  if(cover){
    images=[cover,...images.filter(x=>x!==cover)];
  }

  if(!images.length){
    const e=document.createElement('div');
    e.className='image-placeholder';
    e.textContent='No preview image';
    wrap.appendChild(e);
    return;
  }

  let index=0;

  const viewport=document.createElement('div');
  viewport.className='carousel-viewport';

  const img=document.createElement('img');
  img.className='carousel-image';
  viewport.appendChild(img);

  const prev=document.createElement('button');
  prev.className='carousel-arrow carousel-prev';
  prev.type='button';
  prev.textContent='‹';

  const next=document.createElement('button');
  next.className='carousel-arrow carousel-next';
  next.type='button';
  next.textContent='›';

  const dots=document.createElement('div');
  dots.className='carousel-dots';

  const dotButtons=images.map((_,i)=>{
    const d=document.createElement('button');
    d.type='button';
    d.className='carousel-dot';
    d.setAttribute('aria-label',`Show image ${i+1} of ${images.length}`);
    d.onclick=()=>{index=i;update();};
    dots.appendChild(d);
    return d;
  });

  function update(){
    img.src=images[index];
    img.alt=`${release.title} image ${index+1} of ${images.length}`;
    dotButtons.forEach((d,i)=>d.classList.toggle('active',i===index));
    prev.hidden=images.length<2;
    next.hidden=images.length<2;
  }

  prev.onclick=()=>{index=(index-1+images.length)%images.length;update();};
  next.onclick=()=>{index=(index+1)%images.length;update();};

  viewport.append(prev,next);
  wrap.append(viewport,dots);
  update();
}

function render(){
  const q=searchInput.value.trim().toLowerCase();
  const y=yearFilter.value;

  const filtered=releases
    .filter(r=>(!y||String(r.release_month).startsWith(y))&&(!q||searchable(r).includes(q)))
    .sort((a,b)=>String(b.release_month).localeCompare(String(a.release_month)));

  results.replaceChildren();
  status.textContent=`${filtered.length} release${filtered.length===1?'':'s'} shown`;

  filtered.forEach(r=>{
    const node=template.content.cloneNode(true);
    const machineDate=node.querySelector('.month');
    if(machineDate)machineDate.hidden=true;

    node.querySelector('.title').textContent=r.title||r.release_month;
    makeCarousel(node.querySelector('.image-wrap'),r);

    const tagWrap=node.querySelector('.models');
    modelsForRelease(r.id).forEach(m=>{
      if(m.store_url){
        const a=document.createElement('a');
        a.className='model-tag model-link';
        a.textContent=m.name;
        a.href=m.store_url;
        a.target='_blank';
        a.rel='noopener noreferrer';
        a.title='Open this model on Gumroad';
        tagWrap.appendChild(a);
      }else{
        const s=document.createElement('span');
        s.className='model-tag';
        s.textContent=m.name;
        tagWrap.appendChild(s);
      }
    });

    const oldLink=node.querySelector('.post-link');
    if(oldLink)oldLink.remove();

    results.appendChild(node);
  });
}

async function init(){
  [releases,models]=await Promise.all([
    loadJson('data/releases.json'),
    loadJson('data/models.json')
  ]);

  [...new Set(
    releases.map(r=>String(r.release_month||'').slice(0,4))
      .filter(y=>/^20\d{2}$/.test(y))
  )].sort().reverse().forEach(y=>{
    const o=document.createElement('option');
    o.value=y;
    o.textContent=y;
    yearFilter.appendChild(o);
  });

  render();
}

searchInput.addEventListener('input',render);
yearFilter.addEventListener('change',render);
init().catch(e=>{
  console.error(e);
  status.textContent=`Catalog failed to load: ${e.message}`;
});
