// Existing bookmarks enter the same story, with the relevant experiment in view.
const chapter = document.body.dataset.chapterLink;
const allowed = new Set(['neuron','reflex','brain']);
if (allowed.has(chapter)) location.replace(`./${location.search}#${chapter}`);
