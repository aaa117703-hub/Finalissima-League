// =========================================================
// teams.js — Finalissima League
// الـ 20 منتخب + الشعارات
// =========================================================

const teamsMap = {

    "ARG": { name: "Argentina",   flag: "AR", logo: "argentina.png"   },
    "BEL": { name: "Belgium",     flag: "BE", logo: "belgium.png"     },
    "BRA": { name: "Brazil",      flag: "BR", logo: "brazil.png"      },
    "COL": { name: "Colombia",    flag: "CO", logo: "colombia.png"    },
    "CRO": { name: "Croatia",     flag: "HR", logo: "croatia.png"     },
    "ENG": { name: "England",     flag: "EN", logo: "england.png"     },
    "GER": { name: "Germany",     flag: "DE", logo: "germany.png"     },
    "GRE": { name: "Greece",      flag: "GR", logo: "greece.png"      },
    "HUN": { name: "Hungary",     flag: "HU", logo: "hungary.png"     },
    "ITA": { name: "Italy",       flag: "IT", logo: "italy.png"       },
    "MEX": { name: "Mexico",      flag: "MX", logo: "mexico.png"      },
    "NED": { name: "Netherlands", flag: "NL", logo: "netherlands.png" },
    "NOR": { name: "Norway",      flag: "NO", logo: "norway.png"      },
    "RUS": { name: "Russia",      flag: "RU", logo: "russia.png"      },
    "SRB": { name: "Serbia",      flag: "RS", logo: "serbia.png"      },
    "ESP": { name: "Spain",       flag: "ES", logo: "spain.png"       },
    "SUI": { name: "Switzerland", flag: "CH", logo: "switzerland.png" },
    "TUR": { name: "Turkey",      flag: "TR", logo: "turkey.png"      },
    "URU": { name: "Uruguay",     flag: "UY", logo: "uruguay.png"     },
    "VEN": { name: "Venezuela",   flag: "VE", logo: "venezuela.png"   }

};

// نقاط البداية لكل منتخب
const initialBasePoints = {};
Object.keys(teamsMap).forEach(function(key) {
    initialBasePoints[key] = { gf: 0, pts: 0 };
});
