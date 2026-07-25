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

// 作品データを配列で管理する
// DB や fetch('/api/works') から返ってくる JSON と同じ形式
// image: 実画像のパス（例: 'images/work1.jpg'）または URL を指定。
//        null にするとグラデーションのプレースホルダーが代わりに表示される。
const worksData = [
  {
    id: 'work-1',
    title: '職務経歴書作成AI',
    category: 'Dify / チャットフロー',
    status: '制作中',
    image: null,
    imageClass: 'bg-grad-1',
    desc: 'ジョブカードや履歴書、過去の職務経歴書をもとに、見やすい形式の職務経歴書を自動で作成するチャットフロー型のAIアプリです。',
    link: '#',
  },
  {
    id: 'work-2',
    title: 'AI会議室',
    category: 'Dify / チャットフロー',
    status: '制作中',
    image: null,
    imageClass: 'bg-grad-2',
    desc: 'お題を投げかけると、AI同士が会議形式で議論してくれるチャットフローアプリです。現在は1種類の会議形式のみですが、今後3種類の会議フローから選べるように拡張予定です。',
    link: '#',
  },
  {
    id: 'work-3',
    title: 'grill-me',
    category: 'Dify / チャットフロー',
    status: '制作中',
    image: null,
    imageClass: 'bg-grad-3',
    desc: 'ユーザーのアイデアや計画について、AIが1つずつ質問を重ねていくことで、内容を具体的に整理・言語化していくチャットフロー型アプリです。',
    link: '#',
  },
];

// サムネイルの作品リストを表示する
const worksGrid = document.querySelector('.js-works-grid');

if (worksGrid) {
  // worksData 配列の各要素に対して繰り返し処理する
  // forEach の引数: work = その要素のオブジェクト / index = 何番目か（0始まり）
  worksData.forEach((work, index) => {
    // console.log(work, index);
    // サムネイルの HTML を切り替える（実画像 or グラデーション）
    const thumbHtml = work.image
      ? `<img src="${work.image}" alt="${work.title}のサムネイル">`
      : `<div class="thumb-placeholder ${work.imageClass}">Project ${index + 1}</div>`;

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
            <div class="work-thumb">${thumbHtml}${statusBadgeHtml}</div>
            <div class="work-info">
                <p class="work-category">${work.category}</p>
                <h4 class="work-title">${work.title}</h4>
            </div>
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
// image があれば <img>、なければグラデーション div を返す
function renderThumb(work) {
  if (work.image) {
    return `<img class="modal-thumb" src="${work.image}" alt="${work.title}のサムネイル">`;
  }
  return `<div class="modal-thumb modal-thumb-placeholder ${work.imageClass}">${work.title}</div>`;
}

// モーダルの中身を描画する関数
// worksData[index] で配列から直接データを取得できる（Object.keys が不要）
function renderModal(index) {
  const work = worksData[index];

  if (work) {
    const statusBadgeHtml = work.status
      ? `<span class="work-status-badge modal-status-badge">${work.status}</span>`
      : '';
    modalContent.innerHTML = `
            <div class="modal-content-inner">
                <div class="modal-thumb-wrapper">${renderThumb(work)}${statusBadgeHtml}</div>
                <p class="work-category" style="font-size: 0.9rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase;">${work.category}</p>
                <h3>${work.title}</h3>
                <p>${work.desc}</p>
                <div class="modal-links">
                    <a href="${work.link}" class="btn btn-primary">View Project</a>
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