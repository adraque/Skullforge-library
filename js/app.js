let releases = [];
let models = [];

const searchInput = document.querySelector('#search');
const yearFilter = document.querySelector('#year-filter');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const template = document.querySelector('#release-card-template');

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function modelsForRelease(releaseId) {
  return models.filter(model => model.release_id === releaseId);
}

function searchableText(release) {
  const releaseModels = modelsForRelease(release.id);
  return [
    release.title,
    release.release_month,
    ...releaseModels.flatMap(model => [model.name, model.name_raw, ...(model.tags || [])])
  ].filter(Boolean).join(' ').toLowerCase();
}

function renderReleaseImages(wrap, release) {
  const paths = Array.isArray(release.images) && release.images.length
    ? release.images
    : (release.image ? [release.image] : []);

  wrap.replaceChildren();

  if (!paths.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.textContent = 'No preview image';
    wrap.appendChild(placeholder);
    return;
  }

  wrap.classList.toggle('multi', paths.length > 1);

  for (const path of paths) {
    const img = document.createElement('img');
    img.className = 'release-image';
    img.src = path;
    img.alt = `${release.title || 'Release'} preview`;
    img.loading = 'lazy';
    wrap.appendChild(img);
  }
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const year = yearFilter.value;

  const filtered = releases.filter(release => {
    const matchesYear = !year || String(release.release_month || '').startsWith(year);
    const matchesQuery = !query || searchableText(release).includes(query);
    return matchesYear && matchesQuery;
  });

  results.replaceChildren();
  status.textContent = `${filtered.length} release${filtered.length === 1 ? '' : 's'} shown`;

  if (!filtered.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No matching releases found.';
    results.appendChild(p);
    return;
  }

  for (const release of filtered) {
    const node = template.content.cloneNode(true);
    node.querySelector('.month').textContent = release.release_month || 'Unknown month';
    node.querySelector('.title').textContent = release.title || 'Untitled release';

    renderReleaseImages(node.querySelector('.image-wrap'), release);

    const modelWrap = node.querySelector('.models');
    const releaseModels = modelsForRelease(release.id);
    if (releaseModels.length) {
      for (const model of releaseModels) {
        const tag = document.createElement('span');
        tag.className = 'model-tag';
        tag.textContent = model.name || model.name_raw || 'Unnamed model';
        modelWrap.appendChild(tag);
      }
    } else {
      const tag = document.createElement('span');
      tag.className = 'model-tag';
      tag.textContent = 'No model names entered yet';
      modelWrap.appendChild(tag);
    }

    const link = node.querySelector('.post-link');
    if (release.post_url) {
      link.href = release.post_url;
      link.textContent = release.source === 'discord' ? 'Open Discord source' : 'Open source post';
      link.hidden = false;
    }

    results.appendChild(node);
  }
}

async function init() {
  try {
    [releases, models] = await Promise.all([
      loadJson('data/releases.json'),
      loadJson('data/models.json')
    ]);

    const years = [...new Set(
      releases
        .map(r => String(r.release_month || '').slice(0, 4))
        .filter(y => /^20\d{2}$/.test(y))
    )].sort().reverse();

    for (const year of years) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    }

    render();
  } catch (error) {
    console.error(error);
    status.textContent = `Catalog failed to load: ${error.message}`;
  }
}

searchInput.addEventListener('input', render);
yearFilter.addEventListener('change', render);
init();
