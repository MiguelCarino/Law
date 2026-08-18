// i18n — Carino Law. Fleet convention (see Hardware/i18n.js): English source
// strings ARE the keys, so a missing entry falls back to English rather than
// to a blank.
//
// carino-lang.js (deferred, loaded just before this script) resolves the locale
// and fires 'carino:langchange'; this file owns the dictionaries and re-applies.
// Static markup uses data-i18n (textContent); dynamic strings are wrapped at
// render time in app.js via TT() -> window.t.
//
// What is NOT translated: everything under data/. Those files are the document —
// the name of a gazette, the description of a court database and the caveat about
// which text is authoritative are research, not interface, and a machine
// translation of them would be a liability rather than a feature. The chrome
// around them is translated; the record itself stays as researched.

const I18N = {
    es: {
        // Tabs
        'Countries': 'Países',
        'Gazettes': 'Diarios oficiales',
        'Constitutions': 'Constituciones',
        'Find a law': 'Buscar una ley',
        'All sources': 'Todas las fuentes',

        // Masthead
        'Official sources · 28 countries': 'Fuentes oficiales · 28 países',
        'Where the law is published': 'Dónde se publica el derecho',
        'Every country publishes its law in one official place. This is a directory of those places — the gazette of record, the constitution, the consolidated statutes, the courts and the treaties — each linked at the body that publishes it. The sources that are not official say so.': 'Cada país publica su derecho en un lugar oficial. Este es un directorio de esos lugares: el diario oficial, la constitución, los textos vigentes, los tribunales y los tratados, cada uno enlazado al órgano que lo publica. Las fuentes que no son oficiales lo advierten.',

        // Filters
        'kind': 'tipo',
        'region': 'región',
        'tradition': 'tradición',
        'official only': 'solo oficiales',

        // Badges — official standing is the load-bearing distinction here
        'Official': 'Oficial',
        'Unofficial': 'No oficial',
        'Free': 'Gratis',
        'Registration': 'Registro',
        'Part paywalled': 'Parcialmente de pago',
        'Paywalled': 'De pago',

        // Source kinds
        'Gazette of record': 'Diario oficial',
        'Constitution': 'Constitución',
        'Consolidated law': 'Texto vigente',
        'Legislature': 'Legislativo',
        'Courts': 'Tribunales',
        'Case law': 'Jurisprudencia',
        'Codes': 'Códigos',
        'Treaties': 'Tratados',
        'Regulations': 'Reglamentos',
        'Subnational': 'Subnacional',
        'Translation': 'Traducción',
        'Research': 'Investigación',

        // Legal traditions
        'Civil law': 'Civilista',
        'Common law': 'Common law',
        'Mixed': 'Mixto',
        'Socialist civil': 'Civilista socialista',
        'Religious / mixed': 'Religioso / mixto',

        // Regions
        'North America': 'América del Norte',
        'Latin America': 'América Latina',
        'Europe': 'Europa',
        'Middle East': 'Medio Oriente',
        'East Asia': 'Asia Oriental',
        'Oceania': 'Oceanía',

        // Country record
        'How law is made and published': 'Cómo se crea y publica el derecho',
        'Hierarchy of norms': 'Jerarquía normativa',
        'Looking something up': 'Cómo hacer una consulta',
        'Everything else': 'Todo lo demás',
        'State, province and local law': 'Derecho estatal, provincial y local',
        'What is not authoritative': 'Lo que no tiene valor oficial',
        'How to look something up': 'Cómo consultar un ordenamiento',
        'bulk / API': 'masiva / API',

        // Counters and empty states
        'countries': 'países',
        'sources': 'fuentes',
        'shown': 'visibles',
        'free to read': 'acceso libre',
        'lookups': 'consultas',
        'official': 'oficiales',
        'unofficial': 'no oficiales',
        'gazette': 'diario oficial',
        'Nothing matches.': 'Sin coincidencias.',
        'No gazette matches.': 'Ningún diario oficial coincide.',
        'No constitution matches.': 'Ninguna constitución coincide.',
        'A data file failed to load. Serve this folder over http:// or check that the data/ directory is intact.': 'No se pudo cargar un archivo de datos. Sirve esta carpeta por http:// o verifica que el directorio data/ esté íntegro.',
    },

    'pt-BR': {
        // Tabs
        'Countries': 'Países',
        'Gazettes': 'Diários Oficiais',
        'Constitutions': 'Constituições',
        'Find a law': 'Buscar uma norma',
        'All sources': 'Todas as fontes',

        // Masthead
        'Official sources · 28 countries': 'Fontes oficiais · 28 países',
        'Where the law is published': 'Onde a lei é publicada',
        'Every country publishes its law in one official place. This is a directory of those places — the gazette of record, the constitution, the consolidated statutes, the courts and the treaties — each linked at the body that publishes it. The sources that are not official say so.': 'Todo país publica suas leis em um lugar oficial. Este é um diretório desses lugares: o diário oficial, a constituição, a legislação consolidada, os tribunais e os tratados, cada um com link para o órgão que o publica. As fontes que não são oficiais estão identificadas como tais.',

        // Filters
        'kind': 'tipo',
        'region': 'região',
        'tradition': 'tradição',
        'official only': 'somente oficiais',

        // Badges — official standing is the load-bearing distinction here
        'Official': 'Oficial',
        'Unofficial': 'Não oficial',
        'Free': 'Grátis',
        'Registration': 'Cadastro',
        'Part paywalled': 'Parte paga',
        'Paywalled': 'Pago',

        // Source kinds
        'Gazette of record': 'Diário Oficial',
        'Constitution': 'Constituição',
        'Consolidated law': 'Legislação consolidada',
        'Legislature': 'Legislativo',
        'Courts': 'Tribunais',
        'Case law': 'Jurisprudência',
        'Codes': 'Códigos',
        'Treaties': 'Tratados',
        'Regulations': 'Regulamentos',
        'Subnational': 'Subnacional',
        'Translation': 'Tradução',
        'Research': 'Pesquisa',

        // Legal traditions
        'Civil law': 'Civil law',
        'Common law': 'Common law',
        'Mixed': 'Misto',
        'Socialist civil': 'Civil socialista',
        'Religious / mixed': 'Religioso / misto',

        // Regions
        'North America': 'América do Norte',
        'Latin America': 'América Latina',
        'Europe': 'Europa',
        'Middle East': 'Oriente Médio',
        'East Asia': 'Ásia Oriental',
        'Oceania': 'Oceania',

        // Country record
        'How law is made and published': 'Como a lei é feita e publicada',
        'Hierarchy of norms': 'Hierarquia das normas',
        'Looking something up': 'Como consultar',
        'Everything else': 'Demais fontes',
        'State, province and local law': 'Normas estaduais, provinciais e locais',
        'What is not authoritative': 'O que não tem valor oficial',
        'How to look something up': 'Como consultar uma norma',
        'bulk / API': 'em massa / API',

        // Counters and empty states
        'countries': 'países',
        'sources': 'fontes',
        'shown': 'exibidos',
        'free to read': 'acesso livre',
        'lookups': 'consultas',
        'official': 'oficiais',
        'unofficial': 'não oficiais',
        'gazette': 'diário oficial',
        'Nothing matches.': 'Nada encontrado.',
        'No gazette matches.': 'Nenhum diário oficial encontrado.',
        'No constitution matches.': 'Nenhuma constituição encontrada.',
        'A data file failed to load. Serve this folder over http:// or check that the data/ directory is intact.': 'Falha ao carregar um arquivo de dados. Sirva esta pasta via http:// ou verifique se o diretório data/ está íntegro.',
    },

    ja: {
        // Tabs
        'Countries': '国',
        'Gazettes': '官報',
        'Constitutions': '憲法',
        'Find a law': '法令を調べる',
        'All sources': '全情報源',

        // Masthead
        'Official sources · 28 countries': '公式情報源 · 28か国',
        'Where the law is published': '法令が公布される場所',
        'Every country publishes its law in one official place. This is a directory of those places — the gazette of record, the constitution, the consolidated statutes, the courts and the treaties — each linked at the body that publishes it. The sources that are not official say so.': 'どの国にも、法令を公布する公式の場が一つある。本サイトはその場所の一覧である。官報、憲法、現行法令、裁判所、条約を、それぞれ公布する機関へ直接リンクしている。公式でないものは、その旨を明記している。',

        // Filters
        'kind': '種別',
        'region': '地域',
        'tradition': '法系',
        'official only': '公式のみ',

        // Badges — official standing is the load-bearing distinction here
        'Official': '公式',
        'Unofficial': '非公式',
        'Free': '無料',
        'Registration': '要登録',
        'Part paywalled': '一部有料',
        'Paywalled': '有料',

        // Source kinds
        'Gazette of record': '官報',
        'Constitution': '憲法',
        'Consolidated law': '現行法令',
        'Legislature': '立法府',
        'Courts': '裁判所',
        'Case law': '判例',
        'Codes': '法典',
        'Treaties': '条約',
        'Regulations': '政令・省令',
        'Subnational': '地方法令',
        'Translation': '翻訳',
        'Research': '調査・研究',

        // Legal traditions
        'Civil law': '大陸法',
        'Common law': '英米法',
        'Mixed': '混合',
        'Socialist civil': '社会主義法',
        'Religious / mixed': '宗教法・混合',

        // Regions
        'North America': '北米',
        'Latin America': '中南米',
        'Europe': '欧州',
        'Middle East': '中東',
        'East Asia': '東アジア',
        'Oceania': 'オセアニア',

        // Country record
        'How law is made and published': '法令の制定と公布',
        'Hierarchy of norms': '法令の段階構造',
        'Looking something up': '調べる手順',
        'Everything else': 'その他',
        'State, province and local law': '州法・地方条例',
        'What is not authoritative': '正文でないもの',
        'How to look something up': '調べ方',
        'bulk / API': '一括 / API',

        // Counters and empty states
        'countries': 'か国',
        'sources': '情報源',
        'shown': '表示中',
        'free to read': '無料閲覧',
        'lookups': '手順',
        'official': '公式',
        'unofficial': '非公式',
        'gazette': '官報',
        'Nothing matches.': '該当なし。',
        'No gazette matches.': '該当する官報なし。',
        'No constitution matches.': '該当する憲法なし。',
        'A data file failed to load. Serve this folder over http:// or check that the data/ directory is intact.': 'データファイルを読み込めませんでした。このフォルダを http:// で配信するか、data/ ディレクトリが壊れていないか確認してください。',
    },

    ru: {
        // Tabs
        'Countries': 'Страны',
        'Gazettes': 'Офиц. издания',
        'Constitutions': 'Конституции',
        'Find a law': 'Найти закон',
        'All sources': 'Все источники',

        // Masthead
        'Official sources · 28 countries': 'Официальные источники · 28 стран',
        'Where the law is published': 'Где публикуются законы',
        'Every country publishes its law in one official place. This is a directory of those places — the gazette of record, the constitution, the consolidated statutes, the courts and the treaties — each linked at the body that publishes it. The sources that are not official say so.': 'В каждой стране закон публикуется в одном официальном месте. Это справочник таких мест: официальное издание, конституция, консолидированное законодательство, суды и международные договоры — каждый со ссылкой на публикующий орган. Источники, которые не являются официальными, отмечены как таковые.',

        // Filters
        'kind': 'тип',
        'region': 'регион',
        'tradition': 'правовая семья',
        'official only': 'только официальные',

        // Badges — official standing is the load-bearing distinction here
        'Official': 'Официальный',
        'Unofficial': 'Неофициальный',
        'Free': 'Бесплатно',
        'Registration': 'Регистрация',
        'Part paywalled': 'Частично платно',
        'Paywalled': 'Платно',

        // Source kinds
        'Gazette of record': 'Официальное издание',
        'Constitution': 'Конституция',
        'Consolidated law': 'Действующие редакции',
        'Legislature': 'Парламент',
        'Courts': 'Суды',
        'Case law': 'Судебная практика',
        'Codes': 'Кодексы',
        'Treaties': 'Договоры',
        'Regulations': 'Подзаконные акты',
        'Subnational': 'Регионы',
        'Translation': 'Переводы',
        'Research': 'Исследования',

        // Legal traditions
        'Civil law': 'Континентальное',
        'Common law': 'Общее право',
        'Mixed': 'Смешанная',
        'Socialist civil': 'Социалистическая',
        'Religious / mixed': 'Религиозная / смешанная',

        // Regions
        'North America': 'Северная Америка',
        'Latin America': 'Латинская Америка',
        'Europe': 'Европа',
        'Middle East': 'Ближний Восток',
        'East Asia': 'Восточная Азия',
        'Oceania': 'Океания',

        // Country record
        'How law is made and published': 'Как принимаются и публикуются законы',
        'Hierarchy of norms': 'Иерархия норм',
        'Looking something up': 'Как искать',
        'Everything else': 'Всё остальное',
        'State, province and local law': 'Право штатов, провинций и муниципалитетов',
        'What is not authoritative': 'Что не имеет официальной силы',
        'How to look something up': 'Как найти нужное',
        'bulk / API': 'выгрузка / API',

        // Counters and empty states
        'countries': 'стран',
        'sources': 'источников',
        'shown': 'показано',
        'free to read': 'бесплатных',
        'lookups': 'инструкций',
        'official': 'официальных',
        'unofficial': 'неофициальных',
        'gazette': 'офиц. издание',
        'Nothing matches.': 'Ничего не найдено.',
        'No gazette matches.': 'Изданий не найдено.',
        'No constitution matches.': 'Конституций не найдено.',
        'A data file failed to load. Serve this folder over http:// or check that the data/ directory is intact.': 'Не удалось загрузить файл данных. Откройте эту папку через http:// или проверьте целостность каталога data/.',
    },

};

let LOCALE = 'en';

function setLocale(code) { LOCALE = I18N[code] ? code : 'en'; }

function t(key) {
    const dict = I18N[LOCALE];
    return (dict && dict[key]) || key;
}

// app.js renders every card, row and badge through TT(), which reads this.
window.t = t;

// Static markup. data-i18n: original trimmed textContent is the key.
// data-i18n-html (innerHTML, whitespace-collapsed) is kept for markup that
// carries inline tags; nothing in index.html needs it today.
function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        if (!el.dataset.i18nKey) el.dataset.i18nKey = el.textContent.trim();
        el.textContent = t(el.dataset.i18nKey);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        if (!el.dataset.i18nKey) el.dataset.i18nKey = el.innerHTML.trim().replace(/\s+/g, ' ');
        el.innerHTML = t(el.dataset.i18nKey);
    });
}

function currentFleetLang() { return (window.CarinoLang && window.CarinoLang.current) || 'en'; }

function applyI18n() {
    setLocale(currentFleetLang());
    applyStaticI18n();
    // Re-render the JS-generated surfaces. app.js may still be fetching data/
    // on first paint, hence the guard.
    if (window.LAW && typeof window.LAW.render === 'function') window.LAW.render();
}

// carino-lang.js is deferred and runs before this (also deferred) script, so
// CarinoLang exists by DOMContentLoaded; re-apply on every fleet switch.
document.addEventListener('DOMContentLoaded', applyI18n);
window.addEventListener('carino:langchange', applyI18n);
