# woonyong.log

벨로그 사용자 블로그 화면을 기준으로 다시 구성한 Jekyll 기반 개발 블로그입니다. Jenkins가 Jekyll 빌드를 수행하고, 생성된 `_site/` 결과물을 `gh-pages` 브랜치로 배포합니다.

## 로컬 실행

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기본 주소는 `http://127.0.0.1:4000/blog/` 입니다.

## 빌드

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll build
```

빌드 결과물은 `_site/`에 생성됩니다.

## Jenkins 배포

1. Jenkins가 이 저장소의 `main` 브랜치를 읽도록 연결합니다.
2. Jenkins Credentials에 `github-pages` ID로 GitHub 사용자명과 PAT를 등록합니다.
3. GitHub Pages는 `gh-pages` 브랜치 `/ (root)`를 배포 소스로 지정합니다.

파이프라인은 다음 순서로 동작합니다.

- `BUNDLE_FORCE_RUBY_PLATFORM=true bundle install`
- `BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll build`
- 생성된 `_site/` 디렉터리를 `gh-pages` 브랜치 루트로 푸시

## 구조

- 사이트 설정: `_config.yml`
- 프로필 정보: `_data/profile.yml`
- 시리즈 정보: `_data/series.yml`
- 글: `_posts/`
- 레이아웃: `_layouts/`
- 공통 조각: `_includes/`
- 스타일과 스크립트: `assets/`
- Jenkins 배포: `Jenkinsfile`

## 참고

- GitHub Pages 프로젝트 페이지 경로 `/blog/`를 기준으로 `baseurl`이 설정되어 있습니다.
- 시각 구조와 색상 토큰은 [velog-io/velog](https://github.com/velog-io/velog) 오픈소스를 참고해 정적 블로그에 맞게 재구성했습니다.
