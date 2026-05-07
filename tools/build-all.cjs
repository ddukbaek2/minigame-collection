#!/usr/bin/env node
//==============================================================================
// 전체 플랫폼 빌드.
// - 한 번만 patch 버전 bump.
// - 이후 build:web → build:ait → build:aab:onestore 를 순차 실행.
//   각 자식 build:* 의 자체 bump 는 SKIP_BUMP=1 환경변수로 우회.
// - 어느 단계라도 실패하면 즉시 중단.
//==============================================================================
"use strict";
const path = require("path");
const { spawnSync } = require("child_process");

const isWindows = process.platform === "win32";
const projectRoot = path.resolve(__dirname, "..");


function run(command, args, env) {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		shell: isWindows,
		cwd: projectRoot,
		env: env || process.env,
	});
	if (result.status !== 0) {
		const code = result.status === null ? 1 : result.status;
		console.error(`[build-all] '${command} ${args.join(" ")}' 실패 (exit ${code}).`);
		process.exit(code);
	}
}


// 1) 한 번만 bump.
run("node", ["tools/bump-version.cjs"]);

// 2) 자식 빌드들 (자체 bump 는 skip).
const childEnv = { ...process.env, SKIP_BUMP: "1" };
const tasks = ["build:web", "build:ait", "build:aab:onestore"];
for (const task of tasks) {
	console.log(`\n[build-all] >>> ${task}`);
	run("npm", ["run", task], childEnv);
}

console.log("\n[build-all] 모든 플랫폼 빌드 완료.");
