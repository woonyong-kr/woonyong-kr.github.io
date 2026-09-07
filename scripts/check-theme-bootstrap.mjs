import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "_site/docs/configuration/index.html"), "utf8");
const bodyAt = html.indexOf("<body");
const lightAt = html.indexOf('id="wn-theme-light-stylesheet"');
const darkAt = html.indexOf('id="wn-theme-dark-stylesheet"');

if (bodyAt < 0 || lightAt < 0 || darkAt < 0 || lightAt > bodyAt || darkAt > bodyAt) {
  throw new Error("Both WN theme stylesheets must be declared in <head> before the first body paint.");
}
if (!html.includes('media="(prefers-color-scheme: light)"')) {
  throw new Error("The light stylesheet must match the initial system theme without JavaScript.");
}
if (!html.includes('media="(prefers-color-scheme: dark)"')) {
  throw new Error("The dark stylesheet must match the initial system theme without JavaScript.");
}
if (!html.includes('href="https://docs.woonyong.com/docs/configuration/"')) {
  throw new Error("The built page must use the docs.woonyong.com canonical URL.");
}
if (!html.includes('name="rcb-personal-compiler-endpoint" content="https://runner.woonyong.com"')) {
  throw new Error("The personal compiler endpoint must be injected from the site deployment config.");
}

console.log("Theme bootstrap, custom canonical URL, and runner deployment config are active.");
