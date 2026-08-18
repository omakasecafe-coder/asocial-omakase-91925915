const publicHosts = new Set(["asocialcafe.com", "www.asocialcafe.com"]);

export function isPublicSiteHost(hostname: string) {
  return publicHosts.has(hostname.toLowerCase().split(":")[0] ?? "");
}
