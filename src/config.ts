export const SITE = {
  website: "https://woonyong-kr.github.io/blog/",
  basePath: "/blog",
  author: "Woon Yong",
  profile: "https://github.com/woonyong-kr",
  desc: "프론트엔드, 자동화, 웹 플랫폼 작업을 기록하는 개발 블로그.",
  title: "woonyong.log",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 5,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "GitHub에서 수정",
    url: "https://github.com/woonyong-kr/blog/edit/main/",
  },
  dynamicOgImage: false,
  dir: "ltr", // "rtl" | "auto"
  lang: "ko",
  timezone: "Asia/Seoul",
} as const;
