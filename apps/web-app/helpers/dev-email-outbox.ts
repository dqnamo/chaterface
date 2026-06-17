import path from "node:path";

export const getDevelopmentEmailOutboxDirectory = () =>
	path.join(process.cwd(), ".email-outbox");
