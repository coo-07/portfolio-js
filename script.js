/**
 * ================================
 *
 * 背景の丸い光（オーブ）を、ページ全体に途切れず配置する
 * [やりたいこと]
 * .site-bg はドキュメント全体を覆う1枚の背景で、HTMLに書かれた3つの
 * オーブ（.orb-master、実際には非表示の「型紙」）を元に、スクロールしても
 * 常に3つ程度画面に見えるよう縦方向に複製配置する。
 * オーブ自体はページのどこでも常に同じ見た目（ぼかした光の玉）のままで、
 * Skills付近で透明にする・マスクするといった特別処理は一切行わない
 * （そのためSkills内を白くする処理は .skills-white-panel が別途担当する。
 * 　下の updateSkillsWhitePanel() 参照）。
 *
 * ================================
 */
function populateSiteBgOrbs() {
  const siteBgBlur = document.querySelector('.site-bg-blur');
  if (!siteBgBlur) return;

  // 前回（リサイズ時など）に複製した分は一度リセットして作り直す
  siteBgBlur.querySelectorAll('.orb[data-generated="true"]').forEach((el) => el.remove());

  // 型紙（非表示の.orb-master）からサイズ・背景・アニメーションを引き継ぐ。
  const masters = [...siteBgBlur.querySelectorAll('.orb-master')];
  if (masters.length === 0) return;

  const totalHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  // 1セットを配置する間隔。画面の高さより少し狭くすることで、
  // スクロール中も途切れずオーブが重なって見えるようにする
  const bandHeight = Math.max(viewportHeight * 0.7, 400);
  const bandCount = Math.ceil(totalHeight / bandHeight);

  for (let band = 0; band < bandCount; band++) {
    masters.forEach((master, idx) => {
      const clone = master.cloneNode(false);
      clone.classList.remove('orb-master');
      clone.setAttribute('data-generated', 'true');
      clone.style.visibility = 'visible';
      const top = band * bandHeight + (idx / masters.length) * bandHeight;
      clone.style.top = `${top}px`;
      clone.style.bottom = 'auto';
      // animationDelay は上書きしない。同じ役割（orb-1/2/3）のオーブは
      // 常にCSS側の元のdelay（0s/-5s/-10s）を共有し、全バンドで
      // 完全に同じタイミング・同じ動きをするようにする（挙動を揃えて予測しやすくするため）。
      siteBgBlur.appendChild(clone);
    });
  }
}

/**
 * ================================
 *
 * Skillsセクションの背後の白いパネルを、斜め方向になめらかにフェードさせる
 * [やりたいこと]
 * Skills内を完全に白くしつつ、About Me / Worksとの境目を水平なラインではなく、
 * 「左下から右上へ上がる斜めの平行線」にしたい。ただし境目は輪郭線として
 * 見せず、白い背景そのものが斜めに溶けるように少しずつ消えていく見た目にする
 * （消えた部分からは、下に漂うオーブの色がそのまま自然に透けて見える）。
 * 上側の境目はAbout Meの内容とSkills見出しのちょうど中間、下側の境目は
 * Skillsカード下端とWorks見出しのちょうど中間を通し、どちらのコンテンツにも
 * 重ならない・ぼかさないようにする。上下の傾きは同じ角度の平行線にする。
 *
 * [仕組み]
 * .skills-white-panel（不透明な白の帯）に mask-image: linear-gradient(...) を
 * かけ、上端・下端をそれぞれ「透明→不透明」「不透明→透明」へなめらかに
 * フェードさせる。グラデーションの角度は上下の境界線の傾き（tilt）に対して
 * 垂直になるよう計算しているので、フェードそのものが斜めのラインに沿う。
 * フェード幅は数十px程度と短いため、以前の「ページ全体を覆う巨大なmask」で
 * 起きたグラデーションのバンディング問題はここでは発生しない。
 * （以前試した、白いぼかし光を上から重ねる方式は、輪郭は隠せても
 * 　別の白いボケ帯という新たな見た目の問題を生んでしまったため撤去した）。
 *
 * ================================
 */
// フェード（不透明⇔透明の変化）にかける距離（px）。この幅の中で
// 白背景が徐々に消えていく。背景のオーブ自体のfilter: blur(80px)による
// ぼやけ方（中心から外側へ、かなり広い範囲でゆっくり透明になっていく）と
// 同じくらいの柔らかさに見せるため、意図的に広めの値にしている。
const SKILLS_FADE_WIDTH = 260;
// フェードの中を何段階で区切るか。滑らかなS字カーブ（smootherstep）を
// 複数の色停止点で近似することで、境目に「線」が見えるのを防ぐ
// （2点だけの直線的なグラデーションだと、変化が始まる/終わる瞬間に
// 　速度が不連続にジャンプし、そこがマッハバンドという目の錯覚で
// 　薄い線のように見えてしまうため）。
const SKILLS_FADE_STEPS = 8;
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function updateSkillsWhitePanel() {
  const about = document.querySelector('.about');
  const skills = document.querySelector('.skills');
  const skillsHeading = skills ? skills.querySelector('.section-title') : null;
  const skillsGrid = document.querySelector('.skills-grid');
  const works = document.querySelector('.works');
  const worksHeading = works ? works.querySelector('.section-title') : null;
  const panel = document.querySelector('.skills-white-panel');
  if (!about || !skills || !skillsHeading || !skillsGrid || !worksHeading || !panel) return;

  const scrollY = window.scrollY || window.pageYOffset;
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  const docBottom = (el) => el.getBoundingClientRect().bottom + scrollY;

  const aboutBottom = docBottom(about);
  const skillsHeadingTop = docTop(skillsHeading);
  const skillsCardsBottom = docBottom(skillsGrid);
  const worksHeadingTop = docTop(worksHeading);

  const width = panel.offsetWidth || window.innerWidth;

  // 上側の境目の中心：About Meの内容とSkills見出しのちょうど中間
  const topCenter = (aboutBottom + skillsHeadingTop) / 2;
  const topGap = Math.max(0, skillsHeadingTop - aboutBottom);
  // 下側の境目の中心：Skillsカード下端とWorks見出しのちょうど中間
  const bottomCenter = (skillsCardsBottom + worksHeadingTop) / 2;
  const bottomGap = Math.max(0, worksHeadingTop - skillsCardsBottom);

  // 傾きの強さ。画面幅に比例させ、はっきり斜めとわかる強さを狙う。
  const desiredTilt = width * 0.22;
  // ただし、上下どちらの隙間からもコンテンツにかからないよう、
  // 隙間の広さ（フェード幅・安全マージン込み）で上限をクランプする。
  // 上下は同じ角度の平行線にするため、狭い方の隙間に合わせて共通のtiltを使う。
  const SAFETY = 16;
  const maxTiltFromGap = (gap) => Math.max(0, gap - SKILLS_FADE_WIDTH - SAFETY * 2);
  const tilt = Math.max(0, Math.min(desiredTilt, maxTiltFromGap(topGap), maxTiltFromGap(bottomGap)));

  const margin = tilt / 2 + SKILLS_FADE_WIDTH / 2 + SAFETY;
  const panelTop = topCenter - margin;
  const panelHeight = bottomCenter + margin - panelTop;

  panel.style.top = `${panelTop}px`;
  panel.style.height = `${panelHeight}px`;

  // 境界線（tilt分だけ傾いた直線）に対して垂直な向きを、
  // CSSのlinear-gradientの角度（0deg=上向き、時計回り）で表す。
  const angleDeg = 180 - (Math.atan2(tilt, width) * 180) / Math.PI;
  const angleRad = (angleDeg * Math.PI) / 180;
  const sin = Math.sin(angleRad);
  const cos = Math.cos(angleRad);
  const lineLength = Math.abs(width * sin) + Math.abs(panelHeight * cos);

  // パネル内のローカル座標(x, y)が、このグラデーションの何%地点に
  // 当たるかを求める（CSSのlinear-gradientの角度計算と同じ考え方）。
  const percentForXY = (x, y) => {
    const proj = (x - width / 2) * sin - (y - panelHeight / 2) * cos;
    return Math.max(0, Math.min(100, (0.5 + proj / lineLength) * 100));
  };

  // パネル内ローカル座標での、上辺・下辺の境界線の中心位置(x=width/2上)
  const topLineY = topCenter - panelTop;
  const bottomLineY = bottomCenter - panelTop;
  const cx = width / 2;

  // 上辺・下辺それぞれのフェード区間を、smootherstepでイージングした
  // 複数の色停止点として書き出す（単純な2点直線グラデーションにしない）。
  const stops = ['transparent 0%'];
  for (let i = 0; i <= SKILLS_FADE_STEPS; i++) {
    const t = i / SKILLS_FADE_STEPS;
    const y = topLineY - SKILLS_FADE_WIDTH / 2 + t * SKILLS_FADE_WIDTH;
    const alpha = smootherstep(t).toFixed(3);
    stops.push(`rgba(0,0,0,${alpha}) ${percentForXY(cx, y).toFixed(2)}%`);
  }
  for (let i = 0; i <= SKILLS_FADE_STEPS; i++) {
    const t = i / SKILLS_FADE_STEPS;
    const y = bottomLineY - SKILLS_FADE_WIDTH / 2 + t * SKILLS_FADE_WIDTH;
    const alpha = (1 - smootherstep(t)).toFixed(3);
    stops.push(`rgba(0,0,0,${alpha}) ${percentForXY(cx, y).toFixed(2)}%`);
  }
  stops.push('transparent 100%');

  const mask = `linear-gradient(${angleDeg.toFixed(2)}deg, ${stops.join(', ')})`;
  panel.style.maskImage = mask;
  panel.style.webkitMaskImage = mask;
}

function refreshSiteBg() {
  populateSiteBgOrbs();
  updateSkillsWhitePanel();
}
refreshSiteBg();
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
    slug: 'zaiko',
    title: 'やさしい在庫管理',
    category: 'Web App',
    status: '完成',
    image: null,
    iconType: 'brand-svg',
    desc: '商品の入出庫や在庫数をシンプルに管理できるWebアプリです。\n直感的な操作で、誰でも迷わず在庫状況を把握・更新できます。',
    link: 'https://coo-zaiko-kanri.vercel.app',
    presentationLink: 'docs/portfolio_zaiko.html',
    presentationLinkLabel: '開発資料を見る',
    linksNote: '実際に操作したい方はアプリへ、開発の経緯を詳しく知りたい方は資料をご覧ください。',
    demoNote: '※デモ用パスワード：000000（管理者・スタッフ共通）',
  },
  {
    id: 'work-2',
    title: '学習ナレッジ活用ボット',
    category: 'DIFY / チャットフロー',
    status: '完成',
    image: null,
    iconType: 'emoji',
    icon: '🤖',
    desc: '・架空のIT企業「にゃんだふる」の社内制度に関する質問\n・HTML/CSS・JavaScript・TypeScript・Reactなど学習内容に関する質問\nの両方に答えられるFAQ型チャットボットです。\n社内規定の問い合わせ対応と、学習内容の復習サポートを1つのボットで兼ねています。',
    link: 'https://udify.app/chat/sebiWtYsa8rya6H3',
    linksNote: '※Dify上で動作する外部アプリのため、ポートフォリオへは開いたタブを閉じてお戻りください。',
  },
  {
    id: 'work-3',
    title: 'grill-me',
    category: 'DIFY / チャットフロー',
    status: '完成',
    image: null,
    iconType: 'emoji',
    icon: '🔥',
    desc: 'AIとの対話を通じて、アイデアを一緒に育てていく壁打ち用チャットボットです。\n・作りたいものの方向性がまだ曖昧な段階では発想を広げる質問を、\n・方向性が固まってきた段階では仕様や機能を詰める質問を投げかけ、\n思考の整理をサポートします。',
    link: 'https://udify.app/chat/iwbtIklPH7PMsLyy',
    linksNote: '※Dify上で動作する外部アプリのため、ポートフォリオへは開いたタブを閉じてお戻りください。',
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

    // 「完成」は基本状態として扱い、バッジは出さない。未完成のものだけ目立たせる。
    const statusBadgeHtml = work.status && work.status !== '完成'
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
    // 「完成」は基本状態として扱い、バッジは出さない。未完成のものだけ目立たせる。
    const statusBadgeHtml = work.status && work.status !== '完成'
      ? `<span class="work-status-badge modal-status-badge">${work.status}</span>`
      : '';
    // presentationLink（企画資料など）があれば別タブで開くボタンを追加する
    const presentationLinkHtml = work.presentationLink
      ? `<a href="${work.presentationLink}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">${work.presentationLinkLabel || '企画資料を見る'}</a>`
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
    // ボタンの使い分けを案内する一言（あればボタンの直上に表示する）
    const linksNoteHtml = work.linksNote
      ? `<p class="work-links-note">${work.linksNote}</p>`
      : '';
    modalContent.innerHTML = `
            <div class="modal-content-inner">
                <div class="modal-thumb-wrapper">${renderThumb(work)}${statusBadgeHtml}</div>
                <p class="work-category" style="font-size: 0.9rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase;">${work.category}</p>
                <h3>${work.title}</h3>
                <p class="work-desc">${work.desc}</p>
                ${demoNoteHtml}
                ${linksNoteHtml}
                <div class="modal-links">
                    <a href="${work.link}" class="btn btn-primary"${viewProjectAttrs}>アプリを見る</a>
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

// ---- URL（#project=slug）からモーダルを直接開く ----
// アプリ画面・資料ページの「←ポートフォリオに戻る」がこの形式のURLに
// 遷移してくることで、Works一覧のトップではなく該当モーダルに直接戻れるようにする。
function openModalFromHash() {
  const match = location.hash.match(/^#project=(.+)$/);
  if (!match) return;

  const index = worksData.findIndex((w) => w.slug === match[1]);
  if (index === -1) return;

  currentIndex = index;
  renderModal(currentIndex);

  // モーダルを閉じたときにWorks一覧（該当カード）が見えているように、
  // 背景側のスクロール位置も合わせておく（モーダルの裏なので見た目には影響しない）
  const card = worksGrid && worksGrid.querySelector(`[data-index="${index}"]`);
  if (card) {
    card.scrollIntoView({ block: 'center' });
  } else {
    const worksSection = document.getElementById('works');
    if (worksSection) worksSection.scrollIntoView();
  }
}
openModalFromHash();
window.addEventListener('hashchange', openModalFromHash);