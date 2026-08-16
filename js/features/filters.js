(() => {
  const sf = window.SkullforgeCatalog;
  if (!sf || !sf.featureFlags.filters) return;

  const controls = {
    collection: null,
    type: null,
    tag: null,
    sort: null,
  };

  function addSelect(container, id, labelText, firstText) {
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = labelText;
    const select = document.createElement('select');
    select.id = id;
    const first = document.createElement('option');
    first.value = '';
    first.textContent = firstText;
    select.appendChild(first);
    label.append(span, select);
    container.appendChild(label);
    return select;
  }

  function populate(select, values) {
    [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
  }

  sf.registerFeature({
    id: '9-public-filters',

    onInit({ models }) {
      document.documentElement.classList.add('sf-feature-filters');
      const container = document.querySelector('.controls');
      controls.collection = addSelect(container, 'collection-filter', 'Collection / range', 'All collections');
      if (sf.featureFlags.typeFilter !== false) {
        controls.type = addSelect(container, 'type-filter', 'Type', 'All types');
      }
      controls.tag = addSelect(container, 'tag-filter', 'Tag', 'All tags');
      controls.sort = addSelect(container, 'sort-filter', 'Sort', 'Newest first');

      populate(controls.collection, models.map(model => model.collection));
      if (controls.type) {
        populate(controls.type, models.map(model => model.type));
      }
      populate(controls.tag, models.flatMap(model => model.tags || []));

      [
        ['oldest', 'Oldest first'],
        ['az', 'Month A–Z'],
        ['za', 'Month Z–A'],
      ].forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        controls.sort.appendChild(option);
      });

      Object.values(controls).filter(Boolean).forEach(control => {
        control.addEventListener('change', () => sf.render());
      });
    },

    filterRelease(context) {
      const collection = controls.collection?.value || '';
      const type = controls.type?.value || '';
      const tag = controls.tag?.value || '';
      if (!collection && !type && !tag) return;

      context.include = context.models.some(model => {
        if (collection && String(model.collection || '') !== collection) return false;
        if (type && String(model.type || '') !== type) return false;
        if (tag && !(model.tags || []).some(value => String(value) === tag)) return false;
        return true;
      });
    },

    configureSort(context) {
      const sort = controls.sort?.value || '';
      if (sort === 'oldest') {
        context.comparator = (a, b) => String(a.release_month).localeCompare(String(b.release_month));
      } else if (sort === 'az') {
        context.comparator = (a, b) => String(a.title || a.release_month).localeCompare(String(b.title || b.release_month));
      } else if (sort === 'za') {
        context.comparator = (a, b) => String(b.title || b.release_month).localeCompare(String(a.title || a.release_month));
      } else {
        context.comparator = (a, b) => String(b.release_month).localeCompare(String(a.release_month));
      }
    },
  });
})();
