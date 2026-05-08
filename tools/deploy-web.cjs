#!/usr/bin/env node
//==============================================================================
// 웹 빌드 (build/web) 를 원격 (NAS) 경로에 배포.
// - 대상 폴더 안의 모든 파일/디렉토리를 먼저 삭제한 뒤 build/web 의 내용을 복사한다.
// - 대상 경로는 DEPLOY_WEB_TARGET 환경변수로 오버라이드 가능. 미지정 시 기본값 사용.
// - 배포 전에 build/web 이 존재하지 않으면 즉시 종료.
//==============================================================================
"use strict";

const fs = require("fs");
const path = require("path");


//==============================================================================
// 기본 대상 경로. (DS216PLUSII Synology NAS 의 web 공유)
//==============================================================================
const DEFAULT_TARGET = "\\\\DS216PLUSII\\web\\minigame-collection";


//==============================================================================
// 메인.
//==============================================================================
function main() {
	const projectRoot = path.resolve(__dirname, "..");
	const sourceDirectory = path.join(projectRoot, "build", "web");
	const targetDirectory = process.env.DEPLOY_WEB_TARGET || DEFAULT_TARGET;

	console.log(`[deploy-web] source: ${sourceDirectory}`);
	console.log(`[deploy-web] target: ${targetDirectory}`);

	if (!fs.existsSync(sourceDirectory)) {
		console.error(`[deploy-web] 소스 디렉토리가 없습니다: ${sourceDirectory}`);
		console.error(`[deploy-web] 먼저 'npm run build:web' 을 실행하세요.`);
		process.exit(1);
	}
	const sourceStats = fs.statSync(sourceDirectory);
	if (!sourceStats.isDirectory()) {
		console.error(`[deploy-web] 소스가 디렉토리가 아닙니다: ${sourceDirectory}`);
		process.exit(1);
	}

	// 대상 디렉토리 보장.
	if (!fs.existsSync(targetDirectory)) {
		console.log(`[deploy-web] 대상 디렉토리가 없어 새로 생성합니다.`);
		fs.mkdirSync(targetDirectory, { recursive: true });
	}
	else {
		const targetStats = fs.statSync(targetDirectory);
		if (!targetStats.isDirectory()) {
			console.error(`[deploy-web] 대상이 디렉토리가 아닙니다: ${targetDirectory}`);
			process.exit(1);
		}
	}

	// 대상 디렉토리 내부 비우기. (디렉토리 자체는 유지)
	const existingEntries = fs.readdirSync(targetDirectory);
	let removedCount = 0;
	for (const entryName of existingEntries) {
		const entryPath = path.join(targetDirectory, entryName);
		fs.rmSync(entryPath, { recursive: true, force: true });
		removedCount += 1;
	}
	console.log(`[deploy-web] 기존 항목 ${removedCount} 개 제거 완료.`);

	// 소스 → 대상 복사.
	const sourceEntries = fs.readdirSync(sourceDirectory);
	let copiedFileCount = 0;
	let copiedTotalBytes = 0;
	for (const entryName of sourceEntries) {
		const sourceEntryPath = path.join(sourceDirectory, entryName);
		const targetEntryPath = path.join(targetDirectory, entryName);
		fs.cpSync(sourceEntryPath, targetEntryPath, { recursive: true, force: true });
		const summary = summarizeEntry(targetEntryPath);
		copiedFileCount += summary.fileCount;
		copiedTotalBytes += summary.totalBytes;
	}

	const totalKilobytes = (copiedTotalBytes / 1024).toFixed(1);
	console.log(`[deploy-web] 복사 완료: ${copiedFileCount} 파일 / ${totalKilobytes} KB`);
	console.log(`[deploy-web] 배포 완료.`);
}


//==============================================================================
// 디렉토리 또는 파일의 파일 수 / 총 바이트 계산.
//==============================================================================
function summarizeEntry(entryPath) {
	const stats = fs.statSync(entryPath);
	if (stats.isFile()) {
		return { fileCount: 1, totalBytes: stats.size };
	}
	if (!stats.isDirectory()) {
		return { fileCount: 0, totalBytes: 0 };
	}
	let fileCount = 0;
	let totalBytes = 0;
	const childNames = fs.readdirSync(entryPath);
	for (const childName of childNames) {
		const childPath = path.join(entryPath, childName);
		const childSummary = summarizeEntry(childPath);
		fileCount += childSummary.fileCount;
		totalBytes += childSummary.totalBytes;
	}
	return { fileCount: fileCount, totalBytes: totalBytes };
}


main();
