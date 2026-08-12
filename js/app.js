let releases = [];
let models = [];

const searchInput = document.querySelector('#search');
const yearFilter = document.querySelector('#year-filter');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const template = document.querySelector('#release-card-template');

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  return response.json();
}

function modelsForRelease(id) {
  return models.filter(model => model.release_id === id);
}

function searchableText(release) {
  return [
    release.title,
    release.release_month,
    ...modelsForRelease(release.id).flatMap(model => [
      model.name,
      model.name_raw,
      ...(model.tags || []),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/* ============================================================
   Native navigable lightbox
   ============================================================ */

let lightbox = null;
let lightboxImage = null;
let lightboxCaption = null;
let lightboxCounter = null;
let lightboxPrev = null;
let lightboxNext = null;

let lightboxPaths = [];
let lightboxIndex = 0;
let lightboxTitle = '';
let lightboxTouchStartX = null;

function ensureLightbox() {
  if (lightbox) return;

  lightbox = document.createElement('div');
  lightbox.className = 'image-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'image-lightbox-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Release image viewer');

  const close = document.createElement('button');
  close.className = 'image-lightbox-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close image viewer');

  lightboxPrev = document.createElement('button');
  lightboxPrev.className = 'image-lightbox-prev';
  lightboxPrev.type = 'button';
  lightboxPrev.textContent = '‹';
  lightboxPrev.setAttribute('aria-label', 'Previous image');

  lightboxNext = document.createElement('button');
  lightboxNext.className = 'image-lightbox-next';
  lightboxNext.type = 'button';
  lightboxNext.textContent = '›';
  lightboxNext.setAttribute('aria-label', 'Next image');

  lightboxImage = document.createElement('img');
  lightboxImage.className = 'image-lightbox-image';
  lightboxImage.alt = '';

  const footer = document.createElement('div');
  footer.className = 'image-lightbox-footer';

  lightboxCaption = document.createElement('div');
  lightboxCaption.className = 'image-lightbox-caption';

  lightboxCounter = document.createElement('div');
  lightboxCounter.className = 'image-lightbox-counter';

  footer.append(lightboxCaption, lightboxCounter);
  dialog.append(
    close,
    lightboxPrev,
    lightboxImage,
    lightboxNext,
    footer,
  );

  lightbox.appendChild(dialog);
  document.body.appendChild(lightbox);

  close.addEventListener('click', closeLightbox);

  lightboxPrev.addEventListener('click', event => {
    event.stopPropagation();
    stepLightbox(-1);
  });

  lightboxNext.addEventListener('click', event => {
    event.stopPropagation();
    stepLightbox(1);
  });

  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  dialog.addEventListener(
    'touchstart',
    event => {
      if (!event.touches.length) return;
      lightboxTouchStartX = event.touches[0].clientX;
    },
    { passive: true },
  );

  dialog.addEventListener(
    'touchend',
    event => {
      if (
        lightboxTouchStartX === null ||
        !event.changedTouches.length
      ) {
        return;
      }

      const delta =
        event.changedTouches[0].clientX -
        lightboxTouchStartX;

      lightboxTouchStartX = null;

      if (Math.abs(delta) < 45) return;

      if (delta < 0) {
        stepLightbox(1);
      } else {
        stepLightbox(-1);
      }
    },
    { passive: true },
  );

  document.addEventListener('keydown', event => {
    if (!lightbox || lightbox.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepLightbox(1);
    }
  });
}

function renderLightbox() {
  if (!lightboxPaths.length) return;

  lightboxIndex =
    (lightboxIndex + lightboxPaths.length) %
    lightboxPaths.length;

  const src = lightboxPaths[lightboxIndex];

  lightboxImage.src = src;
  lightboxImage.alt =
    `${lightboxTitle || 'Skullforge release'} image ${lightboxIndex + 1} of ${lightboxPaths.length}`;

  lightboxCaption.textContent =
    lightboxTitle || 'Skullforge release';

  lightboxCounter.textContent =
    `${lightboxIndex + 1} / ${lightboxPaths.length}`;

  const multiple = lightboxPaths.length > 1;
  lightboxPrev.hidden = !multiple;
  lightboxNext.hidden = !multiple;
}

function openLightbox(paths, index, title) {
  ensureLightbox();

  lightboxPaths = [...paths];
  lightboxIndex = index;
  lightboxTitle = title || '';

  renderLightbox();

  lightbox.hidden = false;
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
}

function stepLightbox(delta) {
  if (lightboxPaths.length < 2) return;

  lightboxIndex += delta;
  renderLightbox();
}

function closeLightbox() {
  if (!lightbox) return;

  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.removeAttribute('src');

  lightboxPaths = [];
  lightboxIndex = 0;
  lightboxTitle = '';
  lightboxTouchStartX = null;

  document.body.classList.remove('lightbox-open');
}

/* ============================================================
   Native release carousel
   ============================================================ */

function dotDensityClass(count) {
  if (count >= 29) return 'dots-ultra';
  if (count >= 21) return 'dots-dense';
  if (count >= 15) return 'dots-medium';
  return '';
}

function makeCarousel(wrap, release) {
  wrap.replaceChildren();
  wrap.className = 'image-wrap carousel';

  const all = Array.isArray(release.images)
    ? [...new Set(release.images.filter(Boolean))]
    : [];

  const cover =
    release.cover_image ||
    all[0] ||
    release.image;

  let paths = [...all];

  if (cover) {
    paths = [
      cover,
      ...paths.filter(path => path !== cover),
    ];
  }

  if (!paths.length) {
    const empty = document.createElement('div');
    empty.className = 'image-placeholder';
    empty.textContent = 'No preview image';
    wrap.appendChild(empty);
    return;
  }

  let index = 0;

  const viewport = document.createElement('div');
  viewport.className = 'carousel-viewport';

  const slides = paths.map((path, imageIndex) => {
    const slide = document.createElement('button');
    slide.className = 'carousel-slide';
    slide.type = 'button';
    slide.setAttribute(
      'aria-label',
      `Open image ${imageIndex + 1} larger`,
    );

    const image = document.createElement('img');
    image.className = 'carousel-image';
    image.src = path;
    image.alt =
      `${release.title} image ${imageIndex + 1} of ${paths.length}`;

    /*
      The first image matters immediately; later images can be lazy.
      Layout is fixed by the viewport, so late image loading never changes card size.
    */
    image.loading = imageIndex === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';

    slide.addEventListener('click', () => {
      openLightbox(paths, imageIndex, release.title);
    });

    slide.appendChild(image);
    viewport.appendChild(slide);

    return slide;
  });

  const previous = document.createElement('button');
  previous.className = 'carousel-arrow carousel-prev';
  previous.type = 'button';
  previous.textContent = '‹';
  previous.setAttribute('aria-label', 'Previous image');

  const next = document.createElement('button');
  next.className = 'carousel-arrow carousel-next';
  next.type = 'button';
  next.textContent = '›';
  next.setAttribute('aria-label', 'Next image');

  const dots = document.createElement('div');
  dots.className = 'carousel-dots';

  const density = dotDensityClass(paths.length);
  if (density) dots.classList.add(density);

  const dotButtons = paths.map((_, dotIndex) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute(
      'aria-label',
      `Show image ${dotIndex + 1}`,
    );

    dot.addEventListener('click', () => {
      index = dotIndex;
      update();
    });

    dots.appendChild(dot);
    return dot;
  });

  function update() {
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.hidden = !active;
      slide.classList.toggle('active', active);
    });

    dotButtons.forEach((dot, dotIndex) => {
      dot.classList.toggle(
        'active',
        dotIndex === index,
      );
    });

    const single = paths.length < 2;
    previous.hidden = single;
    next.hidden = single;
  }

  previous.addEventListener('click', event => {
    event.stopPropagation();

    index =
      (index - 1 + paths.length) %
      paths.length;

    update();
  });

  next.addEventListener('click', event => {
    event.stopPropagation();

    index =
      (index + 1) %
      paths.length;

    update();
  });

  viewport.append(previous, next);
  wrap.append(viewport, dots);

  update();
}

/* ============================================================
   Catalog rendering
   ============================================================ */

function render() {
  const query =
    searchInput.value.trim().toLowerCase();

  const year =
    yearFilter.value;

  const filtered = releases
    .filter(release => {
      const yearMatches =
        !year ||
        String(release.release_month).startsWith(year);

      const searchMatches =
        !query ||
        searchableText(release).includes(query);

      return yearMatches && searchMatches;
    })
    .sort((a, b) =>
      String(b.release_month)
        .localeCompare(String(a.release_month)),
    );

  results.replaceChildren();

  status.textContent =
    `${filtered.length} release${filtered.length === 1 ? '' : 's'} shown`;

  filtered.forEach(release => {
    const node =
      template.content.cloneNode(true);

    const machine =
      node.querySelector('.month');

    if (machine) {
      machine.hidden = true;
    }

    node.querySelector('.title').textContent =
      release.title ||
      release.release_month;

    makeCarousel(
      node.querySelector('.image-wrap'),
      release,
    );

    const tags =
      node.querySelector('.models');

    modelsForRelease(release.id)
      .forEach(model => {
        if (model.store_url) {
          const link =
            document.createElement('a');

          link.className =
            'model-tag model-link';

          link.textContent =
            model.name;

          link.href =
            model.store_url;

          link.target =
            '_blank';

          link.rel =
            'noopener noreferrer';

          tags.appendChild(link);
        } else {
          const tag =
            document.createElement('span');

          tag.className =
            'model-tag';

          tag.textContent =
            model.name;

          tags.appendChild(tag);
        }
      });

    const oldLink =
      node.querySelector('.post-link');

    if (oldLink) {
      oldLink.remove();
    }

    results.appendChild(node);
  });
}

async function init() {
  [releases, models] =
    await Promise.all([
      loadJson('data/releases.json'),
      loadJson('data/models.json'),
    ]);

  [
    ...new Set(
      releases
        .map(release =>
          String(
            release.release_month || '',
          ).slice(0, 4),
        )
        .filter(year =>
          /^20\d{2}$/.test(year),
        ),
    ),
  ]
    .sort()
    .reverse()
    .forEach(year => {
      const option =
        document.createElement('option');

      option.value = year;
      option.textContent = year;

      yearFilter.appendChild(option);
    });

  ensureLightbox();
  render();
}

searchInput.addEventListener(
  'input',
  render,
);

yearFilter.addEventListener(
  'change',
  render,
);

init().catch(error => {
  console.error(error);

  status.textContent =
    `Catalog failed to load: ${error.message}`;
});
