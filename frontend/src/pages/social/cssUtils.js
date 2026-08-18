// src/pages/social/cssUtils.js
// Helper chuyển chuỗi CSS (vd từ nameEffectStyle) thành object style cho React inline
export function cssFrom(str) {
  const obj = {};
  (str || "").split(";").forEach((decl) => {
    const i = decl.indexOf(":");
    if (i > 0) {
      const k = decl.slice(0, i).trim();
      const v = decl.slice(i + 1).trim();
      const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
