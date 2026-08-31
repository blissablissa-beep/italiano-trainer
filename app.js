const PEOPLE = [
  "io",
  "tu",
  "lui / lei",
  "noi",
  "voi",
  "loro"
];

const FORMS = [
  "Infinito presente",
  "Infinito passato",
  "Participio presente",
  "Participio passato",
  "Gerundio presente",
  "Gerundio passato"
];

const LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];

const POS_FILTERS = [
  "all",
  "verb",
  "noun",
  "adjective",
  "adverb",
  "other"
];

const I18N = {
  ja: {
    intro:
      "意味だけでなく、語感・語源・結びつき・活用まで。使えるイタリア語を静かに積み上げます。",
    search: "単語・意味・例文を検索",
    meaning: "意味",
    nuance: "語感・ニュアンス",
    etymology: "語源",
    minimal: "Minimal pair",
    synonyms: "類義語",
    equiv: "他言語の相当語",
    collocations: "コロケーション",
    examples: "例文",
    conjugation: "活用",
    rate: "このカードの理解度",
    known: "定着",
    again: "もう一度",
    hard: "難しい",
    good: "理解",
    today: "Today",
    dictionary: "Dictionary",
    bookmarks: "ブックマーク",
    words: "語",
    back: "単語一覧へ戻る",
    allLevels: "全レベル",
    allTypes: "全品詞",

    typeLabels: {
      verb: "動詞",
      noun: "名詞",
      adjective: "形容詞",
      adverb: "副詞・副詞句",
      other: "その他"
    }
  },

  it: {
    intro:
      "Non solo significati: sfumature, etimologia, collocazioni e coniugazioni per costruire un lessico vivo.",
    search: "Cerca parola, significato o esempio",
    meaning: "Significato",
    nuance: "Sfumature d’uso",
    etymology: "Etimologia",
    minimal: "Contrasto minimo",
    synonyms: "Sinonimi",
    equiv: "Equivalenti",
    collocations: "Collocazioni",
    examples: "Esempi",
    conjugation: "Coniugazione",
    rate: "Quanto conosci questa parola?",
    known: "Acquisita",
    again: "Ripeti",
    hard: "Difficile",
    good: "Capita",
    today: "Oggi",
    dictionary: "Dizionario",
    bookmarks: "Preferiti",
    words: "parole",
    back: "Torna all’elenco",
    allLevels: "Tutti i livelli",
    allTypes: "Tutte le categorie",

    typeLabels: {
      verb: "Verbi",
      noun: "Nomi",
      adjective: "Aggettivi",
      adverb: "Avverbi e locuzioni",
      other: "Altro"
    }
  }
};

const state = {
  words: [],
  mode: "today",
  lang: localStorage.getItem("itn_lang") || "ja",
  query: "",
  level: "all",
  pos: "all",
  todayOverride: null,
  currentWordId: null,

  bookmarks: new Set(
    JSON.parse(
      localStorage.getItem("itn_bookmarks") || "[]"
    )
  ),

  progress: JSON.parse(
    localStorage.getItem("itn_progress") || "{}"
  )
};

const $ = selector =>
  document.querySelector(selector);

const escapeHtml = value =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]
  );

function save() {
  localStorage.setItem(
    "itn_bookmarks",
    JSON.stringify([...state.bookmarks])
  );

  localStorage.setItem(
    "itn_progress",
    JSON.stringify(state.progress)
  );

  localStorage.setItem(
    "itn_lang",
    state.lang
  );
}

function validateWords(words) {
  if (!Array.isArray(words)) {
    throw new Error(
      "words.json must be an array"
    );
  }

  const ids = new Set();

  for (const word of words) {
    const required = [
      "id",
      "sid",
      "word",
      "ipa",
      "level",
      "grammar",
      "usage",
      "meaning",
      "nuance",
      "etymology",
      "minimal",
      "synonyms",
      "equivalents",
      "collocations",
      "examples"
    ];

    for (const field of required) {
      if (word[field] === undefined) {
        throw new Error(
          `${word.id || "unknown"}: missing ${field}`
        );
      }
    }

    if (ids.has(word.id)) {
      throw new Error(
        `duplicate id: ${word.id}`
      );
    }

    ids.add(word.id);

    if (
      word.grammar.pos === "verb" &&
      (
        !word.grammar.auxiliary ||
        !word.grammar.pastParticiple ||
        !word.grammar.gerundPresent ||
        !word.conjugations
      )
    ) {
      throw new Error(
        `${word.id}: incomplete verb data`
      );
    }
  }

  return words;
}

function normalizePos(word) {
  const pos = String(
    word.grammar?.pos || ""
  ).toLowerCase();

  if (pos === "verb") {
    return "verb";
  }

  if (pos === "noun") {
    return "noun";
  }

  if (
    pos === "adjective" ||
    pos === "adj"
  ) {
    return "adjective";
  }

  if (
    pos === "adverb" ||
    pos === "adv" ||
    pos.includes("adverb")
  ) {
    return "adverb";
  }

  return "other";
}

function localDayNumber() {
  const now = new Date();

  return Math.floor(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime() / 86400000
  );
}

function seededShuffle(items, seed) {
  const result = [...items];

  let value = seed || 1;

  const random = () => {
    value =
      (
        value * 1664525 +
        1013904223
      ) >>> 0;

    return value / 4294967296;
  };

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const target = Math.floor(
      random() * (index + 1)
    );

    [
      result[index],
      result[target]
    ] = [
      result[target],
      result[index]
    ];
  }

  return result;
}

function getTodayWords() {
  if (state.todayOverride) {
    return state.todayOverride
      .map(id =>
        state.words.find(
          word => word.id === id
        )
      )
      .filter(Boolean);
  }

  return seededShuffle(
    state.words,
    localDayNumber()
  ).slice(0, 5);
}

function searchableText(word) {
  return [
    word.word,
    word.id,
    ...(word.meaning?.ja || []),
    ...(word.meaning?.it || []),
    ...(word.synonyms || []),
    ...(word.collocations || []),

    ...(word.examples || []).flatMap(
      example => [
        example.it,
        example.ja
      ]
    )
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function getIndexWords() {
  let words =
    state.mode === "bookmarks"
      ? state.words.filter(word =>
          state.bookmarks.has(word.id)
        )
      : [...state.words];

  if (state.level !== "all") {
    words = words.filter(
      word => word.level === state.level
    );
  }

  if (state.pos !== "all") {
    words = words.filter(
      word =>
        normalizePos(word) === state.pos
    );
  }

  const query =
    state.query.toLocaleLowerCase();

  if (query) {
    words = words.filter(word =>
      searchableText(word).includes(query)
    );
  }

  return words.sort((a, b) => {
    if (query) {
      const aExact =
        a.word.toLocaleLowerCase() === query
          ? 0
          : 1;

      const bExact =
        b.word.toLocaleLowerCase() === query
          ? 0
          : 1;

      if (aExact !== bExact) {
        return aExact - bExact;
      }

      const aStarts =
        a.word
          .toLocaleLowerCase()
          .startsWith(query)
          ? 0
          : 1;

      const bStarts =
        b.word
          .toLocaleLowerCase()
          .startsWith(query)
          ? 0
          : 1;

      if (aStarts !== bStarts) {
        return aStarts - bStarts;
      }
    }

    return a.word.localeCompare(
      b.word,
      "it",
      {
        sensitivity: "base"
      }
    );
  });
}

function makeSection(label, body) {
  return `
    <section class="section">
      <h3 class="label">
        ${label}
      </h3>

      ${body}
    </section>
  `;
}

function makeChipList(items = []) {
  return `
    <div class="chip-list">
      ${items
        .map(item => `
          <span class="chip">
            ${escapeHtml(item)}
          </span>
        `)
        .join("")}
    </div>
  `;
}

function makeConjugations(word, text) {
  if (!word.conjugations) {
    return "";
  }

  const moods = Object.entries(
    word.conjugations
  )
    .map(([mood, tenses]) => {
      const blocks = Object.entries(tenses)
        .map(([tense, forms]) => {
          const rows = forms
            .map((form, index) => {
              const heading =
                mood === "Forme indefinite"
                  ? FORMS[index]
                  : PEOPLE[index];

              return `
                <tr>
                  <th>
                    ${escapeHtml(heading)}
                  </th>

                  <td>
                    ${escapeHtml(form)}
                  </td>
                </tr>
              `;
            })
            .join("");

          return `
            <details class="tense">
              <summary>
                ${escapeHtml(tense)}
              </summary>

              <table class="conj-table">
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </details>
          `;
        })
        .join("");

      return `
        <details class="mood">
          <summary>
            ${escapeHtml(mood)}
          </summary>

          ${blocks}
        </details>
      `;
    })
    .join("");

  return `
    <details class="conjugation">
      <summary>
        ${text.conjugation}
      </summary>

      ${moods}
    </details>
  `;
}

function makeCard(word) {
  const text = I18N[state.lang];

  const meanings =
    word.meaning[state.lang] ||
    word.meaning.ja;

  const nuance =
    word.nuance[state.lang] ||
    word.nuance.ja;

  const etymology =
    word.etymology[state.lang] ||
    word.etymology.ja;

  const usage = [
    ...(word.usage?.register || []),
    ...(word.usage?.medium || []),
    ...(word.usage?.situations || [])
  ];

  const minimal = `
    <div class="minimal">
      ${word.minimal
        .map(item => `
          <b>
            ${escapeHtml(item.word)}
          </b>

          <span>
            ${escapeHtml(
              item[state.lang] ||
              item.ja
            )}
          </span>
        `)
        .join("")}
    </div>
  `;

  const equivalents = Object.entries(
    word.equivalents || {}
  )
    .map(([language, list]) => `
      <span class="chip">
        <b>
          ${language.toUpperCase()}
        </b>

        · ${escapeHtml(list.join(", "))}
      </span>
    `)
    .join("");

  const examples = word.examples
    .map(example => `
      <div class="example-block">
        <p class="example">
          ${escapeHtml(example.it)}
        </p>

        ${
          state.lang === "ja"
            ? `
              <p class="translation">
                ${escapeHtml(example.ja)}
              </p>
            `
            : ""
        }
      </div>
    `)
    .join("");

  const verbSection =
    word.grammar.pos === "verb"
      ? `
        <div class="section">
          <div class="verb-summary">
            <span>
              ausiliare
              <b>
                ${escapeHtml(
                  word.grammar.auxiliary
                )}
              </b>
            </span>

            <span>
              participio
              <b>
                ${escapeHtml(
                  word.grammar.pastParticiple
                )}
              </b>
            </span>

            <span>
              gerundio
              <b>
                ${escapeHtml(
                  word.grammar.gerundPresent
                )}
              </b>
            </span>
          </div>

          ${makeConjugations(word, text)}
        </div>
      `
      : "";

  return `
    <article
      class="card"
      id="card-${escapeHtml(word.id)}"
    >
      <header class="card-head">
        <div>
          <div class="word-row">
            <h2 class="word">
              ${escapeHtml(word.word)}
            </h2>

            <span class="ipa">
              ${escapeHtml(word.ipa)}
            </span>
          </div>

          <div class="grammar">
            ${escapeHtml(
              word.grammar.label[state.lang] ||
              word.grammar.label.ja
            )}

            ${
              word.grammar.plural
                ? `
                  · pl.
                  ${escapeHtml(
                    word.grammar.plural
                  )}
                `
                : ""
            }

            ${
              word.grammar.pattern
                ? `
                  ·
                  ${escapeHtml(
                    word.grammar.pattern
                  )}
                `
                : ""
            }
          </div>

          <div class="badges">
            <span class="badge level">
              ${escapeHtml(word.level)}
            </span>

            <span class="badge">
              ${escapeHtml(
                String(
                  word.frequency || ""
                ).replaceAll("_", " ")
              )}
            </span>

            ${usage
              .map(item => `
                <span class="badge usage">
                  ${escapeHtml(item)}
                </span>
              `)
              .join("")}
          </div>
        </div>

        <button
          class="bookmark ${
            state.bookmarks.has(word.id)
              ? "on"
              : ""
          }"
          data-bookmark="${escapeHtml(word.id)}"
          aria-label="ブックマーク"
          type="button"
        >
          ★
        </button>
      </header>

      <div class="card-body">
        ${makeSection(
          text.meaning,
          `
            <p class="meaning">
              ${escapeHtml(
                meanings.join("；")
              )}
            </p>

            <p class="it-note">
              ${escapeHtml(
                word.meaning.it.join(" ")
              )}
            </p>
          `
        )}

        ${makeSection(
          text.nuance,
          `
            <p>
              ${escapeHtml(nuance)}
            </p>
          `
        )}

        <div class="twocol">
          ${makeSection(
            text.etymology,
            `
              <p>
                ${escapeHtml(etymology)}
              </p>
            `
          )}

          ${makeSection(
            text.minimal,
            minimal
          )}
        </div>

        <div class="twocol">
          ${makeSection(
            text.synonyms,
            makeChipList(word.synonyms)
          )}

          ${makeSection(
            text.equiv,
            `
              <div class="chip-list">
                ${equivalents}
              </div>
            `
          )}
        </div>

        ${makeSection(
          text.collocations,
          makeChipList(word.collocations)
        )}

        ${makeSection(
          text.examples,
          examples
        )}

        ${verbSection}

        <div class="grade-box">
          <span>
            ${text.rate}
          </span>

          <div class="grades">
            ${[
              "again",
              "hard",
              "good",
              "known"
            ]
              .map(grade => `
                <button
                  class="grade"
                  data-grade="${grade}"
                  data-id="${escapeHtml(word.id)}"
                  type="button"
                >
                  ${text[grade]}
                </button>
              `)
              .join("")}
          </div>
        </div>
      </div>
    </article>
  `;
}

function makeWordIndex(words) {
  const text = I18N[state.lang];

  if (!words.length) {
    return $("#emptyTemplate").innerHTML;
  }

  return `
    <div
      class="word-index"
      role="list"
    >
      ${words
        .map(word => `
          <a
            class="word-link"
            href="#word=${encodeURIComponent(
              word.id
            )}"
            role="listitem"
          >
            <span class="index-word">
              ${escapeHtml(word.word)}
            </span>

            <span class="index-ipa">
              ${escapeHtml(word.ipa)}
            </span>

            <span class="index-meta">
              <span class="mini-badge">
                ${escapeHtml(word.level)}
              </span>

              <span>
                ${escapeHtml(
                  text.typeLabels[
                    normalizePos(word)
                  ]
                )}
              </span>
            </span>

            <span
              class="index-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </a>
        `)
        .join("")}
    </div>
  `;
}

function renderFilters() {
  const text = I18N[state.lang];

  $("#levelFilters").innerHTML = [
    "all",
    ...LEVELS
  ]
    .map(level => `
      <button
        class="filter-chip ${
          state.level === level
            ? "active"
            : ""
        }"
        data-level="${level}"
        type="button"
      >
        ${
          level === "all"
            ? text.allLevels
            : level
        }
      </button>
    `)
    .join("");

  $("#posFilters").innerHTML =
    POS_FILTERS
      .map(pos => `
        <button
          class="filter-chip ${
            state.pos === pos
              ? "active"
              : ""
          }"
          data-pos="${pos}"
          type="button"
        >
          ${
            pos === "all"
              ? text.allTypes
              : text.typeLabels[pos]
          }
        </button>
      `)
      .join("");
}

function readWordRoute() {
  return location.hash.startsWith("#word=")
    ? decodeURIComponent(
        location.hash.slice(6)
      )
    : null;
}

function clearWordRoute() {
  state.currentWordId = null;

  if (
    location.hash.startsWith("#word=")
  ) {
    history.replaceState(
      null,
      "",
      location.pathname +
      location.search
    );
  }
}

function render() {
  const text = I18N[state.lang];

  const routedId = readWordRoute();

  if (routedId) {
    state.currentWordId = routedId;
  }

  $("#introText").textContent =
    text.intro;

  $("#searchInput").placeholder =
    text.search;

  $("#langBtn").textContent =
    state.lang.toUpperCase();

  $("#todayLabel").textContent =
    text.today;

  $("#dictionaryLabel").textContent =
    text.dictionary;

  $("#bookmarkLabel").textContent =
    text.bookmarks;

  $("#todayCount").textContent =
    Math.min(5, state.words.length);

  $("#dictionaryCount").textContent =
    state.words.length;

  $("#bookmarkCount").textContent =
    state.bookmarks.size;

  document
    .querySelectorAll(".tab")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.mode === state.mode
      );
    });

  const detailWord =
    state.currentWordId
      ? state.words.find(
          word =>
            word.id === state.currentWordId
        )
      : null;

  if (detailWord) {
    $("#filterPanel").hidden = true;
    $("#shuffleBtn").hidden = true;
    $("#status").textContent = "";

    $("#cards").innerHTML = `
      <button
        class="back-link"
        id="backToIndex"
        type="button"
      >
        ← ${text.back}
      </button>

      ${makeCard(detailWord)}
    `;

    return;
  }

  const showIndex =
    state.mode !== "today" ||
    Boolean(state.query);

  $("#filterPanel").hidden =
    !showIndex;

  $("#shuffleBtn").hidden =
    state.mode !== "today" ||
    Boolean(state.query);

  if (showIndex) {
    renderFilters();

    const words = getIndexWords();

    $("#status").textContent =
      `${words.length} ${text.words}`;

    $("#cards").innerHTML =
      makeWordIndex(words);
  } else {
    const words = getTodayWords();

    $("#status").textContent =
      `${words.length} ${text.words}`;

    $("#cards").innerHTML =
      words.length
        ? words
            .map(makeCard)
            .join("")
        : $("#emptyTemplate").innerHTML;
  }
}

document.addEventListener(
  "click",
  event => {
    const bookmarkButton =
      event.target.closest(
        "[data-bookmark]"
      );

    if (bookmarkButton) {
      const id =
        bookmarkButton.dataset.bookmark;

      if (state.bookmarks.has(id)) {
        state.bookmarks.delete(id);
      } else {
        state.bookmarks.add(id);
      }

      save();
      render();
      return;
    }

    const gradeButton =
      event.target.closest(
        "[data-grade]"
      );

    if (gradeButton) {
      const intervals = {
        again: 0,
        hard: 1,
        good: 4,
        known: 14
      };

      const days =
        intervals[
          gradeButton.dataset.grade
        ];

      state.progress[
        gradeButton.dataset.id
      ] = {
        grade:
          gradeButton.dataset.grade,

        due:
          Date.now() +
          days * 86400000
      };

      save();
      render();
      return;
    }

    const tabButton =
      event.target.closest(".tab");

    if (tabButton) {
      clearWordRoute();

      state.mode =
        tabButton.dataset.mode;

      state.query = "";

      $("#searchInput").value = "";

      render();
      return;
    }

    const levelButton =
      event.target.closest(
        "[data-level]"
      );

    if (levelButton) {
      state.level =
        levelButton.dataset.level;

      render();
      return;
    }

    const posButton =
      event.target.closest(
        "[data-pos]"
      );

    if (posButton) {
      state.pos =
        posButton.dataset.pos;

      render();
      return;
    }

    if (
      event.target.closest(
        "#backToIndex"
      )
    ) {
      clearWordRoute();
      render();
    }
  }
);

$("#langBtn").addEventListener(
  "click",
  () => {
    state.lang =
      state.lang === "ja"
        ? "it"
        : "ja";

    save();
    render();
  }
);

$("#themeBtn").addEventListener(
  "click",
  () => {
    document.documentElement
      .classList.toggle("dark");
  }
);

$("#shuffleBtn").addEventListener(
  "click",
  () => {
    state.todayOverride =
      seededShuffle(
        state.words,
        Date.now() >>> 0
      )
        .slice(0, 5)
        .map(word => word.id);

    render();
  }
);

$("#searchInput").addEventListener(
  "input",
  event => {
    clearWordRoute();

    state.query =
      event.target.value.trim();

    render();
  }
);

window.addEventListener(
  "hashchange",
  () => {
    state.currentWordId =
      readWordRoute();

    render();
  }
);

Promise.all(
  [
    "./data/words.json",
    "./data/words2.json",
    "./data/words3.json",
    "./data/words4.json",
    "./data/words5.json"
  ].map(path =>
    fetch(
      `${path}?v=3`,
      {
        cache: "no-store"
      }
    ).then(response => {
      if (!response.ok) {
        throw new Error(
          `データを読み込めません: ${path}`
        );
      }

      return response.json();
    })
  )
)
  .then(groups => groups.flat())
  .then(validateWords)
  .then(words => {
    state.words = words;
    render();
  })
  .catch(error => {
    console.error(error);

    $("#status").textContent =
      `データ読み込みエラー: ${error.message}`;
  });

if (
  "serviceWorker" in navigator &&
  location.protocol !== "file:"
) {
  navigator.serviceWorker.register(
    "./sw.js"
  );
}