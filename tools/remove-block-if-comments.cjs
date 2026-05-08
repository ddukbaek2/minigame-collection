//==============================================================================
// 자동 생성된 if/else/catch/for/etc 위의 무의미한 주석 블록 제거 임시 도구.
// - 6줄 패턴:
//     //==========...
//     // <keyword>.
//     //==========...
//     /**
//      * @param { * } <expression>
//      */
// - 위 6줄을 통째로 삭제. 그 다음 줄(실제 if/else/catch/...)은 유지.
//==============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

const KEYWORDS = ["if", "else", "catch", "finally", "switch", "try", "for", "while", "return", "do", "throw", "break", "continue"];
const KEYWORD_RE = new RegExp(`^\\s*//\\s*(${KEYWORDS.join("|")})\\.\\s*$`);
const HR_RE = /^\s*\/\/=+\s*$/;
const JSDOC_OPEN_RE = /^\s*\/\*\*\s*$/;
const JSDOC_PARAM_RE = /^\s*\*\s*@param\s*\{\s*\*\s*\}.*$/;
const JSDOC_CLOSE_RE = /^\s*\*\/\s*$/;


function processFile(filePath) {
	const original = fs.readFileSync(filePath, "utf8");
	const lines = original.split("\n");
	const output = [];
	let removed = 0;

	for (let i = 0; i < lines.length; i++) {
		if (
			i + 5 < lines.length
			&& HR_RE.test(lines[i])
			&& KEYWORD_RE.test(lines[i + 1])
			&& HR_RE.test(lines[i + 2])
			&& JSDOC_OPEN_RE.test(lines[i + 3])
			&& JSDOC_PARAM_RE.test(lines[i + 4])
			&& JSDOC_CLOSE_RE.test(lines[i + 5])
		) {
			i += 5;
			removed += 1;
			continue;
		}
		output.push(lines[i]);
	}

	if (removed > 0) {
		fs.writeFileSync(filePath, output.join("\n"), "utf8");
	}
	return removed;
}


function walk(dir, accumulator) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath, accumulator);
		}
		else if (entry.isFile() && fullPath.endsWith(".js")) {
			accumulator.push(fullPath);
		}
	}
}


function main() {
	const repoRoot = path.resolve(__dirname, "..");
	const srcRoot = path.join(repoRoot, "src");
	const files = [];
	walk(srcRoot, files);

	let totalRemoved = 0;
	let touchedFiles = 0;
	for (const filePath of files) {
		const removed = processFile(filePath);
		if (removed > 0) {
			touchedFiles += 1;
			totalRemoved += removed;
			const relativePath = path.relative(repoRoot, filePath);
			console.log(`[remove-block-if-comments] ${relativePath}: ${removed} 블록 제거`);
		}
	}
	console.log(`[remove-block-if-comments] 완료: ${touchedFiles} 파일 / ${totalRemoved} 블록`);
}


main();
