(() => {
  const sf = window.SkullforgeCatalog;
  if (!sf || !sf.featureFlags.imageAssociations) return;

  sf.registerFeature({
    id: '10-public-image-associations',

    decorateModel({ wrapper, model, carousel }) {
      const refs = model.image_refs || [];
      if (!refs.length || !carousel) return;
      const usable = refs.find(ref => carousel.paths?.includes(ref));
      if (!usable) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'model-image-jump';
      button.textContent = '◉';
      button.title = `Show image for ${model.name}`;
      button.setAttribute('aria-label', `Show associated image for ${model.name}`);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        carousel.showPath(usable);
      });
      wrapper.appendChild(button);
    },
  });
})();
