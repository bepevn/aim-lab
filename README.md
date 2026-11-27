# AIM FORGE - 3D 에임 트레이너

브라우저에서 바로 실행되는 3D 에임 연습 게임 (그리드샷 / 플릭샷 / 트래킹 / 교전).

## 파일 구조
- `index.html` : 화면 구조
- `style.css`  : 디자인
- `game.js`    : 게임 로직
- `app.py`     : Streamlit 실행 파일
- `requirements.txt` : Streamlit 배포용 패키지 목록

## 실행
- 그냥 실행: `index.html`을 브라우저로 열기
- Streamlit: `pip install -r requirements.txt` 후 `streamlit run app.py`

## 조작
마우스 조준 · 좌클릭 사격 · ESC 일시정지 · R 재시작

## 교전 모드
WASD 이동 · Shift 걷기 · 좌클릭 연사 · R 재장전
- 피해량: 머리 160 / 몸통 40 / 다리 34, 내 체력 100 + 실드 50
- 난이도(쉬움/보통/어려움/지옥)에 따라 적 수, 반응속도, 명중률, 피해량, 체력이 달라짐
- 발소리는 좌우 스테레오로 들리므로 이어폰 추천
