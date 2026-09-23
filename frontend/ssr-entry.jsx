// ssr-entry.jsx — smoke test: bundle + render SocialHubPage phía server (không cần DOM thật)
// Shim các global mà code vanilla Music Pro chạm ở top-level
if (typeof window === "undefined") {
  globalThis.window = globalThis;
  const noop = () => {};
  const el = () => ({
    style: {}, classList: { add: noop, remove: noop, toggle: noop },
    setAttribute: noop, appendChild: noop, removeChild: noop, addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
  });
  globalThis.document = {
    createElement: el, createTextNode: () => ({}), getElementById: () => null,
    head: el(), body: el(), addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
  };
  globalThis.navigator = { userAgent: "ssr-test", clipboard: { writeText: noop } };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.matchMedia = () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop });
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.Image = class { set src(v) {} };
  globalThis.Audio = class { play() { return { catch: noop }; } pause() {} };
}

import { renderToString } from "react-dom/server";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import SocialHubPage from "./src/pages/social/SocialHubPage.jsx";

const html = renderToString(
  React.createElement(MemoryRouter, null, React.createElement(SocialHubPage))
);
console.log("SSR_OK len=", html.length, "lockscreen=", /D4M|đăng nhập|Đăng nhập|token/i.test(html) ? "yes" : "no");
