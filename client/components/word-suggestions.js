// ── WORD SUGGESTIONS ────────────────────────────────────────────
// 5-layer suggestion engine:
// Layer 0 — Trigram context  (prev2 + prev1 → next)
// Layer 1 — Bigram context   (prev1 → next)
// Layer 2 — Personal learned words (prefix match, frequency ordered)
// Layer 3 — Tanglish seed list
// Layer 4 — English frequency dictionary

import { Haptics } from '../utils/haptics.js';
import { WS }      from '../utils/websocket.js';

const WordSuggestions = (() => {

  // ── DOM / STATE ───────────────────────────────────────────────
  let container      = null;
  let currentWord    = '';
  let lastTypedWord  = '';   // word completed just before current
  let prevTypedWord  = '';   // word completed two slots back

  // ── LAYER 4: ENGLISH DICTIONARY ───────────────────────────────
  const ENGLISH = [
    'the','be','to','of','and','a','in','that','have','it','for','not',
    'on','with','he','as','you','do','at','this','but','his','by','from',
    'they','we','say','her','she','or','an','will','my','one','all','would',
    'there','their','what','so','up','out','if','about','who','get','which',
    'go','me','when','make','can','like','time','no','just','him','know',
    'take','people','into','year','your','good','some','could','them','see',
    'other','than','then','now','look','only','come','its','over','think',
    'also','back','after','use','two','how','our','work','first','well',
    'way','even','new','want','because','any','these','give','day','most',
    'us','great','between','need','large','often','hand','high','place',
    'hold','turn','where','show','around','again','still','every','small',
    'found','those','never','next','last','through','before','right','too',
    'mean','old','same','tell','follow','came','form','three','set','put',
    'end','does','another','must','big','such','here','why','ask','went',
    'read','land','different','home','move','try','kind','picture','change',
    'off','play','spell','air','away','animal','house','point','page',
    'letter','mother','answer','study','learn','plant','cover','food','sun',
    'four','thought','let','keep','children','feet','side','without','once',
    'life','enough','took','sometimes','head','above','began','almost','live',
    'girl','mountains','cut','young','talk','soon','list','song','being',
    'leave','family','body','music','color','stand','questions','fish','area',
    'mark','book','drive','stood','front','teach','week','final','gave',
    'green','please','strange','caught','fall','team','reach','second','less',
    'feel','cross','build','middle','speed','count','cat','someone','sail',
    'bear','wonder','smiled','everyone','afternoon','beautiful','brother',
    'sister','together','something','everything','nothing','anything',
    'hello','help','here','hey','hope','happy','have','heart','love','look',
    'learn','laugh','light','little','long','please','pretty','people',
    'proud','perfect','thank','thanks','thinking','today','tomorrow',
    'sorry','sure','sweet','special','smile','strong','super','really',
    'right','ready','remember','running','amazing','always','already',
    'actually','around','because','before','better','between','bring',
    'bright','brave','great','going','getting','given','grow','glad',
    'guess','just','join','journey','joyful','kind','keep','lovely',
    'maybe','making','might','more','most','much','many','must','never',
    'nice','need','next','night','now','often','only','other','over',
    'own','okay','quite','quick','quiet','question','feel','find','first',
    'with','well','when','where','while','wish','world','morning','evening',
    'night','afternoon','yesterday','tomorrow','weekend','Monday','Tuesday',
    'Wednesday','Thursday','Friday','Saturday','Sunday','January','February',
    'March','April','June','July','August','September','October','November',
    'December','meeting','office','college','class','project','assignment',
    'presentation','deadline','submit','email','message','call','phone',
    'laptop','computer','internet','download','upload','password','login',
    'account','profile','update','install','send','receive','reply','forward',
    'delete','save','share','open','close','start','stop','pause','play',
    'next','previous','volume','screen','keyboard','mouse','click','type',
    'search','find','result','error','problem','solution','answer','question',
    'example','practice','exercise','lesson','chapter','page','line','word',
    'sentence','paragraph','document','file','folder','create','edit','copy',
    'paste','cut','undo','redo','format','bold','italic','underline','font',
    'size','color','align','left','right','center','justify','table','image',
    'video','audio','record','camera','photo','picture','screenshot','zoom',
    'maybe','probably','definitely','absolutely','certainly','obviously',
    'basically','actually','literally','seriously','honestly','clearly',
    'anyway','however','therefore','although','because','since','unless',
    'whenever','wherever','whatever','whoever','whichever','however',
    'friend','friends','family','sister','brother','mother','father','parents',
    'teacher','student','team','group','everyone','someone','anyone','nobody',
    'myself','yourself','himself','herself','ourselves','themselves',
    'money','time','work','school','home','office','market','hospital',
    'restaurant','hotel','airport','station','road','street','city','town',
    'village','country','world','place','area','location','direction',
    'happy','sad','angry','excited','nervous','tired','bored','confused',
    'surprised','scared','proud','thankful','grateful','sorry','fine','okay',
    'great','good','bad','terrible','wonderful','awesome','amazing','perfect',
    'interesting','boring','funny','serious','important','necessary','useful',
    'come','coming','goes','going','wants','needs','thinks','knows','feels',
    'looks','seems','becomes','happens','changes','starts','stops','helps',
    'tries','works','plays','studies','reads','writes','speaks','listens',
    'watching','waiting','walking','running','eating','drinking','sleeping',
    'buying','selling','giving','taking','making','doing','saying','asking',
  ];

  // ── LAYER 3: TANGLISH SEED LIST ───────────────────────────────
  const TANGLISH = [
    'seri','aamaa','illa','illai','maybe','sollu','solla','soldren',
    'theriyum','theriyala','puriyuthu','puriyala','okay','otay',
    'naan','nee','avan','aval','naanga','nenga','avanga','yaar',
    'akka','anna','amma','appa','thatha','paati','machan','macha',
    'da','di','bro','pa','ma','tambi','thambi','nanban','nanbi',
    'enna','yenna','eppadi','epdi','enge','engey','eppo','eppove',
    'yaaru','yaar','yen','yennapa','yennama','yennada','yennadi',
    'vaa','vaayen','poi','poyen','paren','paaru','sollu','kelu',
    'varuven','varuva','povom','palam','sollren','ketren','parkiren',
    'pannren','pannuven','irukken','iruken','vandhen','vanden',
    'sollunga','parunga','vaanga','poonga','pannunga','kelunga',
    'romba','konjam','nalla','nallaa','super','kalakkal','semma',
    'mokka','kaduppu','pavam','azhaga','azhagaa','happy','santhosham',
    'kavalai','tension','bore','mosam','waste','mass','patta',
    'sappa','thappa','correct','exact','true',
    'kandippa','definitely','pochu','achu','mudinju','mudinjuchu',
    'varuma','varuva','povana','povan','solluva','solluvan',
    'nandri','thanks','vanakkam','welcome','saptiya','sapten',
    'thinren','kudikiren','tidren','padikiren','thoonguren',
    'velaikku','veetuku','schoolku','collegeku','friendsku',
    'ippo','ippove','appo','appove','naalaiku','naalai','nethu',
    'mundha','munnadi','pinna','pinnadi','morning','evening',
    'romba','oru','rendu','moonu','naalu','ainjy','aaru',
    'vera','vere','mattum','kuda','ellam','yellam','onnum',
    'veedu','veetu','ooru','ur','kadai','kadaikku','school',
    'college','office','hospital','kovil','park','road','bus',
    'train','auto','bike','car','phone','laptop','panam','money',
    'aana','aanaa','aprum','aprm','athuku','aduku','ingey','inge',
    'ange','angey','yengey','inniku','inniki','indha','antha',
  ];

  // ── LAYER 2: PERSONAL WORD FREQUENCY ─────────────────────────
  const PERSONAL_KEY = 'tb_personal_words';

  function getPersonalWords() {
    try { return JSON.parse(localStorage.getItem(PERSONAL_KEY) || '{}'); }
    catch { return {}; }
  }

  function recordWord(word) {
    if (!word || word.length < 2) return;
    const store = getPersonalWords();
    const w = word.toLowerCase();
    store[w] = (store[w] || 0) + 1;
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(store));
  }

  function getPersonalSuggestions(prefix) {
    const lower = prefix.toLowerCase();
    return Object.entries(getPersonalWords())
      .filter(([w]) => w.startsWith(lower) && w !== lower)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
  }

  // ── LAYER 0+1: BIGRAMS & TRIGRAMS ────────────────────────────
  const BIGRAMS_KEY  = 'tb_bigrams';
  const TRIGRAMS_KEY = 'tb_trigrams';

  function getBigrams()  {
    try { return JSON.parse(localStorage.getItem(BIGRAMS_KEY)  || '{}'); }
    catch { return {}; }
  }
  function getTrigrams() {
    try { return JSON.parse(localStorage.getItem(TRIGRAMS_KEY) || '{}'); }
    catch { return {}; }
  }

  function recordBigram(prev, next) {
    if (!prev || !next || next.length < 2) return;
    const store = getBigrams();
    const key = prev.toLowerCase() + '→' + next.toLowerCase();
    store[key] = (store[key] || 0) + 1;
    localStorage.setItem(BIGRAMS_KEY, JSON.stringify(store));
  }

  function recordTrigram(prev2, prev1, next) {
    if (!prev2 || !prev1 || !next || next.length < 2) return;
    const store = getTrigrams();
    const key = prev2.toLowerCase() + ' ' + prev1.toLowerCase() + '→' + next.toLowerCase();
    store[key] = (store[key] || 0) + 1;
    localStorage.setItem(TRIGRAMS_KEY, JSON.stringify(store));
  }

  function getBigramSuggestions(lastWord) {
    if (!lastWord) return [];
    const prefix = lastWord.toLowerCase() + '→';
    return Object.entries(getBigrams())
      .filter(([k]) => k.startsWith(prefix))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k.slice(prefix.length));
  }

  function getTrigramSuggestions(prev2, prev1) {
    if (!prev2 || !prev1) return [];
    const prefix = prev2.toLowerCase() + ' ' + prev1.toLowerCase() + '→';
    return Object.entries(getTrigrams())
      .filter(([k]) => k.startsWith(prefix))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k.slice(prefix.length));
  }

  // ── SUGGESTION ENGINE ─────────────────────────────────────────
  function getSuggestions(prefix) {
    const seen    = new Set();
    const results = [];
    const lower   = prefix.toLowerCase();

    function add(word) {
      const w = word.toLowerCase();
      if (!seen.has(w) && w !== lower && results.length < 5) {
        seen.add(w);
        results.push(word);
      }
    }

    if (!prefix || prefix.length === 0) {
      // Next-word prediction — context-driven
      getTrigramSuggestions(prevTypedWord, lastTypedWord).forEach(add);
      getBigramSuggestions(lastTypedWord).forEach(add);
      getPersonalSuggestions('').forEach(add);
      // Fill remaining slots with common defaults
      ['okay','seri','nalla','thanks','sure'].forEach(add);
    } else {
      // Prefix completion — priority: trigram → bigram → personal → Tanglish → English
      getTrigramSuggestions(prevTypedWord, lastTypedWord)
        .filter(w => w.startsWith(lower)).forEach(add);
      getBigramSuggestions(lastTypedWord)
        .filter(w => w.startsWith(lower)).forEach(add);
      getPersonalSuggestions(lower).forEach(add);
      TANGLISH.filter(w => w.startsWith(lower)).forEach(add);
      ENGLISH.filter(w  => w.startsWith(lower)).forEach(add);
    }

    // Always return exactly 5 slots so renderChips never gets fewer
    while (results.length < 5) results.push('');
    return results.slice(0, 5);
  }

  // ── RENDER CHIPS ─────────────────────────────────────────────
  function renderChips(suggestions) {
    if (!container) return;

    // Get or create the .suggestions flex wrapper inside #row1-center.
    // This is what the CSS targets — chips must live inside it.
    let wrapper = container.querySelector('.suggestions');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'suggestions';
      container.innerHTML = '';
      container.appendChild(wrapper);
    }
    wrapper.innerHTML = '';

    // Always exactly 5 slots — pad with empty strings so layout never collapses
    const slots = Array.from({ length: 5 }, (_, i) => suggestions[i] || '');

    slots.forEach((word, index) => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';

      if (!word) {
        // Invisible placeholder — holds space, never interactive
        chip.disabled = true;
        chip.style.opacity       = '0';
        chip.style.pointerEvents = 'none';
        chip.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(chip);
        return;
      }

      // Index 2 = primary (center); 0,1,3,4 = alternatives
      if (index === 2) chip.classList.add('suggestion-chip--primary');

      chip.textContent = word;

      chip.addEventListener('click', () => {
        Haptics.tap();
        recordWord(word);
        recordBigram(lastTypedWord, word);
        recordTrigram(prevTypedWord, lastTypedWord, word);

        prevTypedWord = lastTypedWord;
        lastTypedWord = word.toLowerCase();

        WS.send({ panel: 'typing', action: 'suggestion', word, prefix: currentWord });

        currentWord = '';
        renderChips(getSuggestions(''));
      });

      wrapper.appendChild(chip);
    });
  }

  // ── UPDATE ────────────────────────────────────────────────────
  // Called from app.js when Python sends current typed word.
  // word === '' means the user hit space — a word was just completed.
  function update(word) {
    const completedWord = currentWord; // capture before overwrite
    currentWord = word;

    if (word === '' && completedWord.length > 1) {
      recordWord(completedWord);
      prevTypedWord = lastTypedWord;
      lastTypedWord = completedWord.toLowerCase();
    }

    renderChips(getSuggestions(word));
  }

  // ── SHOW DEFAULTS ─────────────────────────────────────────────
  function showDefaults() {
    currentWord = '';
    renderChips(getSuggestions(''));
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init(containerEl) {
    container = containerEl;
    showDefaults();
  }

  function activate()   {}
  function deactivate() { showDefaults(); }

  return { init, update, activate, deactivate };

})();

export { WordSuggestions };
