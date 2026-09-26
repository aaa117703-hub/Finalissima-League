// =========================================================
// players-teams.js — Finalissima League
// توزيع 187 مدير على 20 منتخب
// =========================================================

const PLAYERS_TEAMS = {

    "Argentina": [
        "Ali X Y H", "Yousef Haider", "Hashim AL-Lamy", "Ali Daheer", "عمر فاروق",
        "سـبيشل وان", "بوفازعه الحبوني", "BENO .", "Mohammed Adel", "Mohammed Regli"
    ],

    "Belgium": [
        "M0hamed Al-Asadi", "Yaseen X", "JÜRGEN -", "Cold Mohammed", "Ali Mohammed",
        "baqer sattar", "sajad alazawy", "Karar Haider", "Haider Sadeq"
    ],

    "Brazil": [
        "Mohsen Hadi", "محمد باقر ستار", "haedr thamir", "Martin RMA", "alhassan haaland",
        "FPL FAKE", "Abbas Abbas", "hamza -f", "حساب احتياطي"
    ],

    "Colombia": [
        "XABI ZAIN", "Ali Saif", "CHE -", "Durgham BEL", "Mujtaba Ali",
        "Mohammed Nader", "hassan salman", "Abdalla A.", "م. محمد الدليمي"
    ],

    "Croatia": [
        "MOHAMED ALSAADE", "Maher Qasem", "حيدر علي", "Brhm jose", "H A",
        "Apex Star", "Mohammed Nawras", "Zz O", "AHMED RIYADH"
    ],

    "England": [
        "احمد مهند", "Abbas Modhafer", "sir brhm", "krar Tarq", "Sajad Basem",
        "Ali ARS", "علي هادي", "Mohammed i", "IRAQ - ARS"
    ],

    "Germany": [
        "Mohammed Abd", "Mohammed Alaa", "The Phenomenon", "star ahmed", "Mustafa مانشستر زرقاء",
        "mostfa mostfa", "Saif Hameed", "Moamal Ahmed", "Haider Albayati"
    ],

    "Greece": [
        "Laith CR7. Ghalib", "المــو صـلاح .", "Ahmed Amer", "يُوسـف أَزهـر دّاخِـل A", "Ahmed Husham",
        "Muhamed .", "IG ali-cts2", "Sajad Abbas", "ALi Ghazi"
    ],

    "Hungary": [
        "Ahmed Akram", "Yousif Abbas", "3le 3le", "محمد الاسدي", "Youssif Mustafa",
        "Fc Mohammed", "Salah Alani", "Mohammed Ryad", "علي رضا"
    ],

    "Italy": [
        "Mohammed smko Mustafa", "Amjad Abbas", "Mohmmed Hussein", "karm karm", "MoAli Belgium",
        "Abdullah Aldoury", "-- --", "Mohammed Falah", "Mustafa Jafar"
    ],

    "Mexico": [
        "Alfaruq Maad", "SAJAD HASSAN", "Baqer Emad", "MUSTAFA WW", "Mohammed Ahmed",
        "Abdullah Al-saray", "ali hassan", "Mahmood Abbas", "Ibrahim Omar"
    ],

    "Netherlands": [
        "ali qassim", "Mokhled M", "Abbas Kareem", "komael Ali", "Abbas hani",
        "احمد محمد", "𝖬𝖺𝗁𝖽𝗂 𝖠𝗁𝗆𝖾𝖽", "Ridha Mohammed", "SAJAD Al- Moussawi"
    ],

    "Norway": [
        "Ali Akbr Wissam", "Yousef Hameed", "ahmed dawood", "Karar Ghasan", "MoAMl l",
        "Yaseen Al-Ezi", "sohaep muthana", "MOHEMN FADEL", "NO ONE BUT ME", "mohammed alshwali"
    ],

    "Russia": [
        "صوفي", "MOAMAL GOAT", "حسن طالب", "M A", "ADEL ALMADREDE",
        "YOYO GOGO", "Ahmed Radhi", "مرتضى مطشر", "Yousif Ihsan"
    ],

    "Serbia": [
        "ilias zaa", "IBRAHIM -", "ammar 7", "Al-Hassan Ali", "ahmed M",
        "حسن آل تالي", "Zhra J", "Karrar Bassem", "Rihda alkhafaji"
    ],

    "Spain": [
        "sufyan alazi", "Sama Mhmd", "Mohamed Mustafa", "ABDULLAH JALAL", "Mohamed Jasim",
        "Farah Mohammed", "ali aloka", "Moktada T", "Mo Ah"
    ],

    "Switzerland": [
        "Ōz .", "hamza Al-Azirjawi", "Sajad Ahmed", "AHMED NATTIQ", "BASHER LM10",
        "Murtaza Shaker", "Dhurgham maher", "MOSTAFA Mansour26", "Ahmed Raed"
    ],

    "Turkey": [
        "Monti Mousawi", "Ahmed .", "HASSAN LOTHBROK", "baqr Mohammed", "Fantasy King",
        "ali mohammed", "mustfa zwraa", "رحيم المياحي", "Omar Amer"
    ],

    "Uruguay": [
        "Fadi Nazar", "khalid abdullah", "hashimkhalid 5", "eng. Huthayfa", "Hussein Adil",
        "Sir Sadiq", "Sura Ammar", "Mustafa Qasm", "Haider Ali", "Hussien Tariq"
    ],

    "Venezuela": [
        "Mohammed JA", "Ahmed Ali", "Ahad Hussein", "hussein abbas10", "سجاد وليد",
        "I BAQERENO", "abdalla alzawi", "yuossef yuossef", "علي قيصر عزيز .",
        "SAGAD1 SAGAD1", "وسام الراوي", "Mustafa Salam", "Al Hassan Al mujtaba"
    ]

};

// =========================================================
// شعارات المنتخبات (سنستخدم الأعلام لاحقاً)
// =========================================================

const TEAMS_LOGOS = {
    "Argentina":   "argentina.png",
    "Belgium":     "belgium.png",
    "Brazil":      "brazil.png",
    "Colombia":    "colombia.png",
    "Croatia":     "croatia.png",
    "England":     "england.png",
    "Germany":     "germany.png",
    "Greece":      "greece.png",
    "Hungary":     "hungary.png",
    "Italy":       "italy.png",
    "Mexico":      "mexico.png",
    "Netherlands": "netherlands.png",
    "Norway":      "norway.png",
    "Russia":      "russia.png",
    "Serbia":      "serbia.png",
    "Spain":       "spain.png",
    "Switzerland": "switzerland.png",
    "Turkey":      "turkey.png",
    "Uruguay":     "uruguay.png",
    "Venezuela":   "venezuela.png"
};

// =========================================================
// دالة: عدد المديرين في كل منتخب
// =========================================================

function getManagerCount(teamName) {
    const list = PLAYERS_TEAMS[teamName];
    return list ? list.length : 0;
}

// =========================================================
// دالة: كل المديرين في مصفوفة واحدة
// =========================================================

function getAllManagersList() {
    const all = [];
    Object.keys(PLAYERS_TEAMS).forEach(function(team) {
        PLAYERS_TEAMS[team].forEach(function(manager) {
            all.push({ team: team, name: manager });
        });
    });
    return all;
}
