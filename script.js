/**
 * ================================
 *
 * .site-bg（背景の丸い光）のオーブを、ページ全体に渡って複製配置する
 * [やりたいこと]
 * .site-bg は今やドキュメント全体（ページ全体の高さ）を覆う1枚の背景。
 * HTMLに書かれているオーブ3つ（orb-1〜3）はページ最上部用の1セットだけなので、
 * このままではスクロールして下の方に行くと、オーブが画面内に1つも
 * （もしくは1つしか）ない範囲ができてしまう。
 * そこで、画面の高さ分ずつ「オーブ3つのセット」を下方向へ複製していき、
 * どの位置までスクロールしても、常に3つ程度のオーブが
 * 画面内に見えている状態を作る。
 *
 * ================================
 */
function populateSiteBgOrbs() {
  // オーブは .site-bg 直下ではなく、ぼかし専用の内側ラッパー .site-bg-blur に入れる
  // （blurとmaskを同じ要素に重ねないための構造。詳細はstyle.css/index.htmlのコメント参照）
  const siteBgBlur = document.querySelector('.site-bg-blur');
  if (!siteBgBlur) return;

  // 前回（リサイズ時など）に複製した分は一度リセットして作り直す
  siteBgBlur.querySelectorAll('.orb[data-generated="true"]').forEach((el) => el.remove());

  const totalHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  // 1セットを配置する間隔。画面の高さより少し狭くすることで、
  // スクロール中も途切れずオーブが重なって見えるようにする
  const bandHeight = Math.max(viewportHeight * 0.7, 400);
  const bandCount = Math.ceil(totalHeight / bandHeight);

  // 最初の3つ（HTMLに書かれているオーブ）を「1セット分の見た目」のテンプレートにする
  const templates = [...siteBgBlur.querySelectorAll('.orb-1, .orb-2, .orb-3')];
  if (templates.length === 0) return;

  // 元の3つは先頭バンド(band 0)として扱い、位置を明示的に設定し直す
  templates.forEach((template, idx) => {
    template.style.top = `${(idx / templates.length) * bandHeight}px`;
    template.style.bottom = 'auto';
  });

  // band 1以降は複製して配置する
  for (let band = 1; band < bandCount; band++) {
    templates.forEach((template, idx) => {
      const clone = template.cloneNode(true);
      clone.setAttribute('data-generated', 'true');
      const top = band * bandHeight + (idx / templates.length) * bandHeight;
      clone.style.top = `${top}px`;
      clone.style.bottom = 'auto';
      // animationDelay は上書きしない。同じ役割（orb-1/2/3）のオーブは
      // 常にCSS側の元のdelay（0s/-5s/-10s）を共有し、全バンドで
      // 完全に同じタイミング・同じ動きをするようにする（挙動を揃えて予測しやすくするため）。
      siteBgBlur.appendChild(clone);
    });
  }
}

populateSiteBgOrbs();

/**
 * ================================
 *
 * Skillsセクション付近でオーブを透明にする（オーブ1つ1つのopacityを計算する方式）
 * [やりたいこと]
 * About Me / Works ではオーブの光を見せ、Skillsセクションの範囲だけ光を消したい。
 * しかも右上から左下へ向かう斜め方向に、境目がどこか分からないくらい
 * 長い距離でじわっと変化させたい。
 *
 * [以前の実装とその問題点]
 * 以前は .site-bg 全体に対して mask-image: linear-gradient(...) を使い、
 * 数十個のrgba()停止点を持つ非常になだらかな1枚の巨大グラデーションで
 * 透明度を変化させていた。しかしこの方法は、実際の25%ブラウザズームのような
 * 極端な縮小表示だと、数千pxにもわたる非常になだらかなアルファ変化を
 * ブラウザの描画エンジンが8bit精度でラスタライズしきれず、斜めの薄い
 * バンディング（縞）が本物の線のように見えてしまう問題があり、
 * STEPS（停止点の数）を減らしても解消しなかった。
 *
 * [今回の対策]
 * 数千pxにわたる巨大なCSSグラデーションを描画するのをやめ、
 * オーブ（.orb）1つ1つの opacity を、そのオーブの中心座標がSkillsセクションから
 * どれだけ離れているか（斜め方向）に応じてJS側で個別に計算してセットする方式にした。
 * opacityは要素単位の合成であり、長距離のアルファ勾配をラスタライズする
 * 必要がないため、上記のバンディングが原理的に発生しない。
 *
 * ================================
 */
const MASK_ANGLE_DEG = 130;
const maskAngleRad = (MASK_ANGLE_DEG * Math.PI) / 180;
const maskSin = Math.sin(maskAngleRad);
const maskCos = Math.cos(maskAngleRad);
// なめらかなS字カーブ（Ken Perlinのsmootherstep）。速度・加速度とも0に収束するため、
// 変化の継ぎ目が「マッハバンド」という目の錯覚で線のように見えるのを防ぐ。
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const ORB_BASE_OPACITY = 0.8; // .orb のCSS側opacityと合わせる（インラインで上書きするため）

function applyOrbFade() {
  const skills = document.querySelector('.skills');
  const siteBg = document.querySelector('.site-bg');
  const hero = document.querySelector('.hero');
  if (!skills || !siteBg) return;

  const width = siteBg.offsetWidth || window.innerWidth;
  // ページ全体の高さ（スクロールしても変わらない、ドキュメント全体の高さ）
  const height = document.documentElement.scrollHeight;
  const scrollY = window.scrollY || window.pageYOffset;
  const rect = skills.getBoundingClientRect();
  const skillsTop = rect.top + scrollY;
  const skillsBottom = rect.bottom + scrollY;
  const skillsHeight = skillsBottom - skillsTop;
  const heroBottom = hero ? hero.getBoundingClientRect().bottom + scrollY : 0;

  // フェード区間の長さ。Skillsセクションの高さの2.5倍という長い距離をかけて
  // 「ぼやっと」感じるくらいゆっくり変化させたいが、About MeやWorksの実際の高さより
  // 長くしてしまうと、フェードの開始/終了地点がHeroやフッターにまではみ出してしまう。
  // そのため、実際に使える範囲を超えないよう上限をかける。
  const desiredSpan = skillsHeight * 2.5;
  const spaceAboveSkills = skillsTop - heroBottom; // About Me セクションの高さ相当
  const spaceBelowSkills = height - skillsBottom; // Works〜ページ末尾までの高さ
  const transitionSpan = Math.max(
    200,
    Math.min(desiredSpan, spaceAboveSkills * 0.9, spaceBelowSkills * 0.9)
  );

  // CSSのlinear-gradient()と同じ計算式（グラデーションラインの全長）
  const lineLength = Math.abs(width * maskSin) + Math.abs(height * maskCos);

  // 座標(x, y)が、130deg方向のグラデーション軸上のどの位置(0〜1)に
  // 当たるかを求める（CSSのlinear-gradientの角度計算と同じ考え方）。
  const percentForXY = (x, y) => {
    const proj = (x - width / 2) * maskSin - (y - height / 2) * maskCos;
    return Math.max(0, Math.min(1, 0.5 + proj / lineLength));
  };

  const fadeOutStart = skillsTop - transitionSpan;
  const fadeOutEnd = skillsTop;
  const fadeInStart = skillsBottom;
  const fadeInEnd = skillsBottom + transitionSpan;

  // 各しきい値を、画面の水平中央(x = width/2)を基準にした%位置に変換しておく
  const pFadeOutStart = percentForXY(width / 2, fadeOutStart);
  const pFadeOutEnd = percentForXY(width / 2, fadeOutEnd);
  const pFadeInStart = percentForXY(width / 2, fadeInStart);
  const pFadeInEnd = percentForXY(width / 2, fadeInEnd);

  document.querySelectorAll('.orb').forEach((orb) => {
    // transform（浮遊アニメーション）はレイアウト上の位置に影響しないため、
    // offsetTop/Left/Width/Height はアニメーション中も安定した値になる
    const cx = orb.offsetLeft + orb.offsetWidth / 2;
    const cy = orb.offsetTop + orb.offsetHeight / 2;
    const p = percentForXY(cx, cy);

    let alpha;
    if (p <= pFadeOutStart || p >= pFadeInEnd) {
      alpha = 1;
    } else if (p >= pFadeOutEnd && p <= pFadeInStart) {
      alpha = 0;
    } else if (p < pFadeOutEnd) {
      const t = (p - pFadeOutStart) / (pFadeOutEnd - pFadeOutStart);
      alpha = 1 - smootherstep(t);
    } else {
      const t = (p - pFadeInStart) / (pFadeInEnd - pFadeInStart);
      alpha = smootherstep(t);
    }
    orb.style.opacity = String(alpha * ORB_BASE_OPACITY);
  });
}

applyOrbFade();
// レイアウトが変わる可能性のあるタイミング（画面サイズ変更・フォント読み込み完了）で
// オーブの配置とフェードの両方を再計算する
function refreshSiteBg() {
  populateSiteBgOrbs();
  applyOrbFade();
}
window.addEventListener('load', refreshSiteBg);
let siteBgResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(siteBgResizeTimer);
  siteBgResizeTimer = setTimeout(refreshSiteBg, 150);
});

/**
 * ================================
 *
 * ヘッダーのスクロール時のスタイル変更
 * [やりたいこと]
 * ページを少し下にスクロールしたら、ヘッダーの背景をすりガラス風に変化させる。
 * ユーザーがページトップにいる時はヘッダーを透明にしておく。
 *
 * ================================
 */
const header = document.querySelector('.js-header');

window.addEventListener('scroll', () => {
  // window.scrollYは、ページの一番上から現在どれだけスクロールされたか？をピクセル単位で
  // 返します。スクロール量が50pxを超えたかどうかで処理を分岐します。
  // console.log(window.scrollY);
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

/**
 * ================================
 *
 * ハンバーガーメニューの開閉
 *
 * ================================
 */

const navToggle = document.querySelector('.js-nav-toggle');
const nav = document.querySelector('.js-nav');
const navLinks = document.querySelectorAll('.js-nav-link');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    nav.classList.toggle('active');
    const isOpen = nav.classList.contains('active');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    // 開閉状態をaria-expandedに反映（スクリーンリーダー対応）
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  //グローバルメニュー内のリンクがクリックされたら
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      nav.classList.remove('active');
      document.body.style.overflow = '';
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * ================================
 *
 * スクロールアニメーション
 * (fadeInUp)
 * [やりたいこと]
 * ページをスクロールしていくと、各セクションがふわっと現れるようにする。
 * 最初から全部表示するのではなく、対象エレメントが画面に入ったタイミングで表示させます。
 *
 * ================================
 */

const observerOptions = {
  root: null, // null = ブラウザの表示領域(ビューポート)を監視の基準にする
  rootMargin: '0px', //監視範囲をビューポートの境界から何px広げるか(0px = ちょうど境界)
  threshold: 0.15, //0〜1の値で「要素が何割以上画面に入ったら反応するか」を指定
};

// new IntersectionObserver(コールバック関数, オプション)でobserverを作成します。
// コールバックは「監視対象の要素の状態が変わった時」に呼ばれる
const observer = new IntersectionObserver(
  // entriesは「状態が変化した要素のリスト」です。
  // 複数の要素を監視しているので、変化した要素が複数場合もあります。
  (entries, observer) => {
    entries.forEach((entry) => {
      // entry.isIntersectingは、「要素がいま、画面内に入っているか？」を表す true / false
      if (entry.isIntersecting) {
        //画面に入ってきた要素に、.is-visibleを追加する
        // → CSSに書かれた.fade-in.is-visibleのアニメーションが動き出す
        entry.target.classList.add('is-visible');
        // 一度アニメーションさせたら、その要素の監視を終了します。
        // これにより、スクロールバックしてもアニメーションが再び起きることはない
        // observer.unobserve(entry.target);
      } else {
        //画面外に出たら、'.is-visible'を削除してアニメーションをリセット
        // → 再び画面に入った時再アニメーションされる
        entry.target.classList.remove('is-visible');
      }
    });
  },
  observerOptions
);

// '.scroll-trigger'クラスが付いた要素をすべて取得し、
// 監視対象として登録します。
// observe()を呼ぶことでObserverが要素を「監視し始め」ます。
const fadeElements = document.querySelectorAll('.scroll-trigger');
fadeElements.forEach((el) => observer.observe(el));

/**
 * ================================
 *
 * フッターの年号を自動更新
 * [やりたいこと]
 * フッターのコピーーライトに表示される年号を
 * 毎年自動で最新の年になるようにする。
 *
 * ================================
 */

const yearSpan = document.getElementById('year');

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

/**
 * ================================
 *
 * ページトップへ戻るボタンの制御
 * [やりたいこと]
 * ページを少し下にスクロールしたら画面右下にボタンを表示させ、
 * クリックするとページの一番上になめらかにスクロールして戻る。
 *
 * ================================
 */

const pageTopBtn = document.querySelector('.js-page-top');

if (pageTopBtn) {
  //スクロールするたびにボタンの表示、非表示を切り替える
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      pageTopBtn.classList.add('is-visible');
    } else {
      pageTopBtn.classList.remove('is-visible');
    }
  });
  //ボタンがクリックされたらページの一番上にスムーズにスクロール
  pageTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });
}

/**
 * ================================
 *
 * モーダルウィンドウ
 * [やりたいこと]
 *
 *
 * ================================
 */

// 在庫管理アプリのヘッダーロゴと同じSVGアイコン（青グラデーションの正方形の中に配置する）
const inventoryIconSvg = `<svg class="icon-svg" viewBox="0 0 236.5 211" fill="none" aria-hidden="true" focusable="false">
  <path
    fill="white"
    d="M1235 2188 c-29 -17 -1099 -873 -1116 -894 l-14 -17 0 -43 0 -44 27
-27 28 -27 95 -4 95 -4 0 -480 0 -479 15 -29 c8 -16 24 -34 34 -40 l20 -10
293 0 294 0 27 28 27 28 2 329 3 330 222 3 222 2 3 -334 3 -334 24 -26 24 -26
301 0 300 0 28 27 28 27 0 492 0 492 96 4 97 4 28 32 29 32 0 29 c0 16 -3 37
-6 46 -4 9 -82 79 -175 156 l-168 140 -3 255 -3 256 -28 24 -28 24 -148 0
-148 0 -27 -25 -26 -24 0 -91 c0 -49 -4 -90 -8 -90 -5 0 -78 57 -163 127 -85
70 -169 137 -188 150 l-34 23 -31 0 c-17 0 -40 -6 -51 -12z m269 -258 c114
-93 215 -171 224 -171 33 -3 47 2 65 23 l17 20 0 119 0 120 103 -3 102 -3 5
-255 c3 -140 7 -256 8 -257 7 -6 202 -168 261 -216 39 -32 71 -62 71 -68 l0
-9 -89 0 -88 0 -27 -21 -26 -20 0 -493 0 -492 -12 -12 -12 -12 -243 0 -242 0
-11 19 -10 20 0 321 0 321 -25 24 -24 25 -260 0 -260 0 -28 -24 -28 -24 -5
-339 -5 -338 -255 0 -255 0 -5 497 -5 496 -24 26 -24 26 -94 0 -93 0 0 9 c0
15 1057 861 1076 861 6 0 105 -76 218 -170z"
    transform="translate(-10.5,220) scale(0.1,-0.1)"
  />
</svg>`;

// 作品データを配列で管理する
// DB や fetch('/api/works') から返ってくる JSON と同じ形式
// image: 実画像のパス（例: 'images/work1.jpg'）または URL を指定。
//        null の場合は icon（絵文字 or ブランドSVG）が代わりに表示される。
// iconType: 'brand-svg'（在庫管理アプリの実ロゴ）| 'emoji'（画像素材が未定の仮アイコン）
const worksData = [
  {
    id: 'work-1',
    title: 'やさしい在庫管理',
    category: 'Web App',
    status: '完成',
    image: null,
    iconType: 'brand-svg',
    desc: '商品の入出庫や在庫数をシンプルに管理できるWebアプリです。直感的な操作で、誰でも迷わず在庫状況を把握・更新できます。',
    link: 'https://coo-zaiko-kanri.vercel.app',
    presentationLink: 'docs/inventory-presentation.html',
    demoNote: '※デモ用パスワード：000000（管理者・スタッフ共通）',
  },
  {
    id: 'work-2',
    title: '学習ナレッジ活用ボット',
    category: 'DIFY / チャットフロー',
    status: '制作中',
    image: null,
    iconType: 'emoji',
    icon: '🤖',
    desc: '「ユーザーが質問してAIが答える」FAQボット。訓練校の制度に関するFAQ型 ＋ 学習サポート機能。',
    link: 'https://udify.app/chat/sebiWtYsa8rya6H3',
  },
  {
    id: 'work-3',
    title: 'grill-me',
    category: 'DIFY / チャットフロー',
    status: '制作中',
    image: null,
    iconType: 'emoji',
    icon: '🔥',
    desc: 'ユーザーのアイデアや計画について、AIが1つずつ質問を重ねていくことで、内容を具体的に整理・言語化していくチャットフロー型アプリです。',
    link: '#',
  },
  {
    id: 'work-4',
    title: '職務経歴書作成AI',
    category: 'Dify / チャットフロー',
    status: '制作中',
    image: null,
    iconType: 'emoji',
    icon: '📄',
    desc: 'ジョブカードや履歴書、過去の職務経歴書をもとに、見やすい形式の職務経歴書を自動で作成するチャットフロー型のAIアプリです。',
    link: '#',
  },
  {
    id: 'work-5',
    title: 'AI会議室',
    category: 'Dify / チャットフロー',
    status: '制作中',
    image: null,
    iconType: 'emoji',
    icon: '🗣️',
    desc: 'お題を投げかけると、AI同士が会議形式で議論してくれるチャットフローアプリです。現在は1種類の会議形式のみですが、今後3種類の会議フローから選べるように拡張予定です。',
    link: '#',
  },
];

// image が無い作品のアイコン（正方形の枠）を生成するヘルパー関数
// brand-svg: 青グラデーションの角丸枠 + 在庫管理アプリのロゴSVG
// emoji: 白背景の角丸枠 + 仮の絵文字（画像素材が用意され次第、差し替え予定）
function renderIconSquare(work) {
  if (work.iconType === 'brand-svg') {
    return `<div class="icon-square icon-square--brand">${inventoryIconSvg}</div>`;
  }
  return `<div class="icon-square icon-square--placeholder" aria-hidden="true"><span class="icon-emoji">${work.icon}</span></div>`;
}

// サムネイルの作品リストを表示する
const worksGrid = document.querySelector('.js-works-grid');

if (worksGrid) {
  // worksData 配列の各要素に対して繰り返し処理する
  // forEach の引数: work = その要素のオブジェクト / index = 何番目か（0始まり）
  worksData.forEach((work, index) => {
    // console.log(work, index);
    // サムネイルの HTML を切り替える（実画像 or アイコン）
    // .work-card の直接の子として配置する（間に灰色の枠のdivは挟みません）
    const thumbHtml = work.image
      ? `<img class="work-photo" src="${work.image}" alt="${work.title}のサムネイル">`
      : renderIconSquare(work);

    // status（制作中など）があればバッジHTMLを作る
    const statusBadgeHtml = work.status
      ? `<span class="work-status-badge">${work.status}</span>`
      : '';

    // document.createElement() で新しい button 要素を作成する
    const card = document.createElement('button');
    card.className = 'work-card js-modal-open';

    // data-index に「配列の何番目か」を記録する（クリック時に使う）
    card.dataset.index = index;

    card.innerHTML = `
            ${thumbHtml}
            <div class="work-info">
                <p class="work-category">${work.category}</p>
                <h4 class="work-title">${work.title}</h4>
            </div>
            ${statusBadgeHtml}
        `;

    // グリッドの末尾にカードを追加する
    worksGrid.appendChild(card);
  });
}

// クリックされたデータをモーダルウィンドウで表示する

const modal = document.querySelector('.js-modal');
const modalContent = document.querySelector('.js-modal-content');

// 現在表示中の作品が何番目かを記録する変数（0始まり）
let currentIndex = 0;

// サムネイル HTML を生成するヘルパー関数
// image があれば <img>、なければアイコン枠をそのまま返す（灰色の枠は挟みません）
function renderThumb(work) {
  if (work.image) {
    return `<img class="modal-thumb" src="${work.image}" alt="${work.title}のサムネイル">`;
  }
  return renderIconSquare(work);
}

// モーダルの中身を描画する関数
// worksData[index] で配列から直接データを取得できる（Object.keys が不要）
function renderModal(index) {
  const work = worksData[index];

  if (work) {
    const statusBadgeHtml = work.status
      ? `<span class="work-status-badge modal-status-badge">${work.status}</span>`
      : '';
    // presentationLink（企画資料など）があれば別タブで開くボタンを追加する
    const presentationLinkHtml = work.presentationLink
      ? `<a href="${work.presentationLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">企画資料を見る</a>`
      : '';
    // work.link が外部URL（http/https）の場合のみ別タブで開く（# はサイト内遷移なので対象外）
    const isExternalLink = /^https?:\/\//.test(work.link);
    const viewProjectAttrs = isExternalLink
      ? ' target="_blank" rel="noopener noreferrer"'
      : '';
    // デモ用パスワードなどの補足テキスト（あれば説明文の下・ボタンの上に表示する）
    const demoNoteHtml = work.demoNote
      ? `<p class="work-demo-note">${work.demoNote}</p>`
      : '';
    modalContent.innerHTML = `
            <div class="modal-content-inner">
                <div class="modal-thumb-wrapper">${renderThumb(work)}${statusBadgeHtml}</div>
                <p class="work-category" style="font-size: 0.9rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase;">${work.category}</p>
                <h3>${work.title}</h3>
                <p>${work.desc}</p>
                ${demoNoteHtml}
                <div class="modal-links">
                    <a href="${work.link}" class="btn btn-primary"${viewProjectAttrs}>View Project</a>
                    ${presentationLinkHtml}
                </div>
                <div class="modal-navigation">
                    <button class="btn btn-nav js-modal-prev" ${index === 0 ? 'disabled' : ''}>&larr; Prev</button>
                    <!-- worksData.length で配列の件数を取得する（Object.keys().length が不要） -->
                    <button class="btn btn-nav js-modal-next" ${index === worksData.length - 1 ? 'disabled' : ''}>Next &rarr;</button>
                </div>
            </div>
        `;

    // innerHTML を書き換えるたびに要素が作り直されるため、毎回ここでイベントを登録する
    const prevBtn = modalContent.querySelector('.js-modal-prev');
    const nextBtn = modalContent.querySelector('.js-modal-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderModal(currentIndex);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < worksData.length - 1) {
          currentIndex++;
          renderModal(currentIndex);
        }
      });
    }

    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

// ---- カードクリックでモーダルを開く（イベント委譲）----
// JS が後からカードを追加するため、個々のカードにイベントを付けると
// 追加前の要素には効かない。代わりに親要素（グリッド）にイベントを1つ登録する。
worksGrid &&
  worksGrid.addEventListener('click', (e) => {
    // e.target はクリックされた要素（カード内の img や p の場合もある）
    // closest('.js-modal-open') で「自分か祖先の中で最も近い .js-modal-open 要素」を取得する
    const card = e.target.closest('.js-modal-open');
    if (!card) return; // カード以外をクリックしたときは何もしない

    e.preventDefault();

    // dataset.index は文字列なので Number() で数値に変換する
    currentIndex = Number(card.dataset.index);
    renderModal(currentIndex);
  });

// ---- モーダルを閉じる ----
if (modal) {
  // 閉じるボタン・背景オーバーレイがクリックされたとき
  const modalCloseBtns = document.querySelectorAll(
    '.js-modal-close, .js-modal-close-trigger'
  );
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
  });

  // ESC キーが押されたときにモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-active')) {
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
}