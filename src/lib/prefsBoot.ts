/* Server-safe: imported by the root layout. */
export const PREFS_KEY = "kline:prefs";

/**
 * Inline <head> script: same logic as sanitize + resolve + applyPrefs, minified by hand, so the page never
 * flashes the dark theme before switching to paper. Kept in sync by tests (prefs.test.ts).
 */
export const PREFS_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"null")||{};var s=p.skin==="paper"||p.skin==="plain"?p.skin:"pan";var d={pan:["sans","pro","compact"],paper:["sans","standard","normal"],plain:["kai","plain","airy"]}[s];var f=["sans","serif","kai"].indexOf(p.font)>=0?p.font:d[0];var v=["plain","standard","pro"].indexOf(p.voice)>=0?p.voice:d[1];var l=["compact","normal","airy"].indexOf(p.leading)>=0?p.leading:d[2];var e=document.documentElement;e.dataset.skin=s;e.dataset.font=f;e.dataset.voice=v;e.dataset.glass=["frost","off"].indexOf(p.glass)>=0?p.glass:"liquid";e.style.setProperty("--fs",[0.9,1,1.1,1.2,1.3].indexOf(p.scale)>=0?p.scale:1);e.style.setProperty("--lh",{compact:1.55,normal:1.75,airy:1.95}[l])}catch(x){}})()`;
