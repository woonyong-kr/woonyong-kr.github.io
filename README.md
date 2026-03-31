# woonyong.log

AstroPaper를 기반으로 커스터마이징한 개발 블로그입니다. Jenkins가 Astro 정적 빌드를 수행하고, 결과물 `dist/`를 `gh-pages` 브랜치로 배포합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## Jenkins 배포

1. Jenkins가 이 저장소의 `main` 브랜치를 읽도록 연결합니다.
2. Jenkins Credentials에 `github-pages` ID로 GitHub 사용자명과 PAT를 등록합니다.
3. GitHub Pages는 `gh-pages` 브랜치 `/ (root)`를 배포 소스로 지정합니다.

파이프라인은 다음 순서로 동작합니다.

- `npm ci`
- `npm run build`
- 생성된 `dist/` 디렉터리를 `gh-pages` 브랜치 루트로 푸시

## 콘텐츠 위치

- 글: `src/data/articles/`
- 사이트 설정: `src/config.ts`
- Jenkins 배포: `Jenkinsfile`

## 메모

- 이 저장소는 GitHub Pages 프로젝트 페이지 경로 `/blog/`에 맞춰 base path가 설정되어 있습니다.
- 기본 테마는 [AstroPaper](https://github.com/satnaing/astro-paper)입니다.
