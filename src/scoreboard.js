//==============================================================================
// 스코어보드.
// - 각 게임 GameId 별 누적 총점을 LocalStorage 에 영속화.
// - 게임 종료 시 main.showResult 가 활성 파트의 GameId 누적값에 자동 가산한다.
// - 키는 PartId 가 아니라 GameId 를 쓴다. 게임이 추가/제거되어도 살아있는 게임의
//   저장 키가 흔들리지 않도록 GameId 를 단일 진실 원천으로 유지하기 위함.
//==============================================================================
const System = globalThis;


//==============================================================================
// 저장 키.
//==============================================================================
const STORAGE_KEY = "minigame-collection.scoreboard";


//==============================================================================
// 상태.
// - totals[gameId]      = 누적 총점.
// - playCounts[gameId]  = 플레이 횟수.
//==============================================================================
const state = { totals: {}, playCounts: {} };
/** @type { Set<(gameId: string) => void> } */
const listeners = new System.Set();


//==============================================================================
// 초기 로드.
//==============================================================================
try {
	const saved = System.localStorage.getItem(STORAGE_KEY);
	if (saved) {
		const parsed = JSON.parse(saved);
		if (parsed && typeof parsed === "object") {
			if (parsed.totals && typeof parsed.totals === "object") {
				for (const key of System.Object.keys(parsed.totals)) {
					const value = System.Number(parsed.totals[key]);
					if (System.Number.isFinite(value)) {
						state.totals[key] = value;
					}
				}
			}
			if (parsed.playCounts && typeof parsed.playCounts === "object") {
				for (const key of System.Object.keys(parsed.playCounts)) {
					const value = System.Number(parsed.playCounts[key]);
					if (System.Number.isFinite(value)) {
						state.playCounts[key] = value;
					}
				}
			}
		}
	}
}
catch (error) {
	// 무시.
}


//==============================================================================
// 저장.
//==============================================================================
function persist() {
	try {
		System.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}
	catch (error) {
		// 무시.
	}
}


//==============================================================================
// GameId 의 누적 총점 반환. 미등록이면 0.
//==============================================================================
/**
 * @param { string } gameId
 * @returns { number }
 */
export function getTotalScore(gameId) {
	const value = state.totals[gameId];
	return System.Number.isFinite(value) ? value : 0;
}


//==============================================================================
// 점수 가산. (음수/0/NaN/유효하지 않은 gameId 는 무시)
//==============================================================================
/**
 * @param { string } gameId
 * @param { number } score
 */
export function addScore(gameId, score) {
	if (!gameId) return;
	const numeric = System.Number(score);
	if (!System.Number.isFinite(numeric) || numeric <= 0) return;
	state.totals[gameId] = getTotalScore(gameId) + numeric;
	persist();
	notify(gameId);
}


//==============================================================================
// 플레이 횟수 가산. 결과 팝업이 한 번 뜰 때마다 +1.
//==============================================================================
/**
 * @param { string } gameId
 */
export function addPlay(gameId) {
	if (!gameId) return;
	state.playCounts[gameId] = getPlayCount(gameId) + 1;
	persist();
	notify(gameId);
}


//==============================================================================
// 플레이 횟수 반환.
//==============================================================================
/**
 * @param { string } gameId
 * @returns { number }
 */
export function getPlayCount(gameId) {
	const value = state.playCounts[gameId];
	return System.Number.isFinite(value) ? value : 0;
}


//==============================================================================
// 변경 알림.
//==============================================================================
function notify(gameId) {
	for (const listener of listeners) {
		try {
			listener(gameId);
		}
		catch (error) {
			console.error("[scoreboard]", error);
		}
	}
}


//==============================================================================
// 모든 총점 반환. (참조 사본)
//==============================================================================
export function getAllTotals() {
	return { ...state.totals };
}


//==============================================================================
// 변경 리스너 등록 / 해제.
//==============================================================================
/**
 * @param { (gameId: string, total: number) => void } listener
 */
export function addScoreChangeListener(listener) {
	listeners.add(listener);
}

/**
 * @param { (gameId: string, total: number) => void } listener
 */
export function removeScoreChangeListener(listener) {
	listeners.delete(listener);
}
