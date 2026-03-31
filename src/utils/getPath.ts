import { BLOG_PATH } from "@/content.config";
import { SITE } from "@/config";
import { slugifyStr } from "./slugify";

const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;
export const SITE_BASE_PATH = SITE.basePath.replace(/\/$/, "");

export function withBase(path: string) {
  if (!path) {
    return SITE_BASE_PATH ? `${SITE_BASE_PATH}/` : "/";
  }

  if (
    ABSOLUTE_URL_REGEX.test(path) ||
    path.startsWith("#") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!SITE_BASE_PATH) {
    return normalizedPath;
  }

  if (
    normalizedPath === SITE_BASE_PATH ||
    normalizedPath.startsWith(`${SITE_BASE_PATH}/`)
  ) {
    return normalizedPath;
  }

  return normalizedPath === "/"
    ? `${SITE_BASE_PATH}/`
    : `${SITE_BASE_PATH}${normalizedPath}`;
}

export function withoutBase(path: string) {
  if (!SITE_BASE_PATH) {
    return path || "/";
  }

  if (path === SITE_BASE_PATH) {
    return "/";
  }

  return path.startsWith(`${SITE_BASE_PATH}/`)
    ? path.slice(SITE_BASE_PATH.length) || "/"
    : path;
}

/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
) {
  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter(path => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter(path => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map(segment => slugifyStr(segment)); // slugify each segment path

  // Making sure `id` does not contain the directory
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1)[0] : id;
  const relativePath = [pathSegments, slug].flat().filter(Boolean).join("/");

  // If not inside the sub-dir, simply return the file path
  if (!includeBase) {
    return relativePath;
  }

  return withBase(`/posts/${relativePath}`);
}
