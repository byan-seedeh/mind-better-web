import httpClient from "./httpClient";

export const getPhq9History = async (user_id) => {
  const res = await httpClient.get("/api/phq9/history/" + user_id);
  return res.data;
};
