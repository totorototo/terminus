// why: the dot-nav (StoryDotNav.jsx) has to render outside the story's
// scrolling container — position: fixed inside it doesn't reliably survive
// iOS Safari's compositing of an overflow:auto + mask-image ancestor (see
// ThemeToggle.jsx's own why-comment for the same constraint). That puts the
// nav and the section DOM it needs to scroll to in different subtrees, so
// this slice is the bridge: Story registers a scroll handler once on mount,
// the nav calls it imperatively instead of holding refs it can't own.
export const createStoryNavSlice = (set) => ({
  storyNav: {
    activeIndex: 0,
    scrollHandler: null,
  },

  setStoryActiveIndex: (activeIndex) =>
    set(
      (state) => ({ storyNav: { ...state.storyNav, activeIndex } }),
      undefined,
      "storyNav/setActiveIndex",
    ),

  setStoryScrollHandler: (scrollHandler) =>
    set(
      (state) => ({ storyNav: { ...state.storyNav, scrollHandler } }),
      undefined,
      "storyNav/setScrollHandler",
    ),
});
