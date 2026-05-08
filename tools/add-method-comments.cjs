#!/usr/bin/env node
//==============================================================================
// 클래스 메서드 중 헤더 섹션 주석이 없는 것을 찾아 자동으로 추가.
// - 입력: 한 개 이상의 .js 파일 경로.
// - 검출: 인덴트 1 (탭 1 개) 레벨에서 시작하는 메서드 정의 (`\tname(args) {`).
// - 직전 5 줄 안에 섹션 주석 (`//===...`) 이 없으면 그 위에 섹션 주석 + 기본 JSDoc 삽입.
// - constructor / static / async / get / set 도 모두 처리.
// - 클래스 외부의 export function 도 동일 처리.
//==============================================================================
"use strict";

const fs = require("fs");

const SECTION_LINE = "//==============================================================================";

function processFile(filePath) {
	const original = fs.readFileSync(filePath, "utf8");
	const lines = original.split(/\r?\n/);
	const output = [];
	let modified = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const matchClassMethod = line.match(/^(\t)((?:static\s+|async\s+|get\s+|set\s+)*)([a-zA-Z_$#][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/);
		const matchExportFunction = line.match(/^()(export\s+(?:async\s+)?function\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/);
		const m = matchClassMethod || matchExportFunction;
		if (m) {
			const indent = m[1];
			const modifiers = m[2] || "";
			const methodName = m[3];
			const paramsRaw = m[4];

			// 직전 5 줄 안에 섹션 주석 있는지 확인.
			let hasSection = false;
			for (let j = i - 1; j >= 0 && j > i - 8; j--) {
				const back = lines[j];
				if (back === undefined) {
					break;
				}
				if (/^\s*\/\/={5,}/.test(back)) {
					hasSection = true;
					break;
				}
				// JSDoc 블록 또는 빈 줄은 스킵해서 더 위까지 본다.
				if (/^\s*$/.test(back) || /^\s*\/\*\*/.test(back) || /^\s*\*/.test(back) || /^\s*\*\//.test(back)) {
					continue;
				}
				// 다른 코드 라인을 만나면 섹션 주석이 없는 걸로 본다.
				break;
			}
			if (!hasSection) {
				// 섹션 주석 + JSDoc 삽입.
				output.push(`${indent}${SECTION_LINE}`);
				output.push(`${indent}// ${methodName}.`);
				output.push(`${indent}${SECTION_LINE}`);
				const params = paramsRaw
					.split(",")
					.map(p => p.trim())
					.filter(p => p.length > 0)
					.map(p => p.replace(/=.*$/, "").trim())
					.map(p => p.replace(/^\.\.\./, ""))
					.filter(p => p.length > 0);
				if (params.length > 0) {
					output.push(`${indent}/**`);
					for (const param of params) {
						output.push(`${indent} * @param { * } ${param}`);
					}
					output.push(`${indent} */`);
				}
				modified = true;
			}
		}
		output.push(line);
	}

	if (modified) {
		fs.writeFileSync(filePath, output.join("\n"), "utf8");
		console.log(`updated: ${filePath}`);
		return 1;
	}
	return 0;
}


function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error("usage: node add-method-comments.cjs <file...>");
		process.exit(1);
	}
	let totalUpdated = 0;
	for (const arg of args) {
		totalUpdated += processFile(arg);
	}
	console.log(`total updated: ${totalUpdated}`);
}

main();
