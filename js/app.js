let releases=[],models=[];
const searchInput=document.querySelector('#search'),yearFilter=document.querySelector('#year-filter'),results=document.querySelector('#results'),status=document.querySelector('#status'),template=document.querySelector('#release-card-template');
async function loadJson(p){const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`Could not load ${p}`);return r.json();}
function mf(id){return models.filter(m=>m.release_id===id);}
function searchable(r){return [r.title,r.release_month,...mf(r.id).flatMap(m=>[m.name,m.name_raw,...(m.tags||[])])].filter(Boolean).join(' ').toLowerCase();}
function renderImages(w,r){
  w.replaceChildren();const all=Array.isArray(r.images)?r.images:[],cover=r.cover_image||all[0]||r.image;
  if(!cover){const e=document.createElement('div');e.className='image-placeholder';e.textContent='No preview image';w.appendChild(e);return;}
  const hero=document.createElement('img');hero.className='release-cover';hero.src=cover;hero.alt=`${r.title} release overview`;hero.loading='lazy';w.appendChild(hero);
  const extras=all.filter(x=>x!==cover);if(extras.length){const strip=document.createElement('div');strip.className='release-thumbnails';extras.forEach(p=>{const i=document.createElement('img');i.src=p;i.loading='lazy';strip.appendChild(i);});w.appendChild(strip);}
}
function render(){
  const q=searchInput.value.trim().toLowerCase(),y=yearFilter.value;
  const filtered=releases.filter(r=>(!y||String(r.release_month).startsWith(y))&&(!q||searchable(r).includes(q))).sort((a,b)=>String(b.release_month).localeCompare(String(a.release_month)));
  results.replaceChildren();status.textContent=`${filtered.length} release${filtered.length===1?'':'s'} shown`;
  filtered.forEach(r=>{const n=template.content.cloneNode(true);const me=n.querySelector('.month');if(me)me.hidden=true;n.querySelector('.title').textContent=r.title||r.release_month;renderImages(n.querySelector('.image-wrap'),r);
    const mw=n.querySelector('.models');mf(r.id).forEach(m=>{const t=document.createElement('span');t.className='model-tag';t.textContent=m.name;mw.appendChild(t);});
    const l=n.querySelector('.post-link');if(l){l.href=r.store_url||'https://skullforgestudios.gumroad.com/';l.textContent='Browse Skullforge on Gumroad';l.target='_blank';l.rel='noopener noreferrer';l.hidden=false;}results.appendChild(n);});
}
(async()=>{[releases,models]=await Promise.all([loadJson('data/releases.json'),loadJson('data/models.json')]);[...new Set(releases.map(r=>String(r.release_month||'').slice(0,4)).filter(y=>/^20\\d{2}$/.test(y)))].sort().reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;yearFilter.appendChild(o);});render();})();
searchInput.addEventListener('input',render);yearFilter.addEventListener('change',render);
