# 게임방 — 양세찬 게임 · 골드러쉬

로그인 없이 링크 하나로 친구들과 모이는 파티 게임 서버예요. Node.js 서버 하나가 로비와 두 게임을 모두 서빙해요.

## 내 컴퓨터에서 실행

```bash
npm install
npm start
```

`http://localhost:3000`에서 열려요.

## Render에 올리기 (무료, 24시간)

1. 이 폴더를 GitHub 저장소에 올려요.
2. [Render](https://render.com)에 GitHub 계정으로 로그인해요.
3. **New → Blueprint**에서 이 저장소를 고르고 **Apply**를 눌러요. `render.yaml`에 설정이 들어 있어서 따로 입력할 건 없어요.
4. 배포가 끝나면 `https://party-games-xxxx.onrender.com` 같은 주소가 생겨요. 이 주소를 친구들에게 공유하면 돼요.

GitHub에 새로 올린 커밋은 Render가 자동으로 다시 배포해요.

무료 플랜은 15분 동안 아무도 접속하지 않으면 잠들어요. 다음 사람이 열면 30~60초 뒤에 깨어나요. 게임 중에는 연결이 유지되니 잠들지 않아요.

## 참고

- 게임 상태는 서버 메모리에만 있어요. 서버가 잠들거나 다시 배포되면 진행 중이던 방은 사라져요.
- 골드러쉬 규칙 수치는 `games/gold.js` 맨 위 상수(`LAYER_COUNTS`, `DECK_SPEC`, `GOLD_CHANCE`)에서 바꿀 수 있어요.
