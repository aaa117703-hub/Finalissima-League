// =========================================================
// teams.js — Finalissima League
// الـ 20 منتخب + الشعارات
// =========================================================

const teamsMap = {

    "ARG": { name: "Argentina",   flag: "🇦🇷", logo: "argentina.png"   },
    "BEL": { name: "Belgium",     flag: "🇧🇪", logo: "belgium.png"     },
    "BRA": { name: "Brazil",      flag: "🇧🇷", logo: "brazil.png"      },
    "COL": { name: "Colombia",    flag: "🇨🇴", logo: "colombia.png"    },
    "CRO": { name: "Croatia",     flag: "🇭🇷", logo: "croatia.png"     },
    "ENG": { name: "England",     flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", logo: "england.png"     },
    "GER": { name: "Germany",     flag: "🇩🇪", logo: "germany.png"     },
    "GRE": { name: "Greece",      flag: "🇬🇷", logo: "greece.png"      },
    "HUN": { name: "Hungary",     flag: "🇭🇺", logo: "hungary.png"     },
    "ITA": { name: "Italy",       flag: "🇮🇹", logo: "italy.png"       },
    "MEX": { name: "Mexico",      flag: "🇲🇽", logo: "mexico.png"      },
    "NED": { name: "Netherlands", flag: "🇳🇱", logo: "netherlands.png" },
    "NOR": { name: "Norway",      flag: "🇳🇴", logo: "norway.png"      },
    "RUS": { name: "Russia",      flag: "🇷🇺", logo: "russia.png"      },
    "SRB": { name: "Serbia",      flag: "🇷🇸", logo: "serbia.png"      },
    "ESP": { name: "Spain",       flag: "🇪🇸", logo: "spain.png"       },
    "SUI": { name: "Switzerland", flag: "🇨🇭", logo: "switzerland.png" },
    "TUR": { name: "Turkey",      flag: "🇹🇷", logo: "turkey.png"      },
    "URU": { name: "Uruguay",     flag: "🇺🇾", logo: "uruguay.png"     },
    "VEN": { name: "Venezuela",   flag: "🇻🇪", logo: "venezuela.png"   }

};

// نقاط البداية لكل منتخب (تُحدّث لاحقاً)
const initialBasePoints = {};
Object.keys(teamsMap).forEach(function(key) {
    initialBasePoints[key] = { gf: 0, pts: 0 };
});
