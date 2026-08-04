const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const repoDbSource = path.resolve(workspaceRoot, "packages/db/src");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so workspace packages (`@repo/db`) hot-reload, and
// resolve modules from both the app and the workspace root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(workspaceRoot, "node_modules"),
];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (
		platform === "web" &&
		["@expo/ui/swift-ui", "@expo/ui/swift-ui/modifiers"].includes(moduleName)
	) {
		return { type: "empty" };
	}

	// `@repo/db` publishes its subpaths through an export map whose `default`
	// condition points at a compiled `dist`. Metro consumes the TypeScript
	// source directly, so map the subpaths itself and skip the build step.
	if (moduleName.startsWith("@repo/db/")) {
		const subpath = moduleName.slice("@repo/db/".length);

		return {
			type: "sourceFile",
			filePath: path.join(repoDbSource, `${subpath}.ts`),
		};
	}

	return originalResolveRequest
		? originalResolveRequest(context, moduleName, platform)
		: context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
	cssEntryFile: "./src/global.css",
});
