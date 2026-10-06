import createClient from "openapi-fetch";
import { API_URL } from "./client";
import type { paths } from "./generated/schema";

export const typedApi = createClient<paths>({
  baseUrl: API_URL,
  credentials: "include",
  headers: { "Content-Type": "application/json" },
});
