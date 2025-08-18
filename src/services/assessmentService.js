import httpClient from "./httpClient";

export const savePhq9 = async (payload) => {
  const res = await httpClient.post("/api/phq9/save", payload);
  return res.data;
};
