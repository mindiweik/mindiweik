// Editable-slides switch for the blocked talk deck.
//
// true  = the built deck carries edit mode: with ?edit in the URL, text becomes
//         click-to-edit and changes autosave to that browser's localStorage.
//         Visitors without ?edit see a normal locked deck either way.
// false = the built page contains none of the edit machinery at all. Saved
//         overrides are ignored.
//
// It is a committed boolean rather than an env var on purpose: the daily cron
// rebuild (deploy.yml, 13:23 UTC) runs with no inputs, so an env toggle would
// silently revert to locked overnight. Flip it back here and commit.
export const SLIDES_EDITABLE = true;

// localStorage key when editable. Changing it orphans old saves; fine.
export const SLIDES_STORAGE_KEY = 'blocked-slides-overrides';
