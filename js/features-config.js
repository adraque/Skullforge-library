// Modular public-site feature switches. Set a feature to false to disable it
// without changing the catalog data or the other features.
window.SKULLFORGE_SITE_FEATURES = Object.freeze({
  filters: true,             // #9
  typeFilter: false,          // Keep type metadata, hide the public Type dropdown
  imageAssociations: true,   // #10
});
