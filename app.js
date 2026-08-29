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
    cards: "枚のカード"
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
    cards: "schede"
  }
};

const state = {
  words: [],
  mode: "today",
  lang: localStorage.getItem("itn_lang") || "ja",
  query: "",
  shuffle: false,

  bookmarks: new Set(
    JSON.parse(localStorage.getItem("itn_bookmarks") || "[]")
  ),

  progress: JSON.parse(
    localStorage.getItem("itn_progress") || "{}"
  )
};

const $ = selector => document.querySelector(selector);

const escapeHtml = value =>
  String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);

function save() {
  localStorage.setItem(
    "itn_bookmarks",
    JSON.stringify([...state.bookmarks])
  );

  localStorage.setItem(
    "itn_progress",
    JSON.stringify(state.progress)
  );

  localStorage.setItem("itn_lang", state.lang);
}

function validateWords(words) {
  if (!Array.isArray(words)) {
    throw new Error("words.json must be an array");
  }

  const ids = new Set();

  for (const word of words) {
    const requiredFields = [
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

    for (const field of requiredFields) {
      if (word[field] === undefined) {
        throw new Error(
          `${word.id || "unknown"}: missing ${field}`
        );
      }
    }

    if (ids.has(word.id)) {
      throw new Error(`duplicate id: ${word.id}`);
    }

    ids.add(word.id);

    if (word.grammar.pos === "verb") {
      if (
        !word.grammar.auxiliary ||
        !word.grammar.pastParticiple ||
        !word.grammar.gerundPresent ||
        !word.conjugations
      ) {
        throw new Error(
          `${word.id}: incomplete verb data`
        );
      }
    }
  }

  return words;
}

function isDue(id) {
  return (
    !state.progress[id] ||
    state.progress[id].due <= Date.now()
  );
}

function getFilteredWords() {
  let words = state.words.filter(word => {
    if (state.mode === "bookmarks") {
      return state.bookmarks.has(word.id);
    }

    if (state.mode === "review") {
      return isDue(word.id);
    }

    return true;
  });

  if (state.query) {
    const query = state.query.toLowerCase();

    words = words.filter(word =>
      JSON.stringify(word).toLowerCase().includes(query)
    );
  }

  if (state.shuffle) {
    words = [...words].sort(() => Math.random() - 0.5);
  }

  return words;
}

function makeSection(label, body) {
  return `
    <section class="section">
      <h3 class="label">${label}</h3>
      ${body}
    </section>
  `;
}

function makeChipList(items = []) {
  return `
    <div class="chip-list">
      ${items
        .map(item => `
          <span class="chip">${escapeHtml(item)}</span>
        `)
        .join("")}
    </div>
  `;
}

function makeConjugations(word, text) {
  if (!word.conjugations) {
    return "";
  }

  const moods = Object.entries(word.conjugations)
    .map(([mood, tenses]) => {
      const tenseBlocks = Object.entries(tenses)
        .map(([tense, forms]) => {
          const rows = forms
            .map((form, index) => {
              const heading =
                mood === "Forme indefinite"
                  ? FORMS[index]
                  : PEOPLE[index];

              return `
                <tr>
                  <th>${escapeHtml(heading)}</th>
                  <td>${escapeHtml(form)}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <details class="tense">
              <summary>${escapeHtml(tense)}</summary>

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
          <summary>${escapeHtml(mood)}</summary>
          ${tenseBlocks}
        </details>
      `;
    })
    .join("");

  return `
    <details class="conjugation">
      <summary>${text.conjugation}</summary>
      ${moods}
    </details>
  `;
}

function makeCard(word) {
  const text = I18N[state.lang];

  const meanings =
    word.meaning[state.lang] || word.meaning.ja;

  const nuance =
    word.nuance[state.lang] || word.nuance.ja;

  const etymology =
    word.etymology[state.lang] || word.etymology.ja;

  const usage = [
    ...(word.usage?.register || []),
    ...(word.usage?.medium || []),
    ...(word.usage?.situations || [])
  ];

  const minimal = `
    <div class="minimal">
      ${word.minimal
        .map(item => `
          <b>${escapeHtml(item.word)}</b>
          <span>
            ${escapeHtml(item[state.lang] || item.ja)}
          </span>
        `)
        .join("")}
    </div>
  `;

  const equivalents = Object.entries(
    word.equivalents || {}
  )
    .map(([language, equivalentsList]) => `
      <span class="chip">
        <b>${language.toUpperCase()}</b>
        · ${escapeHtml(equivalentsList.join(", "))}
      </span>
    `)
    .join("");

  const examples = word.examples
    .map(example => `
      <div class="example-block">
        <p class="example">${escapeHtml(example.it)}</p>

        ${
          state.lang === "ja"
            ? `<p class="translation">${escapeHtml(example.ja)}</p>`
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
              <b>${escapeHtml(word.grammar.auxiliary)}</b>
            </span>

            <span>
              participio
              <b>${escapeHtml(word.grammar.pastParticiple)}</b>
            </span>

            <span>
              gerundio
              <b>${escapeHtml(word.grammar.gerundPresent)}</b>
            </span>
          </div>

          ${makeConjugations(word, text)}
        </div>
      `
      : "";

  return `
    <article class="card">
      <header class="card-head">
        <div>
          <div class="word-row">
            <h2 class="word">${escapeHtml(word.word)}</h2>
            <span class="ipa">${escapeHtml(word.ipa)}</span>
          </div>

          <div class="grammar">
            ${escapeHtml(
              word.grammar.label[state.lang] ||
              word.grammar.label.ja
            )}

            ${
              word.grammar.plural
                ? ` · pl. ${escapeHtml(word.grammar.plural)}`
                : ""
            }

            ${
              word.grammar.pattern
                ? ` · ${escapeHtml(word.grammar.pattern)}`
                : ""
            }
          </div>

          <div class="badges">
            <span class="badge level">
              ${escapeHtml(word.level)}
            </span>

            <span class="badge">
              ${escapeHtml(
                word.frequency.replaceAll("_", " ")
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
            state.bookmarks.has(word.id) ? "on" : ""
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
              ${escapeHtml(meanings.join("；"))}
            </p>

            <p class="it-note">
              ${escapeHtml(word.meaning.it.join(" "))}
            </p>
          `
        )}

        ${makeSection(
          text.nuance,
          `<p>${escapeHtml(nuance)}</p>`
        )}

        <div class="twocol">
          ${makeSection(
            text.etymology,
            `<p>${escapeHtml(etymology)}</p>`
          )}

          ${makeSection(text.minimal, minimal)}
        </div>

        <div class="twocol">
          ${makeSection(
            text.synonyms,
            makeChipList(word.synonyms)
          )}

          ${makeSection(
            text.equiv,
            `<div class="chip-list">${equivalents}</div>`
          )}
        </div>

        ${makeSection(
          text.collocations,
          makeChipList(word.collocations)
        )}

        ${makeSection(text.examples, examples)}

        ${verbSection}

        <div class="grade-box">
          <span>${text.rate}</span>

          <div class="grades">
            <button
              class="grade"
              data-grade="again"
              data-id="${escapeHtml(word.id)}"
              type="button"
            >
              ${text.again}
            </button>

            <button
              class="grade"
              data-grade="hard"
              data-id="${escapeHtml(word.id)}"
              type="button"
            >
              ${text.hard}
            </button>

            <button
              class="grade"
              data-grade="good"
              data-id="${escapeHtml(word.id)}"
              type="button"
            >
              ${text.good}
            </button>

            <button
              class="grade"
              data-grade="known"
              data-id="${escapeHtml(word.id)}"
              type="button"
            >
              ${text.known}
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function render() {
  const text = I18N[state.lang];
  const words = getFilteredWords();

  $("#introText").textContent = text.intro;
  $("#searchInput").placeholder = text.search;
  $("#langBtn").textContent = state.lang.toUpperCase();

  $("#todayCount").textContent = state.words.length;

  $("#reviewCount").textContent =
    state.words.filter(word => isDue(word.id)).length;

  $("#bookmarkCount").textContent =
    state.bookmarks.size;

  $("#status").textContent =
    `${words.length} ${text.cards}`;

  $("#cards").innerHTML = words.length
    ? words.map(makeCard).join("")
    : $("#emptyTemplate").innerHTML;

  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.mode === state.mode
    );
  });
}

document.addEventListener("click", event => {
  const bookmarkButton =
    event.target.closest("[data-bookmark]");

  if (bookmarkButton) {
    const id = bookmarkButton.dataset.bookmark;

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
    event.target.closest("[data-grade]");

  if (gradeButton) {
    const intervals = {
      again: 0,
      hard: 1,
      good: 4,
      known: 14
    };

    const days =
      intervals[gradeButton.dataset.grade];

    state.progress[gradeButton.dataset.id] = {
      grade: gradeButton.dataset.grade,
      due: Date.now() + days * 86400000
    };

    save();
    render();
    return;
  }

  const tabButton = event.target.closest(".tab");

  if (tabButton) {
    state.mode = tabButton.dataset.mode;
    render();
  }
});

$("#langBtn").addEventListener("click", () => {
  state.lang = state.lang === "ja" ? "it" : "ja";
  save();
  render();
});

$("#themeBtn").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

$("#shuffleBtn").addEventListener("click", () => {
  state.shuffle = true;
  render();
});

$("#searchInput").addEventListener("input", event => {
  state.query = event.target.value.trim();
  render();
});

Promise.all(
  [
    "./data/words.json",
    "./data/words2.json",
    "./data/words3.json",
    "./data/words4.json",
    "./data/words5.json"
  
  ].map(path =>
    fetch(`${path}?v=2`, { cache: "no-store" })
      .then(response => {
        if (!response.ok) {
          throw new Error(`データを読み込めません: ${path}`);
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
      "データを読み込めませんでした。GitHub Pagesから開いてください。";
  });

if (
  "serviceWorker" in navigator &&
  location.protocol !== "file:"
) {
  navigator.serviceWorker.register("./sw.js");
}
