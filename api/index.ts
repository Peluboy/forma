import { createApp } from "../server/app.js";
const app = createApp();
export default async function handler(req: any, res: any) {
  return (await app)(req, res);
}
