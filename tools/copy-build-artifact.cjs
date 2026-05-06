#!/usr/bin/env node
//==============================================================================
// 플랫폼 빌드 산출물을 build/{platform}/ 으로 복사.
//
// 사용법:
//   node tools/copy-build-artifact.cjs <appintoss|onestore-apk|onestore-aab>
//==============================================================================
"use strict";
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "project-manifest.json");


function readManifest() {
	return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}


function copyFileToBuild(platform, sourcePath) {
	if (!fs.existsSync(sourcePath)) {
		throw new Error(`[copy-artifact] 원본 파일이 없습니다: ${sourcePath}`);
	}
	const buildDir = path.join(projectRoot, "build", platform);
	fs.mkdirSync(buildDir, { recursive: true });
	const destination = path.join(buildDir, path.basename(sourcePath));
	fs.copyFileSync(sourcePath, destination);
	console.log(`[copy-artifact] ${path.relative(projectRoot, sourcePath)} -> ${path.relative(projectRoot, destination)}`);
}


function main() {
	const target = process.argv[2];
	if (target === "appintoss") {
		const manifest = readManifest();
		const appName = manifest.appintoss && manifest.appintoss.appName;
		if (!appName) throw new Error("[copy-artifact] tools/project-manifest.json 의 appintoss.appName 이 비어있습니다.");
		copyFileToBuild("appintoss", path.join(projectRoot, "platforms", "appintoss", `${appName}.ait`));
	}
	else if (target === "onestore-apk") {
		copyFileToBuild("onestore", path.join(projectRoot, "platforms", "onestore", "android", "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"));
	}
	else if (target === "onestore-aab") {
		copyFileToBuild("onestore", path.join(projectRoot, "platforms", "onestore", "android", "app", "build", "outputs", "bundle", "release", "app-release.aab"));
	}
	else {
		console.error(`[copy-artifact] 알 수 없는 대상: ${target || "(none)"}`);
		console.error("사용법: node tools/copy-build-artifact.cjs <appintoss|onestore-apk|onestore-aab>");
		process.exit(1);
	}
}


try {
	main();
}
catch (error) {
	console.error(error.message);
	process.exit(1);
}
