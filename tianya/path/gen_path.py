import json, re

topics = {t['id']: t for t in json.load(open('/home/hatch/workspace/study/path/topics.json'))}
deps = json.load(open('/home/hatch/workspace/study/path/dependencies.json'))
content = {}
import glob
for f in sorted(glob.glob('/home/hatch/workspace/study/path/content-ch*.json')):
    content.update(json.load(open(f)))

# 必修第一册章节结构（据用户 2026-11-02 提供的课本目录转录，含起始页）
CH = [
    ("第一章", "集合与常用逻辑用语", [("1.1", "集合的概念", 2), ("1.2", "集合间的基本关系", 7), ("1.3", "集合的基本运算", 10), ("1.4", "充分条件与必要条件", 17), ("1.5", "全称量词与存在量词", 26)]),
    ("第二章", "一元二次函数、方程和不等式", [("2.1", "等式性质与不等式性质", 37), ("2.2", "基本不等式", 44), ("2.3", "二次函数与一元二次方程、不等式", 50)]),
    ("第三章", "函数的概念与性质", [("3.1", "函数的概念及其表示", 60), ("3.2", "函数的基本性质", 76), ("3.3", "幂函数", 89), ("3.4", "函数的应用（一）", 93)]),
    ("第四章", "指数函数与对数函数", [("4.1", "指数", 104), ("4.2", "指数函数", 111), ("4.3", "对数", 122), ("4.4", "对数函数", 130), ("4.5", "函数的应用（二）", 142)]),
    ("第五章", "三角函数", [("5.1", "任意角和弧度制", 168), ("5.2", "三角函数的概念", 177), ("5.3", "诱导公式", 188), ("5.4", "三角函数的图象与性质", 196), ("5.5", "三角恒等变换", 215), ("5.6", "函数 y=Asin(ωx+φ)", 231), ("5.7", "三角函数的应用", 242)]),
]
SEC_PAGE = {}
SEC_TITLE = {}
for ci, (cn, ct, secs) in enumerate(CH, 1):
    for s, st, pg in secs:
        SEC_PAGE[s] = pg
        SEC_TITLE[s] = st

# 老师讲解视频：第一章 2026-11-09 换宋浩老师《高中数学》合集（按节自带 bvid，自托管整课视频，1.2+1.3 与量词两节各两集在播放器侧合成一课，见 index.html SELF_VIDEOS）；其余章节暂无自托管视频。
# 历史注记（原一数 BV1UnJQzbEBm 映射，2026-11-04 实测纠正）：该 BV 共 35 个分P，每集都有一个带哈希后缀的重复分P，真实内容在奇数页（集数≠页码）。
SEC_VIDEO = {
    "1.1": {"p": 1, "t": "集合的概念", "bvid": "BV1Ek4y1w7ma", "from": "宋浩老师·高中数学"},
    "1.2": {"p": 1, "t": "集合间的基本关系与运算", "bvid": "BV1TP411h7U2", "from": "宋浩老师·高中数学"},
    "1.3": {"p": 1, "t": "集合间的基本关系与运算", "bvid": "BV1TP411h7U2", "from": "宋浩老师·高中数学"},
    "1.4": {"p": 1, "t": "充分条件与必要条件", "bvid": "BV11p4y1F78j", "from": "宋浩老师·高中数学"},
    "1.5": {"p": 1, "t": "全称量词与存在量词", "bvid": "BV1KF411S7aq", "from": "宋浩老师·高中数学"},
}
BVID = "BV1UnJQzbEBm"

# 本册节点：taxonomy 中 chapter 以「高一 第X章」开头的 + 数学建模（归入第四章后）
book_nodes = []
for t in topics.values():
    ch = t['chapter']
    if ch.startswith('高一 第'):
        m = re.match(r'高一 (第.章) (.+?) (\d+\.\d+)$', ch)
        if m:
            book_nodes.append((t, m.group(2), m.group(3)))
book_nodes.sort(key=lambda x: x[0]['id'])

pre_map = {}
next_map = {}
for d in deps:
    pre_map.setdefault(d['topicId'], []).append(d)
    next_map.setdefault(d['prerequisiteId'], []).append(d['topicId'])

def stage_of(t):
    if t['id'].startswith('cnm_h'):
        return '高中'
    if t['id'].startswith('cnm_j') or re.match(r'cnm_0\d\d', t['id']):
        return '初中'
    return '小学'

nodes = {}
order = []
for t, chname, sec in book_nodes:
    nid = t['id']
    pres = []
    for d in sorted(pre_map.get(nid, []), key=lambda d: (0 if d['strength'] == 'hard' else 1)):
        pt = topics.get(d['prerequisiteId'])
        if not pt:
            continue
        pres.append({"id": pt['id'], "name": pt['name'], "stage": stage_of(pt), "hard": d['strength'] == 'hard'})
    nxts = []
    for x in next_map.get(nid, []):
        if x in topics and topics[x]['chapter'].startswith('高一'):
            nxts.append({"id": x, "name": topics[x]['name']})
    node = {
        "name": t['name'], "sec": sec, "secTitle": SEC_TITLE.get(sec, ''),
        "page": SEC_PAGE.get(sec), "desc": t.get('description', ''),
        "criteria": t.get('mastery_criteria', []),
        "diag": t.get('diagnostic_question'),
        "pre": pres, "next": nxts,
    }
    if sec in SEC_VIDEO:
        node["video"] = dict(SEC_VIDEO[sec])
        node["video"].setdefault("bvid", BVID)
    if nid in content:
        c = dict(content[nid])
        if 'case' in c:
            c['case'] = dict(c['case'], tier='redo')
        node["content"] = c
    nodes[nid] = node
    order.append(nid)

chapters = []
for ci, (cn, ct, secs) in enumerate(CH, 1):
    ids = [n for n in order if nodes[n]['sec'].split('.')[0] == str(ci)]
    chapters.append({"no": cn, "title": ct, "nodes": ids})

VTOP = {
 ("BV1Ek4y1w7ma", 1): ["把确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素。", "常用数集记号要记牢：N 自然数（含 0）、N+ 正整数、Z 整数、Q 有理数、R 实数，没特别说明默认是实数。", "描述法先看代表元素：同一个式子，装数、装点，得到的集合完全不同。"],
 ("BV1TP411h7U2", 1): ["子集不排斥相等，空集是任何集合的子集；真子集还得确认大集合里有小集合没有的元素。", "交集取公共、并集都收进来、补集先认全集再取对立面。", "含参数的包含题，最后一步永远是把端点代回去试能不能取等。"],
 ("BV11p4y1F78j", 1): ["p 能推出 q，一次产生两个结论：p 是 q 的充分条件，q 是 p 的必要条件。", "范围小能推出范围大：小范围是充分条件，这个方向最容易想反。", "判四种关系就验两个箭头：正推、反推分开验，推不出就举反例。"],
 ("BV1KF411S7aq", 1): ["全称看“所有都成立”，存在看“找到一个就行”：判存在先找例子，判全称先找反例。", "写否定只动两处：量词翻面、结论否定（等号跟着一起翻），范围一个字不改。", "端点能不能取等，别用脑子想，把端点值代回原题试一遍。"],
}

VSUM = {
 ("BV1Ek4y1w7ma", 1): "这一课讲 1.1 集合的概念，宋浩老师的讲法很接地气：==集合这套语言是整个高中数学的地基，概念不熟，后面学函数处处别扭==。\n定义先立住：==把确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素==。集合用大写字母、元素用小写字母。元素和集合之间是**属于**或**不属于**，老师特意提醒：==属于连的是元素和集合，包含连的是集合和集合，地位不对等，别混用符号==。\n一个方程 x+1=x+2 永远无解，引出了**空集**：不含任何元素的集合，比如班里身高两米以上的同学组成的集合。\n元素三性质逐个讲透。**确定性**：标准必须客观明确，「高个子」「帅」说了不算——老师拿东北啤酒打比方，常温零下十度、冰镇零下一度，「冷不冷」根本没有统一标准；身高不低于一米七五就是明确标准。**互异性**：同一元素只算一次，班里有一对双胞胎，长得再像也是两个人。**无序性**：{1, 2} 和 {2, 1} 是同一个集合，集合只关心有谁、不关心顺序（但期末按名次发奖金就讲顺序了，那是另一回事）。\n==常用数集的记号要记牢：N 自然数（从 0 开始）、N+ 正整数、Z 整数、Q 有理数、R 实数；题目没说范围，默认就是实数==。\n表示法两种。**列举法**把元素一个个摆出来，元素少时最省事；**描述法**写成 {x | 条件}，老师拿找对象打比方：竖线左边是「人长什么样」，右边是「要满足的条件」。==读描述法先看竖线左边的代表元素：是数就装数，是 (x, y) 就装点，代表元素不同，集合完全不同==。两道例题当场演示：一道判断 3k-1 形式的集合里有没有某个数（先罗列几个找规律，再换「加 1 能被 3 整除」的判定法）；一道由两个集合相等反求参数，靠**互异性**把 a=1 的情况砍掉。\n最后是**区间表示法**：==能取到的端点用中括号、取不到用小括号，无穷那头永远用小括号==；数轴上能包含的点画实心、不能包含画空心。\n易错提醒：空集不是 {0}，空集里一个元素都没有；解集最后要写成集合或区间，只写 x 大于几不算答完；点集别把一个点拆成两个数写。",
 ("BV1TP411h7U2", 1): "这一课把 1.2 集合间的基本关系和 1.3 集合的基本运算连着讲完，两个视频合成一课。\n关系先行。==A 的每个元素都在 B 里，A 就是 B 的子集；子集不排斥相等，A 等于 B 时照样互为子集==。两条特殊规定要背死：任何集合是它自己的子集；**空集**是任何集合的子集、任何非空集合的真子集。**真子集**比子集多一刀：B 里必须有 A 没有的元素——班里的男生是全班同学的真子集。包含关系还能传递：A 是 B 的子集、B 是 C 的子集，就有 A 是 C 的子集。\n例题密度很大：{∅} 这道题里，空集对 {∅} 既是**属于**（它是人家的元素）又是**包含**（空集是任何集合的子集），两个答案都对；写一个集合的全部子集，按元素个数从 0 往上排队就不重不漏，真子集把集合本身划掉；由 B 是 A 的子集求参数 a 的范围，老师立了条规矩：==端点能不能取等，不能光用眼睛看，把端点值代回去试一遍==；含参区间被另一个区间包含，除了两头对齐，还要多写一条「左端不超过右端」防漏；{1, 2} 到 {1, 2, 3, 4, 5} 之间夹着的集合 A 有几个，3、4、5 每个都是取或不取两种选择，2 的 3 次方等于 8 个，乘法原理登场。\n运算三件套：==交集取两个集合的公共部分（兴趣小组要物理、数学都达标，缺一不可），并集把两边的元素都收进来（重复的只算一次），补集是先认全集，再在全集里取对立面==。老师讲并集端点时自己画错了一次、当场改了回来，正好说明这类题全靠数轴盯端点。**全集**由题目给定，换个题就换一个；补集的规律顺手记：补集的补集是自己，A 和它的补集交集是空集、并集是全集。压轴例题在自然数全集里做交、补混算，第一步永远是先把每个集合的元素列出来。\n易错提醒：写子集别漏空集；求补集先看清全集是谁；补集翻面时端点的开闭也要跟着翻；看到 Z、N 的限定，装的是点不是段。",
 ("BV11p4y1F78j", 1): "这一课讲 1.4 充分条件与必要条件。宋浩老师不绕弯子，先把定义钉死：==如果 p 成立就能推出 q 成立，那么 p 是 q 的充分条件，q 是 p 的必要条件——一次推出，同时产生两个结论==。\n紧接着是最容易翻车的直觉纠正。==范围小能推出范围大，范围大推不出范围小==：x 大于等于 0 能推出 x 大于 -1，但 x 大于 -1 推不出 x 大于等于 0，反例就是 -0.5。很多人觉得范围大的「更重要、更充分」，正好想反——小的那个集合被大的包着，从小出发才走得通。换成集合语言：满足 p 的集合是满足 q 的集合的子集时，p 才能推出 q。\n两个定理视角帮着记：二次函数的**判定定理**给的是充分条件（长成 y=ax 方且 a 不为 0 就一定是二次函数，反过来二次函数不一定只有二次项）；菱形的**性质定理**给的是必要条件（是菱形必有对角线互相垂直，但对角线垂直的四边形不一定是菱形）。\n四种关系一次排清：==双向都能推是充要，只正推是充分不必要，只反推是必要不充分，都推不出是既不充分也不必要==。例题四连全是集合包装的：A 是空集能推出 A 并 B 等于 B（充分不必要）；A 是 B 的子集与 A 交 B 等于 A 互推（充要）；x 属于 A 推不出 x 属于 A 交 B，但反过来成立（必要不充分）。\n老师最后交代：这节课只是个壳，考试时它会套上不等式、方程、函数再出现。\n易错提醒：问「p 是 q 的什么条件」，先把 p 推 q、q 推 p 两个方向分开各验一遍；方向感乱了就画数轴比范围，小推大不会错。",
 ("BV1KF411S7aq", 1): "这一课讲 1.5 全称量词与存在量词，两个视频合成一课：前半讲量词和命题，后半专攻命题的否定。\n先补一个底：**命题**是能判断真假的陈述句，「明天会不会下雨」是疑问句，不是命题；「4 大于 5」是假命题，但仍然是命题。判真假的练习里埋了个提醒：==有些结论离开前提就翻车——「垂直于同一条直线的两条直线平行」必须加上「在平面内」才成立==。\n两个量词分清：**全称量词**是任意、所有、每一个（符号是个倒写的 A，老师说就记英文 any 的 A 倒过来写）；**存在量词**是存在、至少有一个（符号记 exist 的 E 反过来写）。==全称命题要所有元素都满足，存在命题只要找到一个就行==。判真假的手感就此立住：判存在先找例子（x 的三次方小于 1，取 x=0 就行），判全称先找反例（根号 x 大于 1，取 x=0 当场推翻）。\n两道含参数的题演示了标准套路：全称命题 x 方大于等于 1 对 x 大于等于 a 恒成立，要 a 大于等于 1；说存在 x 使 x 方等于 1 是假命题，要 a 小于 -1——端点 a 等于 -1 能不能取，把 -1 代回去一试便知，老师反复念叨：端点别用脑子想，用笔试。\n后半讲**命题的否定**：==原命题和它的否定真假正好相反；写否定只动两处——量词翻面、结论否定，范围和代表元素一个字不改==。结论里的不等号要带着等号翻：大于变小于等于。「至少有一个」的否定是「所有都不」。压轴是一道滑动区间题：区间 [a, a+1] 长度是 1，像个空调遥控器放哪都长 1，要让里面每个 x 都大于 -1，左端必须顶住 -1 的右侧，最后照例把 a 等于 -1 代回去验掉。\n易错提醒：写否定别改范围；「不都是」不是「都不是」；否定不等式别漏等号；存在命题判真只需要一个例子，别把自己绕进证明里。",
}
VTECH = {
 ("BV1Ek4y1w7ma", 1): [["判集合先看标准", "问“能不能组成集合”，只看标准客不客观：身高不低于一米七五能定死，行；“高个子”“帅”定不死，不行——跟你知不知道是哪几个人没关系。"], ["含参数先列互异性禁区", "集合的几个元素都带同一个参数，先让它们两两不相等，把参数不能取的值排掉；剩下候选值代回原集合，再验一遍有没有两个元素撞车。"], ["读描述法先圈代表元素", "竖线左边是什么，集合就装什么：是 x 装数、是 (x, y) 装点。同一个式子，代表元素换人，集合全变。"], ["解集收尾写成集合或区间", "解完不等式别只写 x 大于几：写成集合或区间，能取到的端点用中括号、取不到用小括号，无穷那头永远小括号。"]],
 ("BV1TP411h7U2", 1): [["写子集按个数排队", "列一个集合的全部子集，按元素个数从 0 往上数：空集、单元素、双元素……直到它本身，不重不漏；要真子集，就把最后它本身划掉。"], ["包含求参数：端点代回去试等", "由包含关系列不等式组时，别漏左端不超过右端那一条；算完把端点值代回原题试一遍，能取等才写等号。这一步靠笔，不靠眼睛看。"], ["先解集合再运算", "描述法给的集合，先解成数轴上的一段或几个具体的点，再谈交、并、补；看到 Z、N 的限定，里面装的是一个个点，答案用列举法写。"], ["补集先认全集", "求补集先问全集是谁，全集变了补集就变；翻面时端点开闭跟着翻——原来取不到的点，补集里恰好取得到。"]],
 ("BV11p4y1F78j", 1): [["两箭头分开验", "问“p 是 q 的什么条件”，先验 p 能不能推出 q，再验 q 能不能推出 p：双通是充要、只通正向是充分不必要、只通反向是必要不充分、都不通是既不充分也不必要。"], ["推不出就举反例", "要说明一个方向不成立，别硬证：找一个满足出发点、却不满足落点的数。x 大于 2 推不出 x 大于 3，反例 2.5；x 大于 -1 推不出 x 大于等于 0，反例 -0.5。"], ["小范围推大范围", "条件能化成范围就画数轴比大小：满足 p 的范围小，p 就是充分条件。别凭“范围大更重要”的直觉答，这道题的直觉正好是反的。"], ["先翻译再判断", "条件被集合语言包装时（A 是空集、A 并 B 等于 B、A 交 B 等于 A），先翻译成包含关系或等式，再判箭头方向；带方程、不等式的，先化简到最简再比。"]],
 ("BV1KF411S7aq", 1): [["判存在找一个，判全称找反例", "存在命题判真，找到一个成立的例子就收工，优先试 0、1、端点；全称命题判假，同样一个反例就够。"], ["写否定两步走", "先把量词翻面（任意变存在、至少有一个变所有都不），再把结论否定：大于变小于等于、属于变不属于，等号跟着一起翻；范围和代表元素一个字不改。"], ["量词求参数先在数轴上定位", "全称命题为真，参数要让整个范围避开坏地带；存在命题为假，等于一个合格的点都取不到。先把关键点标在数轴上，再看参数应该站哪边。"], ["端点代回原题试", "卡在端点能不能取等上，别用脑子想：把端点值代回原命题验真假，成立就带等号，不成立就去掉。"]],
}

VGAOKAO = {
 ("BV1Ek4y1w7ma", 1): [{"src": "2024 · 北京卷 · 第 1 题", "q": "已知 M = {x | -3 < x < 1}，N = {x | -1 ≤ x < 4}，则 M ∪ N =（　）", "opts": "A. {x | -1 ≤ x < 1}　B. {x | x > -3}　C. {x | -3 < x < 4}　D. {x | x < 4}", "ans": "C", "why": "用技巧 4：并集是把两段在数轴上连起来取总范围，左端 -3 取不到、右端 4 取不到，所以是 (-3, 4)。"}, {"src": "2021 · 新高考 I 卷 · 第 1 题（福建就考这个卷）", "q": "设 A = {x | -2 < x < 4}，B = {2, 3, 4, 5}，则 A ∩ B =（　）", "opts": "A. {2}　B. {2, 3}　C. {3, 4}　D. {2, 3, 4}", "ans": "B", "why": "用技巧 3 的读法：一边是列举、一边是描述，就把 B 的元素逐个拿去 A 的条件里验，4 不满足 x < 4，先划掉。"}],
 ("BV1TP411h7U2", 1): [{"src": "2023 · 新课标 I 卷 · 第 1 题（福建就考这个卷）", "q": "已知集合 M = {-2, -1, 0, 1, 2}，N = {x | x² - x - 6 ≥ 0}，则 M ∩ N =（　）", "opts": "A. {-2, -1, 0, 1}　B. {0, 1, 2}　C. {-2}　D. {2}", "ans": "C", "why": "用技巧 3：先解 N，x² - x - 6 ≥ 0 得 x ≤ -2 或 x ≥ 3；再把 M 的元素逐个验，只有 -2 在 N 里。"}],
 ("BV11p4y1F78j", 1): [{"src": "2025 · 天津卷 · 第 2 题", "q": "设 x ∈ R，则“x = 0”是“sin²x = 0”的（　）", "opts": "A. 充分不必要条件　B. 必要不充分条件　C. 充要条件　D. 既不充分也不必要条件", "ans": "A", "why": "用技巧 1 和 2：x=0 当然能推出 sin²x=0；反过来 sin²x=0 还有 x = π 这样的解，一个反例就说明必要不成立。"}],
 ("BV1KF411S7aq", 1): [{"src": "2011 · 辽宁卷（文）· 第 4 题", "q": "已知命题 p：存在 n ∈ N，使 2 的 n 次方 > 1000，则 p 的否定为（　）", "opts": "A. 任意 n ∈ N，2 的 n 次方 ≤ 1000　B. 存在 n ∈ N，2 的 n 次方 > 1000　C. 存在 n ∈ N，2 的 n 次方 ≤ 1000　D. 任意 n ∈ N，2 的 n 次方 < 1000", "ans": "A", "why": "用技巧 2：存在先翻成任意，结论“>1000”否定成“≤1000”——等号不能漏，所以 D 错。"}],
}
UNIT_NAME_OVERRIDE = {('1.2', '1.3'): '集合的关系与运算'}

units = {}
unit_order = []
chapters_out = []
node_unit = {}
for ch in chapters:
    secs_seen = []
    for nid in ch['nodes']:
        s = nodes[nid]['sec']
        if s not in secs_seen:
            secs_seen.append(s)
    groups = []
    for s in secs_seen:
        members = [nid for nid in ch['nodes'] if nodes[nid]['sec'] == s]
        vid = nodes[members[0]].get('video')
        if groups and vid and groups[-1]['video'] and vid['bvid'] == groups[-1]['video']['bvid'] and vid['p'] == groups[-1]['video']['p']:
            groups[-1]['members'] += members
            groups[-1]['secs'].append(s)
        else:
            groups.append({'members': list(members), 'secs': [s], 'video': vid})
    ch_units = []
    for g in groups:
        uid = 'u_' + g['members'][0]
        first = nodes[g['members'][0]]
        last = nodes[g['members'][-1]]
        key = (g['secs'][0], g['secs'][-1]) if len(g['secs']) > 1 else None
        video = None
        if g['video']:
            video = dict(g['video'])
            vs = VSUM.get((video['bvid'], video['p']))
            if vs:
                video['vsum'] = vs
            vt = VTOP.get((video['bvid'], video['p']))
            if vt:
                video['vtop'] = vt
            vte = VTECH.get((video['bvid'], video['p']))
            if vte:
                video['vtech'] = vte
            vg = VGAOKAO.get((video['bvid'], video['p']))
            if vg:
                video['vgaokao'] = vg
        units[uid] = {
            'id': uid,
            'name': UNIT_NAME_OVERRIDE.get(key, first['secTitle']),
            'secs': ('-'.join(g['secs'])) if len(g['secs']) > 1 else g['secs'][0],
            'pageFrom': first['page'], 'pageTo': last['page'],
            'members': g['members'], 'video': video,
        }
        for m in g['members']:
            node_unit[m] = uid
        unit_order.append(uid)
        ch_units.append(uid)
    chapters_out.append({'no': ch['no'], 'title': ch['title'], 'units': ch_units})

for uid in unit_order:
    u = units[uid]
    pre_u, seen_p = [], set()
    junior, seen_j = [], set()
    next_u, seen_n = [], set()
    for m in u['members']:
        for p in nodes[m].get('pre', []):
            if p['id'] in node_unit and node_unit[p['id']] != uid:
                if node_unit[p['id']] not in seen_p:
                    seen_p.add(node_unit[p['id']])
                    pre_u.append({'id': node_unit[p['id']], 'name': units[node_unit[p['id']]]['name']})
            elif p['id'] not in node_unit:
                k = p['stage'] + '|' + p['name']
                if k not in seen_j:
                    seen_j.add(k)
                    junior.append({'stage': p['stage'], 'name': p['name']})
        for x in nodes[m].get('next', []):
            if x['id'] in node_unit and node_unit[x['id']] != uid and node_unit[x['id']] not in seen_n:
                seen_n.add(node_unit[x['id']])
                next_u.append({'id': node_unit[x['id']], 'name': units[node_unit[x['id']]]['name']})
    u['preUnits'] = pre_u
    u['junior'] = junior
    u['nextUnits'] = next_u
for i, uid in enumerate(unit_order):
    units[uid]['prevU'] = {'id': unit_order[i - 1], 'name': units[unit_order[i - 1]]['name']} if i > 0 else None
    units[uid]['nextU'] = {'id': unit_order[i + 1], 'name': units[unit_order[i + 1]]['name']} if i < len(unit_order) - 1 else None

out = {"subject": "数学", "book": "必修第一册", "version": "人教A版",
       "chapters": chapters_out, "order": unit_order, "nodes": nodes,
       "units": units, "nodeUnit": node_unit}
js = "/* 学习路径数据：数学必修第一册（人教A版）。骨架与先修关系据 GitHub 开源图谱 cn-math-taxonomy（对齐课标与人教A版），章节页码据课本目录；学习单元为本站打磨内容。 */\n"
js += "var PATH_BOOK = " + json.dumps(out, ensure_ascii=False) + ";\n"
open('/home/hatch/workspace/study/github/path.js', 'w').write(js)
print("units:", len(unit_order), "| nodes:", len(order), "| content nodes:", sum(1 for n in order if 'content' in nodes[n]))
print("chapter units:", [(c['no'], len(c['units'])) for c in chapters_out])
print("ch1:", [(units[u]['secs'], units[u]['name'], len(units[u]['members'])) for u in chapters_out[0]['units']])
