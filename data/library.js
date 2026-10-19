/* ═══ Folktracks — built-in food library ══════════════════════════════════
   Values are per 100 g (or per 100 ml for liquids), rounded from public
   composition tables (USDA FDC, CIQUAL, McCance & Widdowson).
   Columns: id | name | emoji | cat | kcal | protein | carbs | fat |
            fibre | sugar | saturates | sodium(mg) | servings | aliases
   Servings use `label*grams`, separated by `;`.
   Aliases carry FR / ES / DE / AR synonyms so search works in any
   of the app's languages.
   ═══════════════════════════════════════════════════════════════════ */

export const RAW = `
egg-whole|Egg, whole|🥚|protein|143|12.6|0.7|9.5|0|0.4|3.1|142|large egg*50;medium egg*44|oeuf huevo ei بيض||Œuf entier~Huevo entero~Ei, ganz~بيض كامل
egg-white|Egg white|🥚|protein|52|10.9|0.7|0.2|0|0.7|0|166|white*33|blanc doeuf clara eiweiss بياض البيض||Blanc d'œuf~Clara de huevo~Eiweiß~بياض البيض
chicken-breast|Chicken breast, cooked|🍗|protein|165|31|0|3.6|0|0|1|74|fillet*150;100 g*100|poulet pollo hahnchen دجاج صدر||Blanc de poulet cuit~Pechuga de pollo cocida~Hähnchenbrust, gegart~صدر دجاج مطبوخ
chicken-thigh|Chicken thigh, cooked|🍗|protein|209|26|0|11|0|0|3|88|thigh*90|cuisse muslo schenkel فخذ دجاج||Cuisse de poulet cuite~Muslo de pollo cocido~Hähnchenschenkel, gegart~فخذ دجاج مطبوخ
turkey-breast|Turkey breast, cooked|🦃|protein|135|30|0|1.7|0|0|0.5|63|slice*30|dinde pavo pute ديك رومي||Blanc de dinde cuit~Pechuga de pavo cocida~Putenbrust, gegart~صدر ديك رومي
beef-lean|Beef mince 5%, cooked|🥩|protein|187|26|0|9|0|0|3.8|72|100 g*100|boeuf hache carne picada rind لحم بقر||Bœuf haché 5% cuit~Carne picada de ternera 5%~Rinderhack 5%, gegart~لحم بقر مفروم 5%
beef-steak|Beef sirloin steak, grilled|🥩|protein|206|30|0|9.2|0|0|3.6|55|steak*180|entrecote solomillo steak ستيك||Entrecôte de bœuf grillée~Solomillo de ternera a la plancha~Rindersteak, gegrillt~ستيك بقري مشوي
lamb-lean|Lamb leg, roasted|🍖|protein|235|28|0|13|0|0|5.6|72|100 g*100|agneau cordero lamm لحم غنم||Gigot d'agneau rôti~Pierna de cordero asada~Lammkeule, gebraten~فخذ خروف مشوي
pork-loin|Pork loin, cooked|🥓|protein|206|28|0|10|0|0|3.5|55|chop*140|porc cerdo schwein لحم خنزير||Longe de porc cuite~Lomo de cerdo cocido~Schweinelende, gegart~خاصرة خنزير
bacon|Bacon, grilled|🥓|protein|318|24|0.5|24|0|0|8|1500|rasher*25|lard tocino speck||Bacon grillé~Bacon a la plancha~Speck, gegrillt~بيكون مشوي
salmon|Salmon, cooked|🐟|protein|206|22|0|12|0|0|2.5|61|fillet*130|saumon salmon lachs سلمون||Saumon cuit~Salmón cocido~Lachs, gegart~سلمون مطبوخ
tuna-can|Tuna, canned in water|🐟|protein|116|26|0|0.8|0|0|0.2|247|can*112|thon atun thunfisch تونة||Thon au naturel~Atún al natural~Thunfisch in Wasser~تونة في الماء
cod|Cod, cooked|🐟|protein|105|23|0|0.9|0|0|0.2|78|fillet*140|cabillaud bacalao kabeljau سمك||Cabillaud cuit~Bacalao cocido~Kabeljau, gegart~سمك القد
sardines|Sardines, canned in oil|🐟|protein|208|25|0|11|0|0|1.5|307|tin*90|sardines sardinas sardinen سردين||Sardines à l'huile~Sardinas en aceite~Sardinen in Öl~سردين بالزيت
shrimp|Prawns, cooked|🦐|protein|99|24|0.2|0.3|0|0|0.1|111|100 g*100|crevettes gambas garnelen جمبري روبيان||Crevettes cuites~Gambas cocidas~Garnelen, gegart~جمبري مطبوخ
tofu-firm|Tofu, firm|🧊|protein|144|17|2.8|8.7|2.3|0.6|1.3|14|block*150|tofu توفو||Tofu ferme~Tofu firme~Tofu, fest~توفو صلب
tempeh|Tempeh|🧊|protein|193|19|9|11|6|3|2.2|9|100 g*100|tempeh||Tempeh~Tempeh~Tempeh~تمبيه
seitan|Seitan|🌾|protein|141|25|14|1.9|0.6|0|0.3|300|100 g*100|seitan||Seitan~Seitán~Seitan~سيتان
whey|Whey protein powder|🥤|protein|380|78|8|5|1|5|2.5|300|scoop*30|proteine proteina eiweisspulver بروتين مصل||Protéine whey~Proteína de suero~Whey-Protein~بروتين مصل اللبن
casein|Casein protein powder|🥤|protein|364|76|6|3|1|4|1.8|420|scoop*32|caseine caseina||Protéine caséine~Proteína caseína~Casein-Protein~بروتين الكازين
milk-whole|Milk, whole|🥛|dairy|64|3.3|4.8|3.6|0|4.8|2.1|44|glass*250;100 ml*100|lait leche milch حليب||Lait entier~Leche entera~Vollmilch~حليب كامل الدسم
milk-skim|Milk, skimmed|🥛|dairy|35|3.4|5|0.1|0|5|0.1|44|glass*250|lait ecreme desnatada magermilch حليب خالي الدسم||Lait écrémé~Leche desnatada~Magermilch~حليب خالي الدسم
yogurt-greek|Greek yoghurt, 0%|🥣|dairy|59|10|3.6|0.4|0|3.2|0.1|36|pot*170|yaourt grec yogur joghurt لبن زبادي يوناني||Yaourt grec 0%~Yogur griego 0%~Griechischer Joghurt 0%~زبادي يوناني 0%
yogurt-plain|Yoghurt, plain whole|🥣|dairy|61|3.5|4.7|3.3|0|4.7|2.1|46|pot*125|yaourt yogur joghurt زبادي||Yaourt nature entier~Yogur natural entero~Naturjoghurt~زبادي طبيعي
skyr|Skyr|🥣|dairy|63|11|4|0.2|0|4|0.1|40|pot*150|skyr||Skyr~Skyr~Skyr~سكير
cottage-cheese|Cottage cheese|🧀|dairy|98|11|3.4|4.3|0|2.7|1.7|364|pot*200|fromage blanc requeson huttenkase جبن قريش||Fromage blanc en grains~Requesón~Hüttenkäse~جبن قريش
cheddar|Cheddar cheese|🧀|dairy|402|25|1.3|33|0|0.5|21|621|slice*25|cheddar fromage queso kase جبن||Cheddar~Queso cheddar~Cheddar~جبن شيدر
mozzarella|Mozzarella|🧀|dairy|280|22|2.2|20|0|1|12|627|ball*125|mozzarella جبن موزاريلا||Mozzarella~Mozzarella~Mozzarella~موزاريلا
feta|Feta|🧀|dairy|264|14|4.1|21|0|4.1|15|917|cube*30|feta جبن فيتا||Feta~Feta~Feta~جبن فيتا
parmesan|Parmesan|🧀|dairy|392|36|3.2|26|0|0.8|17|1602|tbsp*5|parmesan جبن بارميزان||Parmesan~Parmesano~Parmesan~بارميزان
cream-cheese|Cream cheese|🧀|dairy|342|6|4.1|34|0|3.8|20|314|tbsp*15|fromage a tartiner queso crema frischkase||Fromage à tartiner~Queso crema~Frischkäse~جبن كريمي
butter|Butter|🧈|fat|717|0.9|0.1|81|0|0.1|51|11|pat*7;tbsp*14|beurre mantequilla butter زبدة||Beurre~Mantequilla~Butter~زبدة
olive-oil|Olive oil|🫒|fat|884|0|0|100|0|0|14|2|tbsp*13.5;tsp*4.5|huile dolive aceite oliva olivenol زيت زيتون||Huile d'olive~Aceite de oliva~Olivenöl~زيت زيتون
coconut-oil|Coconut oil|🥥|fat|892|0|0|99|0|0|87|0|tbsp*14|huile de coco aceite de coco||Huile de coco~Aceite de coco~Kokosöl~زيت جوز الهند
rice-white|White rice, cooked|🍚|carb|130|2.7|28|0.3|0.4|0.1|0.1|1|cup*158;100 g*100|riz arroz reis أرز||Riz blanc cuit~Arroz blanco cocido~Weißer Reis, gekocht~أرز أبيض مطبوخ
rice-brown|Brown rice, cooked|🍚|carb|123|2.7|26|1|1.6|0.4|0.2|4|cup*195|riz complet arroz integral أرز بني||Riz complet cuit~Arroz integral cocido~Vollkornreis, gekocht~أرز بني مطبوخ
pasta|Pasta, cooked|🍝|carb|158|5.8|31|0.9|1.8|0.6|0.2|1|plate*200;100 g*100|pates pasta nudeln معكرونة||Pâtes cuites~Pasta cocida~Nudeln, gekocht~معكرونة مطبوخة
pasta-whole|Wholewheat pasta, cooked|🍝|carb|149|6|30|1.4|4.5|0.9|0.3|4|plate*200|pates completes pasta integral||Pâtes complètes cuites~Pasta integral cocida~Vollkornnudeln~معكرونة كاملة
couscous|Couscous, cooked|🍚|carb|112|3.8|23|0.2|1.4|0.1|0|5|cup*157|couscous كسكس||Couscous cuit~Cuscús cocido~Couscous, gekocht~كسكس مطبوخ
quinoa|Quinoa, cooked|🍚|carb|120|4.4|21|1.9|2.8|0.9|0.2|7|cup*185|quinoa كينوا||Quinoa cuit~Quinoa cocida~Quinoa, gekocht~كينوا مطبوخة
oats|Oats, dry|🥣|carb|389|17|66|7|11|1|1.2|2|serving*40;cup*81|avoine avena hafer شوفان||Flocons d'avoine~Copos de avena~Haferflocken~شوفان
bread-white|White bread|🍞|carb|265|9|49|3.2|2.7|5|0.7|491|slice*30|pain pan brot خبز||Pain blanc~Pan blanco~Weißbrot~خبز أبيض
bread-whole|Wholemeal bread|🍞|carb|247|13|41|3.4|7|4.3|0.7|455|slice*36|pain complet pan integral vollkornbrot خبز أسمر||Pain complet~Pan integral~Vollkornbrot~خبز أسمر
baguette|Baguette|🥖|carb|274|9|55|1.3|2.5|2.6|0.3|600|piece*60|baguette خبز فرنسي||Baguette~Baguette~Baguette~خبز فرنسي
pita|Pita bread|🫓|carb|275|9.1|55|1.2|2.2|1.3|0.2|536|pita*60|pain pita pan de pita خبز عربي||Pain pita~Pan de pita~Pitabrot~خبز عربي
tortilla|Flour tortilla|🌮|carb|306|8.2|51|7.9|3|2.4|2|590|tortilla*45|tortilla||Tortilla de blé~Tortilla de trigo~Weizentortilla~خبز تورتيا
potato|Potato, boiled|🥔|carb|87|2|20|0.1|1.8|0.9|0|4|medium*170|pomme de terre patata kartoffel بطاطا||Pomme de terre bouillie~Patata cocida~Kartoffel, gekocht~بطاطا مسلوقة
sweet-potato|Sweet potato, baked|🍠|carb|90|2|21|0.1|3.3|6.5|0|36|medium*150|patate douce batata sussk بطاطا حلوة||Patate douce au four~Boniato al horno~Süßkartoffel, gebacken~بطاطا حلوة
fries|French fries, fried|🍟|carb|312|3.4|41|15|3.8|0.3|2.3|210|portion*130|frites patatas fritas pommes بطاطا مقلية||Frites~Patatas fritas~Pommes frites~بطاطا مقلية
lentils|Lentils, cooked|🫘|carb|116|9|20|0.4|7.9|1.8|0.1|2|cup*198|lentilles lentejas linsen عدس||Lentilles cuites~Lentejas cocidas~Linsen, gekocht~عدس مطبوخ
chickpeas|Chickpeas, cooked|🫘|carb|164|8.9|27|2.6|7.6|4.8|0.3|7|cup*164|pois chiches garbanzos kichererbsen حمص||Pois chiches cuits~Garbanzos cocidos~Kichererbsen, gekocht~حمص مطبوخ
black-beans|Black beans, cooked|🫘|carb|132|8.9|24|0.5|8.7|0.3|0.1|2|cup*172|haricots noirs frijoles bohnen فاصولياء||Haricots noirs cuits~Frijoles negros cocidos~Schwarze Bohnen~فاصولياء سوداء
kidney-beans|Kidney beans, cooked|🫘|carb|127|8.7|23|0.5|6.4|0.3|0.1|2|cup*177|haricots rouges alubias||Haricots rouges cuits~Alubias rojas cocidas~Kidneybohnen~فاصولياء حمراء
hummus|Hummus|🫓|carb|166|7.9|14|9.6|6|0.3|1.4|379|tbsp*15|houmous حمص بالطحينة||Houmous~Hummus~Hummus~حمص بالطحينة
falafel|Falafel|🧆|meal|333|13|32|18|4.9|0|2.4|294|ball*17|falafel فلافل طعمية||Falafel~Falafel~Falafel~فلافل
broccoli|Broccoli, cooked|🥦|veg|35|2.4|7.2|0.4|3.3|1.4|0|41|cup*156|brocoli brocoli brokkoli بروكلي||Brocoli cuit~Brócoli cocido~Brokkoli, gegart~بروكلي مطبوخ
spinach|Spinach, raw|🥬|veg|23|2.9|3.6|0.4|2.2|0.4|0.1|79|handful*30|epinards espinacas spinat سبانخ||Épinards crus~Espinacas crudas~Spinat, roh~سبانخ نيئة
kale|Kale, raw|🥬|veg|49|4.3|8.8|0.9|3.6|2.3|0.1|38|cup*67|chou kale col rizada grunkohl||Chou kale cru~Col rizada cruda~Grünkohl, roh~كرنب أجعد
lettuce|Lettuce|🥬|veg|15|1.4|2.9|0.2|1.3|0.8|0|28|leaf*10|laitue lechuga salat خس||Laitue~Lechuga~Kopfsalat~خس
tomato|Tomato|🍅|veg|18|0.9|3.9|0.2|1.2|2.6|0|5|medium*123|tomate tomate tomate طماطم||Tomate~Tomate~Tomate~طماطم
cucumber|Cucumber|🥒|veg|15|0.7|3.6|0.1|0.5|1.7|0|2|medium*200|concombre pepino gurke خيار||Concombre~Pepino~Gurke~خيار
carrot|Carrot|🥕|veg|41|0.9|10|0.2|2.8|4.7|0|69|medium*61|carotte zanahoria karotte جزر||Carotte~Zanahoria~Karotte~جزر
bell-pepper|Bell pepper|🫑|veg|31|1|6|0.3|2.1|4.2|0|4|medium*119|poivron pimiento paprika فلفل حلو||Poivron~Pimiento~Paprika~فلفل حلو
onion|Onion|🧅|veg|40|1.1|9.3|0.1|1.7|4.2|0|4|medium*110|oignon cebolla zwiebel بصل||Oignon~Cebolla~Zwiebel~بصل
garlic|Garlic|🧄|veg|149|6.4|33|0.5|2.1|1|0.1|17|clove*3|ail ajo knoblauch ثوم||Ail~Ajo~Knoblauch~ثوم
courgette|Courgette|🥒|veg|17|1.2|3.1|0.3|1|2.5|0.1|8|medium*196|courgette calabacin zucchini كوسة||Courgette~Calabacín~Zucchini~كوسة
aubergine|Aubergine|🍆|veg|25|1|6|0.2|3|3.5|0|2|medium*250|aubergine berenjena aubergine باذنجان||Aubergine~Berenjena~Aubergine~باذنجان
mushroom|Mushrooms|🍄|veg|22|3.1|3.3|0.3|1|2|0|5|cup*70|champignons setas pilze فطر||Champignons~Champiñones~Champignons~فطر
green-beans|Green beans, cooked|🫛|veg|35|1.9|7.9|0.3|3.2|1.5|0|1|cup*125|haricots verts judias verdes||Haricots verts cuits~Judías verdes cocidas~Grüne Bohnen~فاصولياء خضراء
peas|Peas, cooked|🫛|veg|84|5.4|16|0.2|5.5|6|0|3|cup*160|petits pois guisantes erbsen بازلاء||Petits pois cuits~Guisantes cocidos~Erbsen, gekocht~بازلاء مطبوخة
corn|Sweetcorn|🌽|veg|96|3.4|21|1.5|2.4|4.5|0.2|15|cob*90|mais maiz mais ذرة||Maïs doux~Maíz dulce~Zuckermais~ذرة حلوة
avocado|Avocado|🥑|fat|160|2|8.5|15|6.7|0.7|2.1|7|half*100|avocat aguacate avocado أفوكادو||Avocat~Aguacate~Avocado~أفوكادو
apple|Apple|🍎|fruit|52|0.3|14|0.2|2.4|10|0|1|medium*182|pomme manzana apfel تفاح||Pomme~Manzana~Apfel~تفاح
banana|Banana|🍌|fruit|89|1.1|23|0.3|2.6|12|0.1|1|medium*118|banane platano banane موز||Banane~Plátano~Banane~موز
orange|Orange|🍊|fruit|47|0.9|12|0.1|2.4|9.4|0|0|medium*131|orange naranja apfelsine برتقال||Orange~Naranja~Orange~برتقال
strawberry|Strawberries|🍓|fruit|32|0.7|7.7|0.3|2|4.9|0|1|cup*152|fraises fresas erdbeeren فراولة||Fraises~Fresas~Erdbeeren~فراولة
blueberry|Blueberries|🫐|fruit|57|0.7|14|0.3|2.4|10|0|1|cup*148|myrtilles arandanos heidelbeeren توت||Myrtilles~Arándanos~Heidelbeeren~توت أزرق
grapes|Grapes|🍇|fruit|69|0.7|18|0.2|0.9|16|0.1|2|cup*151|raisins uvas trauben عنب||Raisin~Uvas~Weintrauben~عنب
watermelon|Watermelon|🍉|fruit|30|0.6|7.6|0.2|0.4|6.2|0|1|slice*280|pasteque sandia melone بطيخ||Pastèque~Sandía~Wassermelone~بطيخ
mango|Mango|🥭|fruit|60|0.8|15|0.4|1.6|14|0.1|1|medium*200|mangue mango mango مانجا||Mangue~Mango~Mango~مانجو
pineapple|Pineapple|🍍|fruit|50|0.5|13|0.1|1.4|10|0|1|slice*84|ananas ananas أناناس||Ananas~Piña~Ananas~أناناس
kiwi|Kiwi|🥝|fruit|61|1.1|15|0.5|3|9|0|3|fruit*69|kiwi كيوي||Kiwi~Kiwi~Kiwi~كيوي
peach|Peach|🍑|fruit|39|0.9|10|0.3|1.5|8.4|0|0|medium*150|peche melocoton pfirsich خوخ||Pêche~Melocotón~Pfirsich~خوخ
pear|Pear|🍐|fruit|57|0.4|15|0.1|3.1|10|0|1|medium*178|poire pera birne كمثرى إجاص||Poire~Pera~Birne~إجاص
dates|Dates, medjool|🌴|fruit|277|1.8|75|0.2|6.7|66|0|1|date*24|dattes datiles datteln تمر||Dattes medjool~Dátiles medjool~Medjool-Datteln~تمر مجهول
raisins|Raisins|🍇|fruit|299|3.1|79|0.5|3.7|59|0.1|11|box*43|raisins secs pasas rosinen زبيب||Raisins secs~Pasas~Rosinen~زبيب
almonds|Almonds|🌰|nuts|579|21|22|50|13|4.4|3.8|1|handful*28|amandes almendras mandeln لوز||Amandes~Almendras~Mandeln~لوز
walnuts|Walnuts|🌰|nuts|654|15|14|65|6.7|2.6|6.1|2|handful*28|noix nueces walnusse جوز||Noix~Nueces~Walnüsse~جوز
cashews|Cashews|🌰|nuts|553|18|30|44|3.3|5.9|7.8|12|handful*28|noix de cajou anacardos cashew كاجو||Noix de cajou~Anacardos~Cashewkerne~كاجو
peanuts|Peanuts|🥜|nuts|567|26|16|49|8.5|4.7|6.3|18|handful*28|cacahuetes mani erdnusse فول سوداني||Cacahuètes~Cacahuetes~Erdnüsse~فول سوداني
peanut-butter|Peanut butter|🥜|nuts|588|25|20|50|6|9|10|17|tbsp*16|beurre de cacahuete crema de mani erdnussbutter زبدة فول||Beurre de cacahuète~Mantequilla de cacahuete~Erdnussbutter~زبدة الفول السوداني
pistachios|Pistachios|🌰|nuts|560|20|28|45|10|7.7|5.9|1|handful*28|pistaches pistachos pistazien فستق||Pistaches~Pistachos~Pistazien~فستق
chia|Chia seeds|🌱|nuts|486|17|42|31|34|0|3.3|16|tbsp*12|graines de chia chia شيا||Graines de chia~Semillas de chía~Chiasamen~بذور الشيا
flax|Flaxseed|🌱|nuts|534|18|29|42|27|1.6|3.7|30|tbsp*10|lin linaza leinsamen كتان||Graines de lin~Semillas de lino~Leinsamen~بذور الكتان
sunflower-seeds|Sunflower seeds|🌻|nuts|584|21|20|51|8.6|2.6|4.5|9|handful*28|graines de tournesol pipas||Graines de tournesol~Pipas de girasol~Sonnenblumenkerne~بذور دوار الشمس
honey|Honey|🍯|carb|304|0.3|82|0|0.2|82|0|4|tsp*7;tbsp*21|miel miel honig عسل||Miel~Miel~Honig~عسل
sugar|Sugar, white|🍬|carb|387|0|100|0|0|100|0|1|tsp*4|sucre azucar zucker سكر||Sucre blanc~Azúcar blanco~Zucker, weiß~سكر أبيض
maple-syrup|Maple syrup|🍁|carb|260|0|67|0.1|0|60|0|12|tbsp*20|sirop derable||Sirop d'érable~Sirope de arce~Ahornsirup~شراب القيقب
jam|Jam|🍓|carb|278|0.4|69|0.1|1.1|49|0|32|tsp*7|confiture mermelada marmelade مربى||Confiture~Mermelada~Marmelade~مربى
dark-chocolate|Dark chocolate 70%|🍫|snack|598|7.8|46|43|11|24|24|20|square*10|chocolat noir chocolate negro schokolade شوكولاتة داكنة||Chocolat noir 70%~Chocolate negro 70%~Zartbitterschokolade 70%~شوكولاتة داكنة 70%
milk-chocolate|Milk chocolate|🍫|snack|535|7.7|59|30|3.4|52|19|79|bar*45|chocolat au lait chocolate con leche||Chocolat au lait~Chocolate con leche~Milchschokolade~شوكولاتة بالحليب
protein-bar|Protein bar|🍫|snack|350|30|36|9|8|4|4|300|bar*60|barre proteinee barrita||Barre protéinée~Barrita de proteínas~Proteinriegel~لوح بروتين
granola|Granola|🥣|snack|471|10|64|20|7|24|3|30|serving*45|granola müsli جرانولا||Granola~Granola~Granola~جرانولا
crisps|Crisps / chips|🥔|snack|536|7|53|35|4.4|0.3|3.1|525|bag*30|chips patatas fritas رقائق||Chips~Patatas fritas de bolsa~Kartoffelchips~رقائق البطاطس
popcorn|Popcorn, air-popped|🍿|snack|387|13|78|4.5|15|0.9|0.6|8|cup*8|popcorn palomitas فشار||Pop-corn nature~Palomitas~Popcorn~فشار
biscuit|Digestive biscuit|🍪|snack|478|6.7|63|22|3.1|17|10|571|biscuit*15|biscuit galleta keks بسكويت||Biscuit sablé~Galleta digestive~Butterkeks~بسكويت
croissant|Croissant|🥐|snack|406|8.2|46|21|2.6|11|12|424|piece*57|croissant كرواسون||Croissant~Cruasán~Croissant~كرواسون
donut|Doughnut, glazed|🍩|snack|452|4.9|51|25|1.5|23|11|326|piece*60|beignet donut دونات||Beignet glacé~Dónut glaseado~Donut~دونات
ice-cream|Ice cream, vanilla|🍨|snack|207|3.5|24|11|0.7|21|6.8|80|scoop*66|glace helado eis آيس كريم||Glace vanille~Helado de vainilla~Vanilleeis~آيس كريم فانيليا
cake|Sponge cake|🍰|snack|297|5|54|7.3|0.8|33|2.2|228|slice*70|gateau pastel kuchen كعكة||Génoise~Bizcocho~Biskuitkuchen~كيك إسفنجي
pizza|Pizza, cheese|🍕|meal|266|11|33|10|2.3|3.6|4.5|598|slice*107|pizza بيتزا||Pizza au fromage~Pizza de queso~Käsepizza~بيتزا بالجبن
burger|Cheeseburger|🍔|meal|295|15|24|15|1.4|5|6.5|475|burger*150|hamburger hamburguesa برجر||Cheeseburger~Hamburguesa con queso~Cheeseburger~تشيزبرغر
kebab|Doner kebab|🥙|meal|215|15|13|12|1.2|2|4.5|540|wrap*250|kebab شاورما||Kebab~Kebab~Döner Kebab~كباب دونر
shawarma|Chicken shawarma|🥙|meal|187|18|9|9|1|1.5|2.5|420|wrap*220|shawarma شاورما دجاج||Chawarma au poulet~Shawarma de pollo~Hähnchen-Schawarma~شاورما دجاج
sushi|Sushi, salmon nigiri|🍣|meal|142|9|24|1.5|0.6|3|0.3|300|piece*40|sushi سوشي||Sushi saumon~Sushi de salmón~Lachs-Sushi~سوشي سلمون
sandwich-ham|Ham & cheese sandwich|🥪|meal|250|13|26|10|1.8|3|4.4|720|sandwich*180|sandwich bocadillo ساندويتش||Sandwich jambon-fromage~Sándwich de jamón y queso~Schinken-Käse-Sandwich~ساندويتش جبن ولحم
pasta-bolognese|Pasta bolognese|🍝|meal|142|8|17|4.5|1.6|2.5|1.8|300|plate*350|bolognaise bolonesa||Pâtes bolognaise~Pasta boloñesa~Nudeln Bolognese~معكرونة بولونيز
curry-chicken|Chicken curry|🍛|meal|145|13|6|8|1.4|2.5|3|420|plate*350|curry كاري دجاج||Curry de poulet~Curry de pollo~Hähnchencurry~كاري الدجاج
tagine|Chicken tagine|🍲|meal|128|12|8|5.5|1.8|4|1.3|380|plate*350|tajine طاجين||Tajine de poulet~Tayín de pollo~Hähnchen-Tajine~طاجين دجاج
couscous-royal|Couscous with vegetables|🍲|meal|132|5|20|3.5|2.4|2|0.8|280|plate*400|couscous كسكس بالخضار||Couscous aux légumes~Cuscús con verduras~Couscous mit Gemüse~كسكس بالخضار
lentil-soup|Lentil soup|🍲|meal|67|4.5|10|1.2|2.6|1.2|0.2|350|bowl*300|soupe de lentilles شوربة عدس||Soupe de lentilles~Sopa de lentejas~Linsensuppe~شوربة عدس
omelette|Omelette, 2 eggs|🍳|meal|154|11|0.6|12|0|0.6|3.6|155|omelette*120|omelette tortilla عجة||Omelette 2 œufs~Tortilla de 2 huevos~Omelett mit 2 Eiern~أومليت ببيضتين
scrambled-eggs|Scrambled eggs|🍳|meal|149|10|1.6|11|0|1.4|3.4|180|serving*120|oeufs brouilles huevos revueltos||Œufs brouillés~Huevos revueltos~Rührei~بيض مخفوق
caesar-salad|Caesar salad with chicken|🥗|meal|158|12|4.5|10|1.2|1.8|2.2|420|bowl*300|salade cesar ensalada cesar||Salade César au poulet~Ensalada César con pollo~Caesar Salat mit Hähnchen~سلطة سيزر بالدجاج
greek-salad|Greek salad|🥗|meal|107|3|5|8.5|1.6|3.5|3.2|420|bowl*250|salade grecque سلطة يونانية||Salade grecque~Ensalada griega~Griechischer Salat~سلطة يونانية
tabbouleh|Tabbouleh|🥗|meal|136|3|16|7|3.5|1.5|1|280|bowl*150|taboule تبولة||Taboulé~Tabulé~Taboulé~تبولة
protein-shake|Protein shake with milk|🥤|drink|72|8|6|1.6|0.3|5.5|0.8|90|glass*350|shake batido مخفوق بروتين||Shake protéiné au lait~Batido de proteínas con leche~Proteinshake mit Milch~مخفوق بروتين بالحليب
smoothie-berry|Berry smoothie|🥤|drink|58|1|13|0.4|1.8|10|0.1|10|glass*300|smoothie batido سموذي||Smoothie aux fruits rouges~Batido de frutos rojos~Beeren-Smoothie~سموذي التوت
orange-juice|Orange juice|🧃|drink|45|0.7|10|0.2|0.2|8.4|0|1|glass*250|jus dorange zumo naranja عصير برتقال||Jus d'orange~Zumo de naranja~Orangensaft~عصير برتقال
apple-juice|Apple juice|🧃|drink|46|0.1|11|0.1|0.2|9.6|0|4|glass*250|jus de pomme zumo de manzana||Jus de pomme~Zumo de manzana~Apfelsaft~عصير تفاح
cola|Cola|🥤|drink|42|0|11|0|0|11|0|4|can*330|coca cola كولا||Cola~Cola~Cola~كولا
cola-zero|Cola, sugar-free|🥤|drink|0.3|0|0|0|0|0|0|7|can*330|coca zero light||Cola sans sucre~Cola sin azúcar~Cola zuckerfrei~كولا بدون سكر
beer|Beer, lager|🍺|drink|43|0.5|3.6|0|0|0.1|0|4|pint*568;can*330|biere cerveza bier||Bière blonde~Cerveza rubia~Lagerbier~جعة
wine-red|Red wine|🍷|drink|85|0.1|2.6|0|0|0.6|0|4|glass*150|vin rouge vino tinto rotwein||Vin rouge~Vino tinto~Rotwein~نبيذ أحمر
coffee-black|Coffee, black|☕|drink|2|0.1|0|0|0|0|0|2|cup*240|cafe kaffee قهوة||Café noir~Café solo~Schwarzer Kaffee~قهوة سوداء
coffee-latte|Latte with whole milk|☕|drink|55|3|4.4|3|0|4.4|1.8|40|cup*350|latte cafe au lait قهوة بالحليب||Latte au lait entier~Café con leche entera~Latte mit Vollmilch~لاتيه بالحليب
cappuccino|Cappuccino|☕|drink|39|2.2|3.1|2.1|0|3.1|1.3|30|cup*180|cappuccino كابتشينو||Cappuccino~Capuchino~Cappuccino~كابتشينو
tea|Tea, plain|🍵|drink|1|0|0.2|0|0|0|0|1|cup*240|the te tee شاي||Thé nature~Té solo~Tee, pur~شاي سادة
mint-tea|Mint tea with sugar|🍵|drink|31|0|8|0|0|8|0|2|glass*150|the a la menthe شاي بالنعناع||Thé à la menthe sucré~Té con menta y azúcar~Minztee mit Zucker~شاي بالنعناع
energy-drink|Energy drink|⚡|drink|45|0.4|11|0|0|11|0|100|can*250|boisson energisante||Boisson énergisante~Bebida energética~Energydrink~مشروب طاقة
water|Water|💧|drink|0|0|0|0|0|0|0|0|glass*250|eau agua wasser ماء||Eau~Agua~Wasser~ماء
ketchup|Ketchup|🍅|condiment|101|1.2|24|0.1|0.3|21|0|907|tbsp*17|ketchup كاتشب||Ketchup~Kétchup~Ketchup~كاتشب
mayonnaise|Mayonnaise|🥄|condiment|680|1|0.6|75|0|0.6|11|635|tbsp*14|mayonnaise mayonesa مايونيز||Mayonnaise~Mayonesa~Mayonnaise~مايونيز
mustard|Mustard|🥄|condiment|66|4|5|3.3|3.3|1|0.2|1135|tsp*5|moutarde mostaza senf خردل||Moutarde~Mostaza~Senf~خردل
soy-sauce|Soy sauce|🥄|condiment|53|8|4.9|0.6|0.8|0.4|0|5493|tbsp*16|sauce soja salsa de soja صويا||Sauce soja~Salsa de soja~Sojasauce~صلصة الصويا
tahini|Tahini|🥄|condiment|595|17|21|54|9.3|0.5|7.4|115|tbsp*15|tahini طحينة||Tahini~Tahini~Tahini~طحينة
harissa|Harissa|🌶️|condiment|70|3|10|2.5|4|3|0.4|1300|tsp*6|harissa هريسة||Harissa~Harissa~Harissa~هريسة
olive-green|Olives, green|🫒|fat|145|1|3.8|15|3.3|0.5|2|1556|olive*4|olives aceitunas oliven زيتون||Olives vertes~Aceitunas verdes~Grüne Oliven~زيتون أخضر
hazelnuts|Hazelnuts|🌰|nuts|628|15|17|61|9.7|4.3|4.5|0|handful*28|noisettes avellanas haselnusse بندق||Noisettes~Avellanas~Haselnüsse~بندق
brazil-nuts|Brazil nuts|🌰|nuts|659|14|12|67|7.5|2.3|15|3|handful*28|noix du bresil||Noix du Brésil~Nueces de Brasil~Paranüsse~جوز برازيلي
rice-cake|Rice cake|🍘|snack|387|8.2|82|2.8|4.2|0.4|0.6|30|cake*9|galette de riz tortita de arroz||Galette de riz~Tortita de arroz~Reiswaffel~رقائق الأرز
protein-yogurt|High-protein yoghurt|🥣|dairy|60|10|4|0.2|0|3.8|0.1|45|pot*160|yaourt proteine||Yaourt riche en protéines~Yogur alto en proteínas~Proteinjoghurt~زبادي عالي البروتين
mackerel|Mackerel, cooked|🐟|protein|262|24|0|18|0|0|4.2|83|fillet*110|maquereau caballa ماكريل||Maquereau cuit~Caballa cocida~Makrele, gegart~ماكريل مطبوخ
liver|Beef liver, cooked|🥩|protein|191|29|5.1|5.3|0|0|1.9|80|100 g*100|foie higado leber كبد||Foie de bœuf cuit~Hígado de ternera~Rinderleber, gegart~كبد بقري
duck-breast|Duck breast, cooked|🦆|protein|201|24|0|11|0|0|3.7|76|breast*180|magret de canard||Magret de canard~Pechuga de pato~Entenbrust~صدر بط
sausage|Pork sausage, cooked|🌭|protein|301|18|2|24|0|1|9|850|sausage*60|saucisse salchicha wurst نقانق||Saucisse de porc cuite~Salchicha de cerdo~Schweinswurst~نقانق
ham|Ham, sliced|🍖|protein|145|21|1.5|5.5|0|1|1.8|1200|slice*28|jambon jamon schinken||Jambon en tranches~Jamón en lonchas~Schinken, Scheiben~شرائح لحم مقدد
cereal-corn|Cornflakes|🥣|carb|357|7|84|0.4|3|8|0.1|729|bowl*30|cereales cereales cornflakes||Corn flakes~Copos de maíz~Cornflakes~رقائق الذرة
muesli|Muesli|🥣|carb|362|9.7|66|5.9|7.6|16|1|140|bowl*45|muesli||Muesli~Muesli~Müsli~موسلي
bagel|Bagel, plain|🥯|carb|250|10|48|1.5|2.1|5|0.3|444|bagel*98|bagel||Bagel nature~Bagel natural~Bagel~بيغل
pancake|Pancakes|🥞|carb|227|6.4|28|9.7|0.9|6|2|439|pancake*38|crepes tortitas pfannkuchen||Pancakes~Tortitas~Pfannkuchen~بان كيك
waffle|Waffle|🧇|carb|291|7.9|33|14|1.6|5.7|2.9|511|waffle*75|gaufre||Gaufre~Gofre~Waffel~وافل
cream-double|Double cream|🥛|dairy|449|1.7|2.7|48|0|2.7|30|27|tbsp*15|creme fraiche nata sahne كريمة||Crème épaisse~Nata para montar~Schlagsahne~كريمة ثقيلة
oat-milk|Oat milk|🥛|dairy|46|0.3|7.1|1.5|0.8|4.1|0.2|55|glass*250|lait davoine leche de avena حليب شوفان||Lait d'avoine~Bebida de avena~Hafermilch~حليب الشوفان
almond-milk|Almond milk, unsweetened|🥛|dairy|13|0.4|0.3|1.1|0.3|0.1|0.1|64|glass*250|lait damande leche de almendras حليب لوز||Lait d'amande non sucré~Bebida de almendras sin azúcar~Mandelmilch, ungesüßt~حليب اللوز
soy-milk|Soy milk|🥛|dairy|43|3.3|2.6|1.8|0.5|1|0.2|51|glass*250|lait de soja leche de soja حليب صويا||Lait de soja~Bebida de soja~Sojamilch~حليب الصويا
creatine|Creatine monohydrate|💊|supp|0|0|0|0|0|0|0|0|scoop*5|creatine كرياتين||Créatine monohydrate~Creatina monohidrato~Kreatin-Monohydrat~كرياتين

/* ── Morocco: dishes, staples and the brands on the shelf ───────── */
ma-khobz|Khobz, Moroccan round bread|🫓|carb|266|8.5|53|1.5|2.6|1.2|0.3|490|loaf*80;quarter*20|khobz pain marocain pan marroqui fladenbrot خبز مغربي كسرة||Khobz, pain marocain~Khobz, pan marroquí~Khobz, marokkanisches Brot~خبز مغربي
ma-msemen|Msemen|🫓|carb|336|6.5|45|14|1.8|0.8|4.5|380|piece*70|msemen rghaif crepe feuilletee مسمن رغايف||Msemen~Msemen~Msemen~مسمن
ma-baghrir|Baghrir, thousand-hole pancake|🥞|carb|206|5.4|39|2.6|1.5|1.4|0.5|300|piece*55|baghrir crepe mille trous بغرير||Baghrir, crêpe mille trous~Baghrir, crepe de mil agujeros~Baghrir~بغرير
ma-harcha|Harcha, semolina griddle bread|🫓|carb|354|6.2|48|15|1.9|3|8.5|350|piece*65|harcha semoule griess حرشة||Harcha à la semoule~Harcha de sémola~Harcha~حرشة
ma-batbout|Batbout, steamed flatbread|🫓|carb|258|8|52|1.2|2.4|1|0.2|420|piece*60|batbout mkhamer pain vapeur بطبوط مخمر||Batbout, pain vapeur~Batbout, pan al vapor~Batbout~بطبوط
ma-sfenj|Sfenj, Moroccan doughnut|🍩|snack|372|6|45|18|1.7|3.5|3|210|piece*70|sfenj beignet marocain buñuelo سفنج||Sfenj, beignet marocain~Sfenj, buñuelo marroquí~Sfenj~سفنج
ma-tagine-lamb|Lamb tagine with prunes|🍲|meal|178|13|12|9|1.6|9|3.4|380|plate*350|tajine agneau pruneaux lamm طاجين لحم بالبرقوق||Tajine d'agneau aux pruneaux~Tayín de cordero con ciruelas~Lamm-Tajine mit Pflaumen~طاجين لحم بالبرقوق
ma-tagine-kefta|Kefta tagine with egg|🍲|meal|165|13|4|11|0.9|2.2|4.2|450|plate*300|tajine kefta oeuf طاجين كفتة||Tajine kefta aux œufs~Tayín de kefta con huevo~Kefta-Tajine mit Ei~طاجين كفتة بالبيض
ma-harira|Harira soup|🍜|meal|71|3.6|10|1.9|1.7|1.4|0.5|380|bowl*300|harira soupe marocaine sopa حريرة||Harira~Harira~Harira~حريرة
ma-bissara|Bissara, fava bean soup|🍜|meal|103|6.1|14|2.4|4.6|0.9|0.4|310|bowl*280|bissara feves habas بيصارة||Bissara aux fèves~Bissara de habas~Bissara~بيصارة
ma-rfissa|Rfissa with fenugreek|🍲|meal|186|11|21|6.8|1.9|1.4|1.9|400|plate*350|rfissa trid رفيسة||Rfissa au fenugrec~Rfissa con fenogreco~Rfissa~رفيسة
ma-pastilla|Pastilla, chicken|🥧|meal|287|13|26|14|1.5|6.4|4.1|400|slice*150|pastilla bastilla بسطيلة||Pastilla au poulet~Pastela de pollo~Pastilla mit Hähnchen~بسطيلة بالدجاج
ma-tanjia|Tanjia, Marrakech lamb|🍲|meal|221|18|1.8|16|0.3|0.7|6.8|430|plate*250|tanjia marrakech طنجية||Tanjia marrakchie~Tanjia de Marrakech~Tanjia~طنجية مراكشية
ma-mechoui|Mechoui, roast lamb|🍖|protein|263|26|0|17|0|0|7.4|290|100 g*100|mechoui agneau roti cordero مشوي||Méchoui d'agneau~Mechoui de cordero~Mechoui~مشوي
ma-kefta|Kefta, minced meat skewer|🍢|protein|241|19|1.2|18|0.2|0.5|7.1|430|skewer*80|kefta brochette pincho كفتة||Brochette de kefta~Pincho de kefta~Kefta-Spieß~كفتة مشوية
ma-merguez|Merguez sausage|🌭|protein|312|17|1.5|27|0.2|0.6|10|880|sausage*60|merguez salchicha مرقاز||Merguez~Merguez~Merguez~مرقاز
ma-khlii|Khlii, preserved beef|🥩|protein|398|29|0.5|31|0|0|13|1100|30 g*30|khlii viande confite خليع||Khlii, viande confite~Khlii, carne confitada~Khlii~خليع
ma-zaalouk|Zaalouk, aubergine salad|🍆|veg|94|1.4|6.8|6.9|3.1|3.6|1|340|portion*120|zaalouk caviar daubergine berenjena زعلوك||Zaalouk d'aubergines~Zaalouk de berenjena~Zaalouk~زعلوك
ma-taktouka|Taktouka, pepper and tomato salad|🫑|veg|78|1.3|6.2|5.4|2.2|4.1|0.8|320|portion*120|taktouka poivrons pimientos تكتوكة||Taktouka poivrons-tomates~Taktouka de pimientos~Taktouka~تكتوكة
ma-briouat-meat|Briouat, meat|🥟|snack|312|12|24|19|1.3|1.6|5.4|470|piece*35|briouate viande بريوات باللحم||Briouate à la viande~Briouat de carne~Briouat mit Fleisch~بريوات باللحم
ma-briouat-almond|Briouat, almond and honey|🥟|snack|418|8.1|43|24|3.4|24|3.6|120|piece*30|briouate amande almendra بريوات باللوز||Briouate amande-miel~Briouat de almendra y miel~Briouat mit Mandel~بريوات باللوز
ma-chebakia|Chebakia|🍪|snack|452|6.4|54|24|3.2|33|3.4|110|piece*25|chebakia sesame شباكية||Chebakia~Chebakia~Chebakia~شباكية
ma-sellou|Sellou (sfouf)|🥣|snack|528|11|46|33|5.8|21|4.1|60|tbsp*20|sellou sfouf zmita سلو سفوف زميتة||Sellou (sfouf)~Sellou (sfouf)~Sellou~سلو
ma-ghriba|Ghriba, almond cookie|🍪|snack|449|8.6|48|25|3.1|28|4.2|95|cookie*25|ghriba biscuit galleta غريبة||Ghriba aux amandes~Ghriba de almendra~Ghriba~غريبة
ma-kaab-ghzal|Kaab el ghzal, gazelle horns|🥐|snack|412|7.4|52|19|2.9|29|2.4|85|piece*28|cornes de gazelle cuernos كعب غزال||Cornes de gazelle~Cuernos de gacela~Gazellenhörner~كعب غزال
ma-seffa|Seffa medfouna|🍚|meal|241|5.8|38|7.6|1.8|12|1.6|95|plate*250|seffa vermicelles سفة مدفونة||Seffa medfouna~Seffa medfouna~Seffa~سفة مدفونة
ma-loubia|Loubia, white bean stew|🍲|meal|108|6.2|15|2.6|5.1|1.1|0.5|330|bowl*280|loubia haricots blancs alubias لوبيا||Loubia aux haricots blancs~Loubia de alubias~Loubia~لوبيا
ma-hout-mqli|Fried fish, Moroccan style|🐟|meal|213|21|8.4|11|0.4|0.3|1.9|370|portion*150|hout mqli poisson frit pescado حوت مقلي||Poisson frit à la marocaine~Pescado frito marroquí~Frittierter Fisch~حوت مقلي
ma-amlou|Amlou, argan almond spread|🥜|fat|603|14|22|52|6.2|16|5.6|18|tbsp*18|amlou argan أملو||Amlou à l'argan~Amlou de argán~Amlou~أملو
ma-argan-oil|Argan oil|🫒|fat|884|0|0|100|0|0|17|0|tbsp*13.5|huile dargan aceite de argan arganol زيت أركان||Huile d'argan~Aceite de argán~Arganöl~زيت أركان
ma-smen|Smen, preserved butter|🧈|fat|726|0.6|0.1|82|0|0.1|52|780|tsp*5|smen beurre rance سمن||Smen, beurre rance~Smen, mantequilla rancia~Smen~سمن
ma-jben|Jben, fresh white cheese|🧀|dairy|168|13|3.2|11|0|3.1|7|420|portion*50|jben fromage frais queso fresco جبن بلدي||Jben, fromage frais~Jben, queso fresco~Jben~جبن بلدي
ma-lben|Lben, buttermilk|🥛|dairy|40|3.3|4.7|0.9|0|4.7|0.6|52|glass*250|lben babeurre suero لبن||Lben, babeurre~Lben, suero de leche~Lben~لبن
ma-olives-black|Beldi black olives|🫒|condiment|207|1.5|5.5|21|4.5|0|2.8|1420|10 olives*35|olives noires beldi زيتون أسود بلدي||Olives noires beldi~Aceitunas negras beldi~Schwarze Beldi-Oliven~زيتون أسود بلدي
ma-preserved-lemon|Preserved lemon|🍋|condiment|29|0.6|9.3|0.3|4.7|1.5|0|3200|quarter*15|citron confit limon ليمون مصير حامض مرقد||Citron confit~Limón en conserva~Salzzitrone~ليمون مصير
ma-ras-hanout|Ras el hanout|🥄|condiment|322|11|53|10|28|3.5|1.4|60|tsp*2|ras el hanout epices especias راس الحانوت||Ras el hanout~Ras el hanout~Ras el Hanout~راس الحانوت
ma-nous-nous|Nous-nous coffee|☕|drink|46|2.2|4.4|2.2|0|4.4|1.4|38|glass*120|nous nous cafe casse نص نص قهوة||Nous-nous~Nous-nous~Nous-Nous~نص نص
ma-avocado-juice|Avocado smoothie|🥑|drink|118|2.6|13|6.5|1.9|11|1.5|32|glass*250|jus davocat zumo de aguacate عصير أفوكادو||Jus d'avocat~Zumo de aguacate~Avocado-Smoothie~عصير أفوكادو
ma-cactus-fruit|Prickly pear|🌵|fruit|41|0.7|9.6|0.5|3.6|5.4|0.1|5|fruit*103|figue de barbarie higo chumbo كرموس هندي||Figue de barbarie~Higo chumbo~Kaktusfeige~كرموس هندي
ma-jaouda-raibi|Raibi Jamila, Jaouda|🥤|dairy|89|2.8|15|2.4|0|14|1.6|48|bottle*180|raibi jamila jaouda grenadine رايبي جميلة جودة||Raïbi Jamila, Jaouda~Raibi Jamila, Jaouda~Raibi Jamila, Jaouda~رايبي جميلة
ma-jaouda-yaourt|Yoghurt, Jaouda|🥣|dairy|94|3.1|14|2.9|0|13|1.9|52|pot*110|jaouda yaourt yogur جودة||Yaourt Jaouda~Yogur Jaouda~Jaouda Joghurt~زبادي جودة
ma-centrale-milk|Milk, Centrale Danone|🥛|dairy|62|3.2|4.7|3.4|0|4.7|2.2|45|glass*250;brick*1000|centrale danone lait leche سنطرال حليب||Lait Centrale Danone~Leche Centrale Danone~Centrale Danone Milch~حليب سنطرال
ma-assiri|Assiri drinking yoghurt, Centrale|🥤|dairy|82|2.6|14|1.8|0.2|13|1.2|46|bottle*180|assiri centrale عصيري||Assiri, Centrale~Assiri, Centrale~Assiri, Centrale~عصيري سنطرال
ma-jibal-cheese|Jibal processed cheese|🧀|dairy|258|11|6.5|21|0|4.5|14|1150|portion*17|jibal fromage fondu queso جبال||Fromage fondu Jibal~Queso fundido Jibal~Jibal Schmelzkäse~جبن جبال
ma-copag-lben|Lben, Copag Jibal|🥛|dairy|41|3.4|4.6|1|0|4.6|0.7|55|glass*250|copag jibal lben كوباك لبن||Lben Copag Jibal~Lben Copag Jibal~Copag Jibal Lben~لبن كوباك
ma-chergui-yaourt|Yoghurt, Domaine Chergui|🥣|dairy|97|3.4|13|3.4|0|12|2.2|50|pot*110|chergui domaine الشرقي||Yaourt Domaine Chergui~Yogur Domaine Chergui~Domaine Chergui Joghurt~زبادي الشرقي
ma-bimo-golden|Golden, Bimo|🍪|snack|486|6.1|63|23|2.4|28|11|280|pack*32|bimo golden biscuit بيمو غولدن||Golden, Bimo~Golden, Bimo~Golden, Bimo~غولدن بيمو
ma-bimo-tagger|Tagger, Bimo|🍫|snack|502|6.8|58|26|2.1|33|13|230|bar*30|tagger bimo تاغر||Tagger, Bimo~Tagger, Bimo~Tagger, Bimo~تاغر بيمو
ma-merendina|Merendina|🧁|snack|429|5.9|54|21|1.5|31|10|260|piece*30|merendina gateau ميرينضينا||Merendina~Merendina~Merendina~ميرينضينا
ma-henrys|Henry's biscuits|🍪|snack|472|6.5|66|20|2|26|9.5|310|pack*36|henrys biscuit galleta هنريز||Biscuits Henry's~Galletas Henry's~Henry's Kekse~بسكويت هنريز
ma-dari-couscous|Couscous, Dari (dry)|🍚|carb|368|12|72|1.5|4.5|0.6|0.3|10|serving*80|dari couspate couscous كسكس داري||Couscous Dari~Cuscús Dari~Dari Couscous~كسكس داري
ma-tria-pasta|Pasta, Tria (dry)|🍝|carb|359|12|72|1.4|3.2|2.8|0.3|8|serving*80|tria pates pasta تريا||Pâtes Tria~Pasta Tria~Tria Nudeln~معكرونة تريا
ma-aicha-tomato|Tomato concentrate, Aicha|🥫|condiment|82|4.3|16|0.5|3.3|12|0.1|420|tbsp*16|aicha concentre tomate tomate عائشة||Concentré de tomate Aïcha~Concentrado de tomate Aïcha~Aïcha Tomatenmark~معجون طماطم عائشة
ma-aicha-jam|Apricot jam, Aicha|🍑|snack|258|0.4|63|0.1|0.9|61|0|22|tbsp*20|aicha confiture mermelada مربى عائشة||Confiture d'abricot Aïcha~Mermelada de albaricoque Aïcha~Aïcha Aprikosenmarmelade~مربى المشمش عائشة
ma-lesieur-oil|Sunflower oil, Lesieur Cristal|🌻|fat|900|0|0|100|0|0|11|0|tbsp*13.5|lesieur cristal huile tournesol زيت لوسيور||Huile de tournesol Lesieur Cristal~Aceite de girasol Lesieur~Lesieur Sonnenblumenöl~زيت لوسيور
ma-sidi-ali|Sidi Ali water|💧|drink|0|0|0|0|0|0|0|0.5|bottle*500|sidi ali eau agua سيدي علي||Eau Sidi Ali~Agua Sidi Ali~Sidi Ali Wasser~ماء سيدي علي
ma-oulmes|Oulmes sparkling water|💧|drink|0|0|0|0|0|0|0|1.1|bottle*500|oulmes eau gazeuse con gas أولماس||Eau gazeuse Oulmès~Agua con gas Oulmès~Oulmès Sprudelwasser~ماء أولماس الغازي
ma-hawai|Hawai tropical soda|🥤|drink|48|0|12|0|0|12|0|9|can*330|hawai soda refresco هاواي||Hawaï~Hawai~Hawai~هاواي
ma-poms|Poms apple soda|🍎|drink|44|0|11|0|0|11|0|8|can*330|poms pomme manzana بومس||Poms~Poms~Poms~بومس

/* ── Morocco: the brands actually on the shelf ──────────────────── */
ma-perly-nature|Perly yoghurt, natural|🥣|dairy|92|3.3|13|2.9|0|12|1.9|50|pot*110|perly centrale yaourt nature||Perly yaourt nature~Perly yogur natural~Perly Naturjoghurt~بيرلي زبادي طبيعي
ma-perly-fruit|Perly yoghurt, fruit|🍓|dairy|97|2.9|16|2.6|0.3|15|1.7|48|pot*110|perly fruits fraise||Perly yaourt aux fruits~Perly yogur de frutas~Perly Fruchtjoghurt~بيرلي زبادي بالفواكه
ma-perly-brasse|Perly brasse|🥣|dairy|104|3|17|2.8|0|16|1.8|50|pot*125|perly brasse||Perly brassé~Perly batido~Perly gerührt~بيرلي مخفوق
ma-chergui-protein|Chergui protein drink|💪|dairy|68|8.5|6.2|1.2|0|5.8|0.8|60|bottle*250|chergui proteine drink musculation||Chergui boisson protéinée~Chergui bebida proteica~Chergui Proteindrink~الشرقي مشروب بروتيني
ma-chergui-lben|Chergui lben|🥛|dairy|42|3.4|4.8|1|0|4.8|0.7|54|glass*250|chergui lben babeurre||Chergui lben~Chergui suero~Chergui Buttermilch~الشرقي لبن
ma-chergui-jben|Chergui fresh cheese|🧀|dairy|172|13|3|12|0|3|7.4|410|portion*50|chergui jben fromage frais||Chergui fromage frais~Chergui queso fresco~Chergui Frischkäse~الشرقي جبن طري
ma-chergui-raib|Chergui raib|🥤|dairy|86|2.9|14|2.2|0|13|1.5|46|bottle*180|chergui raib raibi||Chergui raïb~Chergui raib~Chergui Raib~الشرقي رايب
ma-jaouda-lait|Jaouda milk, semi-skimmed|🥛|dairy|47|3.2|4.7|1.6|0|4.7|1|45|glass*250|jaouda lait demi ecreme||Jaouda lait demi-écrémé~Jaouda leche semidesnatada~Jaouda fettarme Milch~جودة حليب نصف دسم
ma-jaouda-danone|Jaouda drinking yoghurt|🥤|dairy|79|2.7|13|1.9|0|12|1.3|47|bottle*180|jaouda yaourt a boire||Jaouda yaourt à boire~Jaouda yogur bebible~Jaouda Trinkjoghurt~جودة زبادي للشرب
ma-yawmi-yaourt|Yawmi yoghurt|🥣|dairy|95|3.2|14|2.8|0|13|1.8|51|pot*110|yawmi yaourt danone||Yawmi yaourt~Yawmi yogur~Yawmi Joghurt~يومي زبادي
ma-activia-nature|Activia natural|🥣|dairy|72|4.2|5.3|3.4|0|5.1|2.2|55|pot*125|activia danone bifidus||Activia nature~Activia natural~Activia Natur~أكتيفيا طبيعي
ma-danone-dany|Dany chocolate dessert|🍫|dairy|142|3.6|20|5.2|0.6|18|3.3|68|pot*100|dany danone creme chocolat||Dany crème au chocolat~Dany crema de chocolate~Dany Schokocreme~داني حلوى الشوكولاتة
ma-moufid-lait|Moufid milk powder|🥛|dairy|496|25|38|26|0|38|17|380|scoop*26|moufid lait en poudre||Moufid lait en poudre~Moufid leche en polvo~Moufid Milchpulver~مفيد حليب مجفف
ma-zott-monte|Zott Monte dessert|🍫|dairy|229|4.4|24|13|0.5|22|8.6|75|pot*55|zott monte chocolat noisette||Zott Monte~Zott Monte~Zott Monte~زوت مونتي
ma-zott-jogobella|Zott Jogobella|🍓|dairy|93|2.9|14|2.7|0.4|13|1.8|48|pot*150|zott jogobella yaourt fruits||Zott Jogobella~Zott Jogobella~Zott Jogobella~زوت جوقوبيلا
ma-zott-zottarella|Zott Zottarella mozzarella|🧀|dairy|248|18|1.5|19|0|1.5|13|420|ball*125|zott zottarella mozzarella||Zott Zottarella~Zott Zottarella~Zott Zottarella~زوت زوتاريلا
ma-president-butter|President butter|🧈|fat|733|0.7|0.6|81|0|0.6|54|12|pat*10|president beurre||Beurre Président~Mantequilla Président~Président Butter~زبدة برزيدون
ma-lavache-quirit|La vache qui rit|🧀|dairy|265|10|7|22|0|6.5|14|1100|portion*17|vache qui rit fromage fondu||La vache qui rit~La vaca que ríe~Die lachende Kuh~البقرة الضاحكة
ma-kiri|Kiri cream cheese|🧀|dairy|321|7.3|4.2|30|0|4.2|20|780|portion*18|kiri fromage||Kiri~Kiri~Kiri~كيري
ma-jibal-lait|Jibal UHT milk|🥛|dairy|61|3.1|4.6|3.3|0|4.6|2.1|44|glass*250|jibal copag lait||Jibal lait UHT~Jibal leche UHT~Jibal H-Milch~جبال حليب
ma-jibal-raib|Jibal raib|🥤|dairy|88|2.8|14|2.3|0|13|1.6|47|bottle*180|jibal raib copag||Jibal raïb~Jibal raib~Jibal Raib~جبال رايب
ma-bimo-chocotine|Chocotine, Bimo|🍫|snack|478|6.4|62|22|2.2|31|11|250|pack*30|bimo chocotine||Chocotine Bimo~Chocotine Bimo~Chocotine Bimo~شوكوتين بيمو
ma-bimo-tonik|Tonik, Bimo|🍪|snack|455|7.1|68|17|2.6|24|7.8|330|pack*40|bimo tonik biscuit||Tonik Bimo~Tonik Bimo~Tonik Bimo~تونيك بيمو
ma-bimo-craquant|Craquant, Bimo|🍪|snack|492|6.8|60|25|2.3|26|12|290|pack*33|bimo craquant||Craquant Bimo~Craquant Bimo~Craquant Bimo~كراكان بيمو
ma-excelo|Excelo wafer|🍫|snack|515|5.4|59|28|1.8|34|15|180|bar*30|excelo gaufrette||Excelo gaufrette~Excelo barquillo~Excelo Waffel~إكسيلو
ma-galette-luxe|Galette Luxe biscuit|🍪|snack|468|6.9|69|18|2.4|21|8.4|360|pack*38|galette luxe biscuit||Galette Luxe~Galleta Luxe~Luxe Keks~غاليت لوكس
ma-aicha-harissa|Harissa, Aicha|🌶️|condiment|96|3|9.5|5|4.2|3.8|0.7|1700|tsp*6|aicha harissa piment||Harissa Aïcha~Harissa Aïcha~Aïcha Harissa~هريسة عائشة
ma-aicha-olives|Olives, Aicha|🫒|condiment|152|1.1|4|16|3.4|0.5|2.2|1490|10 olives*40|aicha olives conserve||Olives Aïcha~Aceitunas Aïcha~Aïcha Oliven~زيتون عائشة
ma-aicha-thon|Tuna in oil, Aicha|🐟|protein|198|24|0|11|0|0|1.9|380|can*100|aicha thon huile||Thon à l'huile Aïcha~Atún en aceite Aïcha~Aïcha Thunfisch~تونة عائشة
ma-huilor|Huilor sunflower oil|🌻|fat|900|0|0|100|0|0|11|0|tbsp*13.5|huilor huile tournesol||Huile Huilor~Aceite Huilor~Huilor Öl~زيت هويلور
ma-alboustane|Al Boustane olive oil|🫒|fat|884|0|0|100|0|0|14|1|tbsp*13.5|al boustane huile olive||Huile d'olive Al Boustane~Aceite de oliva Al Boustane~Al Boustane Olivenöl~زيت زيتون البستان
ma-mabrouka|Mabrouka olive oil|🫒|fat|884|0|0|100|0|0|14|1|tbsp*13.5|mabrouka huile olive||Huile d'olive Mabrouka~Aceite Mabrouka~Mabrouka Olivenöl~زيت مبروكة
ma-sidi-harazem|Sidi Harazem water|💧|drink|0|0|0|0|0|0|0|0.4|bottle*500|sidi harazem eau||Eau Sidi Harazem~Agua Sidi Harazem~Sidi Harazem Wasser~ماء سيدي حرازم
ma-ain-saiss|Ain Saiss water|💧|drink|0|0|0|0|0|0|0|0.3|bottle*500|ain saiss eau||Eau Aïn Saïss~Agua Aïn Saïss~Aïn Saïss Wasser~ماء عين السايس
ma-ciel|Ciel water|💧|drink|0|0|0|0|0|0|0|0.3|bottle*500|ciel eau||Eau Ciel~Agua Ciel~Ciel Wasser~ماء سييل
ma-marrakech-orange|Marrakech orange drink|🍊|drink|46|0.2|11|0|0.1|11|0|8|brick*200|marrakech jus orange||Marrakech jus d'orange~Marrakech zumo de naranja~Marrakech Orangensaft~مراكش عصير برتقال
ma-valencia|Valencia juice|🧃|drink|48|0.3|11|0.1|0.2|11|0|9|brick*200|valencia jus||Jus Valencia~Zumo Valencia~Valencia Saft~عصير فالنسيا
ma-tropicola|Tropicola|🥤|drink|43|0|11|0|0|11|0|7|can*330|tropicola soda||Tropicola~Tropicola~Tropicola~تروبيكولا
ma-schweppes-citron|Schweppes lemon|🍋|drink|38|0|9.3|0|0|9.3|0|12|can*330|schweppes citron||Schweppes citron~Schweppes limón~Schweppes Zitrone~شويبس ليمون
ma-nescafe|Nescafe instant coffee|☕|drink|4|0.4|0.5|0|0|0|0|2|cup*2|nescafe cafe soluble||Nescafé~Nescafé~Nescafé~نسكافيه
ma-ovomaltine|Ovomaltine drink powder|🍫|drink|380|8.5|76|3.5|4.5|60|1.9|180|scoop*20|ovomaltine chocolat poudre||Ovomaltine~Ovomaltine~Ovomaltine~أوفومالتين
ma-nutella|Nutella spread|🍫|snack|539|6.3|57|31|3.4|56|11|41|tbsp*15|nutella pate a tartiner||Nutella~Nutella~Nutella~نوتيلا
ma-halwa-chamia|Halwa chamia (halva)|🍬|snack|516|12|45|33|4.8|38|5.9|195|slice*30|halwa chamia halva tahini||Halva chamia~Halva chamía~Chamia Halva~حلوة شامية
ma-zamita|Zamita (barley flour blend)|🥣|snack|441|11|58|18|8.2|9|2.6|55|tbsp*20|zamita zmita tazemmit||Zamita~Zamita~Zamita~زميتة
ma-tanjaoui|Tanjaoui msemen roll|🫓|carb|348|7|46|15|2|1.2|4.8|390|piece*75|tanjaoui msemen||Msemen tanjaoui~Msemen tanjaoui~Tanjaoui Msemen~مسمن طنجاوي
ma-krachel|Krachel (anise brioche)|🥐|carb|352|8.4|54|11|2.1|14|3.2|280|piece*60|krachel brioche anis||Krachel~Krachel~Krachel~كراشل
ma-meloui|Meloui|🫓|carb|341|6.7|46|14|1.9|1|4.4|370|piece*70|meloui rghaif||Meloui~Meloui~Meloui~ملوي
ma-rghayef-honey|Rghaif with honey and butter|🍯|snack|412|6.1|52|20|1.7|18|8.2|300|piece*80|rghaif miel beurre||Rghaïf au miel~Rghaif con miel~Rghaif mit Honig~رغايف بالعسل
ma-harcha-jben|Harcha with jben|🫓|snack|362|8.9|43|17|1.7|3.4|8.9|420|piece*80|harcha jben fromage||Harcha au jben~Harcha con queso~Harcha mit Jben~حرشة بالجبن
ma-bocadillo|Bocadillo sandwich|🥪|meal|228|9.4|26|9.6|1.8|2.4|2.6|520|piece*220|bocadillo sandwich||Bocadillo~Bocadillo~Bocadillo~بوكاديو
ma-tacos-marocain|Moroccan tacos|🌯|meal|262|12|27|12|2.1|3.2|4.1|610|piece*400|tacos marocain||Tacos marocain~Tacos marroquí~Marokkanischer Tacos~طاكوس مغربي
ma-batbout-farci|Stuffed batbout|🥪|meal|241|11|31|8.4|2.3|2.6|3.1|540|piece*160|batbout farci sandwich||Batbout farci~Batbout relleno~Gefülltes Batbout~بطبوط معمر
ma-maakouda|Maakouda (potato fritter)|🥔|snack|218|4.1|26|11|2.4|1.2|1.7|420|piece*45|maakouda beignet pomme de terre||Maâkouda~Maakouda~Maakouda~معقودة
ma-harira-ramadan|Harira with dates and chebakia|🍜|meal|168|5.2|24|5.8|2.6|11|1.3|350|serving*380|harira ramadan chebakia dattes||Harira de Ramadan~Harira de Ramadán~Ramadan-Harira~حريرة رمضان
ma-bissara-oil|Bissara with olive oil|🍜|meal|139|6.4|15|6.1|4.4|1|0.9|330|bowl*280|bissara huile olive||Bissara à l'huile d'olive~Bissara con aceite~Bissara mit Olivenöl~بيصارة بزيت الزيتون
ma-tajine-poulet-citron|Chicken tagine with preserved lemon|🍲|meal|141|14|4.8|7.2|1.1|1.5|1.6|470|plate*350|tajine poulet citron confit||Tajine poulet citron confit~Tayín de pollo con limón~Hähnchen-Tajine mit Salzzitrone~طاجين دجاج بالحامض المصير
ma-tajine-poisson|Fish tagine chermoula|🐟|meal|127|15|5.4|4.9|1.3|2.1|0.9|430|plate*350|tajine poisson chermoula||Tajine de poisson chermoula~Tayín de pescado~Fisch-Tajine~طاجين الحوت بالشرمولة
ma-couscous-tfaya|Couscous tfaya|🍲|meal|172|6.1|27|4.6|2.5|9.2|1.2|300|plate*400|couscous tfaya oignons raisins||Couscous tfaya~Cuscús tfaya~Couscous Tfaya~كسكس بالتفاية
ma-msemen-amlou|Msemen with amlou|🫓|snack|448|9.2|44|26|3.4|10|5.4|300|piece*90|msemen amlou argan||Msemen à l'amlou~Msemen con amlou~Msemen mit Amlou~مسمن بأملو
ma-atay-naanaa|Mint tea, no sugar|🍵|drink|1|0|0.2|0|0|0|0|3|glass*150|atay the menthe sans sucre||Thé à la menthe sans sucre~Té con menta sin azúcar~Minztee ohne Zucker~أتاي بلا سكر
ma-ghassoul-dates|Dates with milk|🌴|snack|154|2.4|32|1.4|3.1|29|0.6|22|serving*60|dattes lait ftour||Dattes au lait~Dátiles con leche~Datteln mit Milch~تمر بالحليب
`;
