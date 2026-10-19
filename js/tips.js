/* ═══ Folktracks — launch tips ════════════════════════════════════════════
   One short piece of advice on the splash screen, every time the app
   opens. Deliberately *not* keyed like the rest of i18n: these are a
   pool to draw from, not strings the UI looks up by name, so they live
   as parallel arrays rather than 24 numbered keys per language.

   Every pool is written natively rather than translated word for word —
   the point is that it reads like advice, not like a localised string.
   Keep the pools the same length-ish and the same voice: second person,
   one sentence, no attribution.
   ═══════════════════════════════════════════════════════════════════ */
import { getLang } from './i18n.js';

const TIPS = {
  en: [
    'Aim for eight hours of sleep — recovery is where the training actually pays off.',
    'Drink a glass of water before your first coffee.',
    'Protein at every meal keeps hunger quiet for hours.',
    'A day logged honestly beats a week logged perfectly.',
    'Progress is the average of your ordinary days, not your best one.',
    'Weigh yourself at the same time each morning — the trend matters, the number does not.',
    'Walk after dinner. Ten minutes is enough to blunt the glucose spike.',
    'You cannot out-train a short night.',
    'Fibre is the macro everyone forgets. Aim for thirty grams.',
    'Half a plate of vegetables costs almost nothing and fills you up.',
    'Missing one day is a slip. Missing two is the start of a pattern.',
    'Get one more rep at the same weight before you add a plate.',
    'Hunger often reads as thirst. Drink first, then decide.',
    'Rest days are part of the programme, not a break from it.',
    'Cook once, eat twice — tomorrow you will be grateful.',
    'The scale moves in steps, not slopes. Trust the week, not the morning.',
    'Eat slowly. Fullness takes twenty minutes to arrive.',
    'Strength is built in the sets you did not feel like doing.',
    'Front-load your protein: appetite runs out before the day does.',
    'Daylight in your first hour awake sets up tonight’s sleep.',
    'Consistency beats intensity, every single week.',
    'Log it before you eat it. It changes what you eat.',
    'A deficit you can hold for months beats one you abandon in a week.',
    'Small, boring, repeated. That is the whole secret.',
  ],
  fr: [
    'Visez huit heures de sommeil — c’est pendant la récupération que l’entraînement porte ses fruits.',
    'Buvez un verre d’eau avant votre premier café.',
    'Des protéines à chaque repas et la faim reste silencieuse pendant des heures.',
    'Une journée notée honnêtement vaut mieux qu’une semaine notée parfaitement.',
    'Le progrès est la moyenne de vos journées ordinaires, pas de la meilleure.',
    'Pesez-vous à la même heure chaque matin — c’est la tendance qui compte, pas le chiffre.',
    'Marchez après le dîner. Dix minutes suffisent à amortir le pic de glycémie.',
    'Aucun entraînement ne rattrape une nuit écourtée.',
    'Les fibres sont le macro que tout le monde oublie. Visez trente grammes.',
    'Une demi-assiette de légumes ne coûte presque rien et rassasie.',
    'Manquer un jour est un écart. En manquer deux, c’est le début d’une habitude.',
    'Faites une répétition de plus avant d’ajouter du poids.',
    'La faim se confond souvent avec la soif. Buvez d’abord, décidez ensuite.',
    'Les jours de repos font partie du programme, pas une pause.',
    'Cuisinez une fois, mangez deux fois — vous vous remercierez demain.',
    'La balance avance par paliers. Fiez-vous à la semaine, pas au matin.',
    'Mangez lentement. La satiété met vingt minutes à arriver.',
    'La force se construit dans les séries qu’on n’avait pas envie de faire.',
    'Prenez vos protéines tôt : l’appétit s’épuise avant la journée.',
    'La lumière du jour dans l’heure qui suit le réveil prépare la nuit.',
    'La régularité l’emporte sur l’intensité, chaque semaine.',
    'Notez-le avant de le manger. Cela change ce que vous mangez.',
    'Un déficit tenu des mois vaut mieux qu’un déficit abandonné en une semaine.',
    'Petit, ennuyeux, répété. C’est tout le secret.',
  ],
  es: [
    'Apunta a ocho horas de sueño: la recuperación es donde el entrenamiento da sus frutos.',
    'Bebe un vaso de agua antes del primer café.',
    'Proteína en cada comida y el hambre se queda callada durante horas.',
    'Un día registrado con honestidad vale más que una semana registrada a la perfección.',
    'El progreso es el promedio de tus días normales, no del mejor.',
    'Pésate a la misma hora cada mañana: importa la tendencia, no el número.',
    'Camina después de cenar. Diez minutos bastan para suavizar el pico de glucosa.',
    'Ningún entrenamiento compensa una noche corta.',
    'La fibra es el macro que todos olvidan. Apunta a treinta gramos.',
    'Medio plato de verduras no cuesta casi nada y llena.',
    'Fallar un día es un desliz. Fallar dos es el principio de un patrón.',
    'Haz una repetición más con el mismo peso antes de añadir disco.',
    'El hambre se confunde a menudo con la sed. Bebe primero y luego decide.',
    'Los días de descanso son parte del plan, no una pausa.',
    'Cocina una vez, come dos — mañana te lo agradecerás.',
    'La báscula avanza a saltos. Confía en la semana, no en la mañana.',
    'Come despacio. La saciedad tarda veinte minutos en llegar.',
    'La fuerza se construye en las series que no te apetecía hacer.',
    'Adelanta la proteína: el apetito se agota antes que el día.',
    'La luz del sol en tu primera hora despierto prepara el sueño de esta noche.',
    'La constancia gana a la intensidad, todas las semanas.',
    'Regístralo antes de comerlo. Cambia lo que comes.',
    'Un déficit que aguantas meses vale más que uno que abandonas en una semana.',
    'Pequeño, aburrido, repetido. Ese es todo el secreto.',
  ],
  de: [
    'Ziel sind acht Stunden Schlaf — in der Erholung zahlt sich das Training aus.',
    'Trink ein Glas Wasser vor dem ersten Kaffee.',
    'Protein zu jeder Mahlzeit hält den Hunger stundenlang ruhig.',
    'Ein ehrlich protokollierter Tag schlägt eine perfekt protokollierte Woche.',
    'Fortschritt ist der Durchschnitt deiner gewöhnlichen Tage, nicht deines besten.',
    'Wieg dich jeden Morgen zur selben Zeit — der Trend zählt, nicht die Zahl.',
    'Geh nach dem Abendessen spazieren. Zehn Minuten dämpfen die Glukosespitze.',
    'Kein Training macht eine zu kurze Nacht wett.',
    'Ballaststoffe sind das Makro, das alle vergessen. Ziel: dreißig Gramm.',
    'Ein halber Teller Gemüse kostet fast nichts und macht satt.',
    'Ein ausgelassener Tag ist ein Ausrutscher. Zwei sind der Anfang eines Musters.',
    'Schaff eine Wiederholung mehr, bevor du Gewicht drauflegst.',
    'Hunger fühlt sich oft wie Durst an. Erst trinken, dann entscheiden.',
    'Ruhetage gehören zum Plan, sie sind keine Pause davon.',
    'Einmal kochen, zweimal essen — dein morgiges Ich dankt es dir.',
    'Die Waage bewegt sich in Stufen. Vertrau der Woche, nicht dem Morgen.',
    'Iss langsam. Sättigung braucht zwanzig Minuten.',
    'Kraft entsteht in den Sätzen, auf die du keine Lust hattest.',
    'Zieh das Protein nach vorn: der Appetit endet früher als der Tag.',
    'Tageslicht in der ersten Stunde nach dem Aufwachen regelt den Schlaf heute Nacht.',
    'Beständigkeit schlägt Intensität — jede Woche.',
    'Trag es ein, bevor du es isst. Das ändert, was du isst.',
    'Ein Defizit, das du monatelang hältst, schlägt eines, das du nach einer Woche aufgibst.',
    'Klein, langweilig, wiederholt. Das ist das ganze Geheimnis.',
  ],
  ar: [
    'استهدف ثماني ساعات من النوم — فالتعافي هو ما يجعل التمرين يؤتي ثماره.',
    'اشرب كوب ماء قبل قهوتك الأولى.',
    'البروتين في كل وجبة يُبقي الجوع هادئًا لساعات.',
    'يوم مسجَّل بصدق خير من أسبوع مسجَّل بإتقان.',
    'التقدّم هو معدّل أيامك العادية، لا أفضلها.',
    'زِن نفسك في الوقت ذاته كل صباح — العبرة بالاتجاه لا بالرقم.',
    'امشِ بعد العشاء. عشر دقائق تكفي لتخفيف ارتفاع السكر.',
    'لا تمرين يعوّض ليلة نوم قصيرة.',
    'الألياف هي العنصر الذي ينساه الجميع. استهدف ثلاثين غرامًا.',
    'نصف الطبق خضار لا يكلّفك شيئًا تقريبًا ويُشبعك.',
    'تفويت يوم زلّة. تفويت يومين بداية عادة.',
    'أضف تكرارًا واحدًا بالوزن نفسه قبل أن تزيد الحديد.',
    'كثيرًا ما يلتبس الجوع بالعطش. اشرب أولًا ثم قرّر.',
    'أيام الراحة جزء من البرنامج، لا انقطاع عنه.',
    'اطبخ مرة وكُل مرتين — ستشكر نفسك غدًا.',
    'الميزان يتحرك على درجات. ثق بالأسبوع لا بالصباح.',
    'كُل ببطء. الشبع يحتاج عشرين دقيقة ليصل.',
    'القوة تُبنى في المجموعات التي لم تكن ترغب في أدائها.',
    'قدّم البروتين في أول يومك: الشهية تنفد قبل أن ينتهي اليوم.',
    'ضوء الشمس في أول ساعة بعد الاستيقاظ ينظّم نومك الليلة.',
    'الانتظام يتفوق على الشدّة، كل أسبوع.',
    'سجّلها قبل أن تأكلها. هذا يغيّر ما تأكله.',
    'عجز تستطيع الاستمرار عليه شهورًا خير من عجز تتركه بعد أسبوع.',
    'صغير، ممل، متكرر. هذا هو السر كله.',
  ],
};

const LAST_KEY = 'zenith.tip.last';

const readLast = () => {
  try {
    const v = parseInt(localStorage.getItem(LAST_KEY) ?? '', 10);
    return Number.isInteger(v) ? v : -1;
  } catch { return -1; }
};

/**
 * A tip in the language currently active in i18n — which app.js resolves
 * from settings.lang (including 'auto') before this ever runs.
 * Never returns the same line two launches in a row.
 */
export function pickTip(lang = getLang()) {
  const pool = TIPS[lang] || TIPS.en;
  if (!pool.length) return '';

  // Draw from the pool minus the previous index, then step over the gap:
  // an even spread across everything except what you saw last time.
  const last = readLast();
  const skip = pool.length > 1 && last >= 0 && last < pool.length;
  let i = Math.floor(Math.random() * (pool.length - (skip ? 1 : 0)));
  if (skip && i >= last) i++;

  try { localStorage.setItem(LAST_KEY, String(i)); } catch { /* private mode */ }
  return pool[i];
}

/** The whole pool for a language. Exported for tests and for any view
    that wants to show more than one line. */
export const tipsFor = lang => TIPS[lang] || TIPS.en;
