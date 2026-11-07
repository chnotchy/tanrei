// Harsh mode's motion rate in Firefox and WebKit, on request (TANREI_HARSH_PAGE_MOTION=1): they have no rate of their
// own to set (Chromium's is CDP `Animation.setPlaybackRate`, test/harsh/playwright-test.ts). Run in the page — as an init script, and once on the
// document a page already has — it plays every animation the page makes at `rate` times its speed, by its playback
// rate, as Chromium's engine plays it, and hides that from the page:
// - a script's animation — `element.animate()`, an `Animation` made and played — is slowed as it is made or played;
// - a CSS transition is slowed in its `transitionrun` (sent in the frame after the one that made it, so its time so far
//   is set back to what the rate would have given it: it was made at the frame's start, and nothing was painted of it
//   since), and a CSS animation in its `animationstart` (sent once its delay is over: the delay plays at its own speed,
//   and so does the frame before the event — its time is not set back, which would send the event again). The events
//   are not composed, so they are listened for in the document and in every shadow root (`attachShadow`);
// - an animation's `playbackRate` reads and is set as the page knows it, without the factor (Chromium's engine
//   rate does not show there either): a page that sets its own rate keeps harsh mode's on top of it.
// What it cannot reach plays at its own speed: a motion the page moves itself from `performance.now()`, a smooth scroll
// — as in Chromium — and, unlike Chromium, a CSS animation's delay and a motion the page moves itself from the time a
// frame callback is given (Chromium's rate slows that time too), a CSS transition or animation in a shadow root that
// no `attachShadow()` made (a declarative one, `<template shadowrootmode>`), and a motion no engine lists an animation
// for — the height of a `<details>` element's content, a transition of its `::details-content`. That last is why it is
// not on by default: the accordion's clock, which runs with that height, is slowed, the height is not, and a correct
// test that compares the two frame by frame (ACC-13) fails (test/harsh.ts has the numbers). How sound this is:
// harsh mode's own tests (test/harsh/self/motion.self.ts) fail the same races here as in Chromium, and its check
// (`checkHarsh`) measures each kind of motion moving at the rate.
//
// It must stand alone: Playwright sends its source to the page.
export function slowMotion(rate: number): void {
  const marked = window as unknown as { tanreiHarshMotion?: number };
  if (marked.tanreiHarshMotion !== undefined || rate === 1) return;
  marked.tanreiHarshMotion = rate;
  const slowed = new WeakSet<Animation>();
  const own = Object.getOwnPropertyDescriptor(Animation.prototype, 'playbackRate')!;
  const getRate = own.get!;
  const setRate = own.set!;
  const slow = (animation: Animation, setBack: boolean) => {
    if (slowed.has(animation)) return;
    const time = animation.currentTime;
    setRate.call(animation, getRate.call(animation) * rate);
    slowed.add(animation);
    if (setBack && animation.playState === 'running' && typeof time === 'number' && time > 0) animation.currentTime = time * rate;
  };
  Object.defineProperty(Animation.prototype, 'playbackRate', {
    ...own,
    get(this: Animation) {
      const value = getRate.call(this) as number;
      // To 12 digits: 3 × 0.2 ÷ 0.2 is 3.0000000000000004 in floating point.
      return slowed.has(this) ? Number((value / rate).toPrecision(12)) : value;
    },
    set(this: Animation, value: number) {
      setRate.call(this, slowed.has(this) ? value * rate : value);
    },
  });
  const update = Animation.prototype.updatePlaybackRate;
  Animation.prototype.updatePlaybackRate = function (this: Animation, value: number) {
    return update.call(this, slowed.has(this) ? value * rate : value);
  };
  const play = Animation.prototype.play;
  Animation.prototype.play = function (this: Animation) {
    slow(this, false);
    return play.call(this);
  };
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
    const animation = animate.apply(this, args);
    slow(animation, false);
    return animation;
  };
  /** The page's animations that an event names: of its target or its pseudo-element, by property or name. */
  const named = (event: TransitionEvent | AnimationEvent) => {
    const target = event.target as Element;
    if (typeof target?.getAnimations !== 'function') return [];
    return target.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      if (effect?.target !== target || (effect.pseudoElement ?? '') !== event.pseudoElement) return false;
      return event instanceof TransitionEvent
        ? animation instanceof CSSTransition && animation.transitionProperty === event.propertyName
        : animation instanceof CSSAnimation && animation.animationName === event.animationName;
    });
  };
  const onRun = (event: Event) => named(event as TransitionEvent).forEach((animation) => slow(animation, true));
  const onStart = (event: Event) => named(event as AnimationEvent).forEach((animation) => slow(animation, false));
  // The same two functions each time: a root listened to twice still calls each once.
  const listen = (root: Window | ShadowRoot) => {
    root.addEventListener('transitionrun', onRun, true);
    root.addEventListener('animationstart', onStart, true);
  };
  listen(window);
  // `document.open()` — `page.setContent()` writes a page's content with it — takes every listener off the window,
  // and keeps what the page's interfaces were given above: the window is listened to again as the new content comes
  // in (an observer of the document is kept).
  new MutationObserver(() => listen(window)).observe(document, { childList: true });
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
    const root = attach.call(this, init);
    listen(root);
    return root;
  };
  // The shadow roots the document already has (the document of a page that was open before harsh mode came to it).
  const walk = (node: Document | ShadowRoot) => {
    for (const element of node.querySelectorAll('*')) {
      if (!element.shadowRoot) continue;
      listen(element.shadowRoot);
      walk(element.shadowRoot);
    }
  };
  walk(document);
}
