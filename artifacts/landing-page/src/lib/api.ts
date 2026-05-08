export const fetchStorefront = async (path: string) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Academy not found");
  return res.json();
};