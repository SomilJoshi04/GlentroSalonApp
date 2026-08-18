/**
 * Smart history-aware back navigation utility.
 * If there is an internal history state inside the router session, it performs a native browser back navigation.
 * Otherwise, it falls back to the provided fallback path with state replacement.
 *
 * @param {Function} navigate - The react-router-dom navigate function.
 * @param {string} fallbackPath - The fallback route path.
 */
export const goBack = (navigate, fallbackPath) => {
  if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
};
