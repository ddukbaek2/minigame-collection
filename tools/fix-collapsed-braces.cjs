#!/usr/bin/env node
//==============================================================================
// 직전 일괄 변환에서 `}` 와 다른 닫는 브레이스가 한 줄에 붙은 잔재를 분리.
// - 패턴: `<indent>}<whitespace>}` (또는 그 이상 연속).
// - 첫 `}` 의 indent 를 기준으로 두 번째 `}` 는 indent 에서 탭 1 개를 줄여 다음 줄에 둔다.
//==============================================================================
"use strict";

const fs = require("fs");

function processFile(filePath) {
	const original = fs.readFileSync(filePath, "utf8");
	const lines = original.split(/\r?\n/);
	const output = [];
	let modified = false;
	for (const line of lines) {
		// 라인이 `}<whitespace>}` 으로 시작하면서 그 뒤에 추가 `}` 가 더 붙어 있을 수 있음.
		const matchHead = line.match(/^(\t*)\}(\s+)/);
		if (matchHead && /\}\s*$/.test(line.replace(matchHead[0], "}"))) {
			const indent = matchHead[1];
			let rest = line.substring(matchHead[0].length);
			let firstEmitted = false;
			let currentIndent = indent;
			output.push(`${indent}}`);
			firstEmitted = true;
			while (rest.length > 0) {
				const innerMatch = rest.match(/^(\}+)(\s*)/);
				if (!innerMatch) {
					break;
				}
				const closes = innerMatch[1];
				rest = rest.substring(innerMatch[0].length);
				for (const ch of closes) {
					currentIndent = currentIndent.length > 0 ? currentIndent.substring(0, currentIndent.length - 1) : "";
					output.push(`${currentIndent}}`);
				}
				if (rest.length > 0 && !/^\s/.test(rest)) {
					break;
				}
			}
			if (rest.length > 0) {
				output[output.length - 1] = output[output.length - 1] + rest;
			}
			modified = true;
		}
		else {
			output.push(line);
		}
	}
	if (modified) {
		fs.writeFileSync(filePath, output.join("\n"), "utf8");
		console.log(`fixed: ${filePath}`);
		return 1;
	}
	return 0;
}


function main() {
	const args = process.argv.slice(2);
	let total = 0;
	for (const arg of args) {
		total += processFile(arg);
	}
	console.log(`total fixed: ${total}`);
}

main();
