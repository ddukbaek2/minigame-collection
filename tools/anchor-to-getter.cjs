//==============================================================================
// 임시 일괄 변환 도구.
// - UINode 의 anchor 메서드 12 개를 getter 로 변환 (정의)
// - 모든 .js 파일에서 .xxxAnchor() → .xxxAnchor (호출처)
// - 메서드 사이 빈 줄 두 개 → 한 줄
//==============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

const ANCHOR_NAMES = [
	"leftAnchor", "rightAnchor", "topAnchor", "bottomAnchor",
	"widthAnchor", "heightAnchor", "centerXAnchor", "centerYAnchor",
	"leadingAnchor", "trailingAnchor", "firstBaselineAnchor", "lastBaselineAnchor",
];


function transformUINodeFile(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let changed = false;
	for (const name of ANCHOR_NAMES) {
		const definitionPattern = new RegExp(`^\\t${name}\\(\\) \\{`, "m");
		if (definitionPattern.test(content)) {
			content = content.replace(definitionPattern, `\tget ${name}() {`);
			changed = true;
		}
	}
	if (changed) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`[anchor-to-getter] uinode 정의 변환: ${filePath}`);
	}
	return changed;
}


function transformAnchorCalls(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let totalReplacements = 0;
	for (const name of ANCHOR_NAMES) {
		const callPattern = new RegExp(`\\.${name}\\(\\)`, "g");
		const matches = content.match(callPattern);
		if (matches) {
			totalReplacements += matches.length;
			content = content.replace(callPattern, `.${name}`);
		}
	}
	if (totalReplacements > 0) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`[anchor-to-getter] 호출처 변환: ${filePath} (${totalReplacements}건)`);
	}
	return totalReplacements;
}


function collapseMethodBlankLines(filePath) {
	const original = fs.readFileSync(filePath, "utf8");
	const collapsed = original.replace(/\n\n\n+/g, "\n\n");
	if (collapsed !== original) {
		fs.writeFileSync(filePath, collapsed, "utf8");
		console.log(`[anchor-to-getter] 빈 줄 정리: ${filePath}`);
		return true;
	}
	return false;
}


function walk(dir, accumulator) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name === "build" || entry.name === ".git") {
			continue;
		}
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath, accumulator);
		}
		else if (entry.isFile() && fullPath.endsWith(".js") && !fullPath.endsWith(".min.js")) {
			accumulator.push(fullPath);
		}
	}
}


function main() {
	const repoRoot = path.resolve(__dirname, "..");
	const targets = [path.join(repoRoot, "src"), path.join(repoRoot, "libs", "vanilla.js", "src")];
	const files = [];
	for (const target of targets) {
		if (fs.existsSync(target)) {
			walk(target, files);
		}
	}

	const uiNodePath = path.join(repoRoot, "libs", "vanilla.js", "src", "ui", "uinode.js");
	if (fs.existsSync(uiNodePath)) {
		transformUINodeFile(uiNodePath);
	}

	let totalCalls = 0;
	for (const filePath of files) {
		totalCalls += transformAnchorCalls(filePath);
	}

	const targetsForBlankLines = [
		path.join(repoRoot, "src", "uitest.js"),
		path.join(repoRoot, "libs", "vanilla.js", "src", "ui", "uiscene.js"),
		path.join(repoRoot, "libs", "vanilla.js", "src", "game", "gamescene.js"),
	];
	for (const filePath of targetsForBlankLines) {
		if (fs.existsSync(filePath)) {
			collapseMethodBlankLines(filePath);
		}
	}

	console.log(`[anchor-to-getter] 총 호출처 변환: ${totalCalls}건`);
}


main();
