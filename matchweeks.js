// =========================================================
// matchweeks.js — Finalissima League
// 38 جولة × 10 مباريات = 380 مباراة
// Round-Robin (كل منتخب ضد كل منتخب مرتين)
// =========================================================

const matchweeks = {

    1: [["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"]],
    2: [["BEL","BRA"],["COL","CRO"],["ENG","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"]],
    3: [["BRA","CRO"],["COL","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"]],
    4: [["CRO","GER"],["ENG","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"]],
    5: [["GER","HUN"],["GRE","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"]],
    6: [["HUN","MEX"],["ITA","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"]],
    7: [["MEX","NOR"],["NED","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"]],
    8: [["NOR","SRB"],["RUS","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"]],
    9: [["SRB","SUI"],["ESP","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"]],
    10:[["SUI","URU"],["TUR","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"]],
    11:[["URU","ARG"],["VEN","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"]],
    12:[["ARG","VEN"],["BEL","BRA"],["COL","CRO"],["ENG","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"]],
    13:[["BEL","COL"],["BRA","CRO"],["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"]],
    14:[["COL","ENG"],["CRO","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"]],
    15:[["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"]],
    16:[["GRE","ITA"],["HUN","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"],["ENG","GER"]],
    17:[["ITA","NED"],["HUN","MEX"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"]],
    18:[["MEX","NOR"],["NED","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"]],
    19:[["NOR","SRB"],["RUS","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"]],
    20:[["SRB","SUI"],["ESP","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"]],
    21:[["SUI","URU"],["TUR","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"]],
    22:[["URU","ARG"],["VEN","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"]],
    23:[["ARG","VEN"],["BEL","BRA"],["COL","CRO"],["ENG","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"]],
    24:[["BEL","COL"],["BRA","CRO"],["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"]],
    25:[["COL","ENG"],["CRO","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"]],
    26:[["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"]],
    27:[["GRE","ITA"],["HUN","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"],["ENG","GER"]],
    28:[["ITA","NED"],["HUN","MEX"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"]],
    29:[["MEX","NOR"],["NED","RUS"],["SRB","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"]],
    30:[["NOR","SRB"],["RUS","ESP"],["SUI","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"]],
    31:[["SRB","SUI"],["ESP","TUR"],["URU","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"]],
    32:[["SUI","URU"],["TUR","VEN"],["ARG","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"]],
    33:[["URU","ARG"],["VEN","BEL"],["BRA","COL"],["CRO","ENG"],["GER","GRE"],["HUN","ITA"],["MEX","NED"],["NOR","RUS"],["SRB","ESP"],["SUI","TUR"]],
    34:[["ARG","VEN"],["BEL","BRA"],["COL","CRO"],["ENG","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"]],
    35:[["BEL","COL"],["BRA","CRO"],["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"]],
    36:[["COL","ENG"],["CRO","GER"],["GRE","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"]],
    37:[["ENG","GRE"],["GER","HUN"],["ITA","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"]],
    38:[["GRE","ITA"],["HUN","MEX"],["NED","NOR"],["RUS","SRB"],["ESP","SUI"],["TUR","URU"],["VEN","ARG"],["BEL","BRA"],["COL","CRO"],["ENG","GER"]]

};

// دالة مساعدة: جلب مباريات جولة معينة
function getMatchesForRound(round) {
    return matchweeks[round] || [];
}
