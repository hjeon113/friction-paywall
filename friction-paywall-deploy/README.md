# Friction Paywall — 배포 가이드

먼저 중요한 전제: **GitHub Pages 단독으로는 안 됩니다.** GitHub Pages는 정적 파일만 올라가는 호스팅이라 서버가 없고, 이 페이지가 쓰는 두 기능 — 1) 참가자 질문에 실제 AI가 답하는 것, 2) 세션 데이터 자동 기록 — 은 둘 다 서버(또는 서버 역할을 하는 서비스)가 필요합니다.

그래서 구성은 이렇게 갑니다.

- **GitHub** — 코드를 올려두는 곳 (지금 이 폴더 전체)
- **Vercel** — 그 GitHub 레포를 그대로 가져다가 실제로 띄워주는 곳. `index.html`은 그대로 서빙하고, `api/answer.js`는 서버 함수로 돌려줌 (여기서 API 키를 안전하게 숨김)
- **Firebase (Firestore)** — 세션 기록을 저장하는 데이터베이스

세 개 다 무료 티어로 충분합니다. 아래 순서대로 하면 됩니다.

## 1. Firebase 프로젝트 만들기 (기록 저장용)

1. https://console.firebase.google.com 에서 "프로젝트 추가" → 아무 이름이나 (예: `friction-paywall`)
2. 왼쪽 메뉴에서 **Firestore Database** → "데이터베이스 만들기" → **테스트 모드**로 시작 (나중에 규칙을 아래 걸로 바꿀 거예요)
3. 왼쪽 위 톱니바퀴 → **프로젝트 설정** → 아래로 내려서 "내 앱" → `</>` (웹 앱) 아이콘 클릭 → 앱 등록 (이름 아무거나)
4. 화면에 나오는 `firebaseConfig` 객체를 통째로 복사
5. 이 폴더의 `index.html`을 열어서 `const firebaseConfig = { ... }` 부분을 방금 복사한 값으로 교체

6. Firestore → **규칙(Rules)** 탭으로 가서 아래 내용으로 바꾸고 게시(Publish):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
  }
}
```

   ⚠️ 이 규칙은 로그인 없이 누구나 읽고 쓸 수 있게 완전히 열어둔 거예요. 수업용 단기 실험이라 그렇게 한 거고, **실험 끝나면 이 Firebase 프로젝트는 지우거나 비활성화**하는 걸 권장합니다. (지우는 법: 프로젝트 설정 맨 아래 "프로젝트 삭제")

## 2. Anthropic API 키 발급 (실제 AI 답변용)

1. https://console.anthropic.com → API Keys → 새 키 발급
2. 발급된 키는 복사해두고, **절대 index.html이나 GitHub에는 넣지 마세요.** 아래 4단계에서 Vercel 환경변수로만 넣습니다.
3. 참고: API는 유료입니다 (참가자가 많으면 비용이 좀 나올 수 있어요 — 보통 질문 하나당 몇 센트 수준). console.anthropic.com에서 크레딧을 충전해야 호출이 됩니다.

## 3. GitHub에 올리기

이 폴더(`friction-paywall-deploy`) 전체를 새 GitHub 레포로 올립니다.

```
cd friction-paywall-deploy
git init
git add .
git commit -m "Friction Paywall"
git branch -M main
git remote add origin https://github.com/<본인계정>/<레포이름>.git
git push -u origin main
```

(GitHub Desktop 앱을 쓰신다면 그냥 이 폴더를 새 레포로 만들어서 올리셔도 됩니다.)

## 4. Vercel로 배포

1. https://vercel.com 에서 GitHub 계정으로 로그인
2. "Add New..." → "Project" → 방금 올린 레포 선택 → Import
3. 설정 화면에서 **Environment Variables**에 추가:
   - `ANTHROPIC_API_KEY` = 2단계에서 발급받은 키
   - (선택) `ANTHROPIC_MODEL` = 특정 모델을 쓰고 싶으면 모델 이름. 안 넣으면 기본값(`claude-3-5-sonnet-20241022`) 사용. 정확한 최신 모델 이름은 console.anthropic.com에서 확인하세요.
4. Deploy 클릭. 1분 정도면 끝나고, `https://프로젝트이름.vercel.app` 같은 주소가 생깁니다.

**이 Vercel 주소가 참가자한테 줄 실제 링크예요.**

## 5. 확인

- 배포된 주소를 열어서 질문 → 레벨 선택 → FC 벌기 → 실제 답변이 뜨는지 확인
- 세션 하나 저장해보고, 같은 주소 뒤에 `#log`를 붙여서 열면 (`https://프로젝트이름.vercel.app/#log`) 저장된 세션이 보이는지 확인
- Firebase 콘솔 → Firestore Database → `sessions` 컬렉션에도 똑같은 데이터가 쌓이는지 확인 (여기서 직접 봐도 되고, 엑셀로 내보내고 싶으면 Firestore 콘솔에서 내보내기도 가능)

## 코드를 다시 고치고 싶을 때

`index.html`이나 `api/answer.js`를 수정한 뒤 GitHub에 push만 하면 Vercel이 자동으로 다시 배포합니다 (별도 작업 불필요).

## 참고: claude.ai 버전과의 차이

원래 claude.ai 아티팩트 버전은 `db`/`sample`이라는 아티팩트 전용 기능을 썼는데, 이 버전은 그 두 개를 각각 Firestore(기록)와 Vercel 서버 함수(AI 답변)로 바꿔 끼운 것뿐이라 동작과 디자인은 동일합니다.
