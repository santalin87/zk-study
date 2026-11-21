# -*- coding: utf-8 -*-
"""生成化学必修第一册（鲁科版）第1章学习路径数据包 path-chem.js。
结构与 gen_phy.py 完全同构：UNITS / NODES / VTOP / VSUM / VTECH / 内容 JSON。
视频为 B 站同步课 BV1zK411674L（鲁科版必修第一册，国家中小学课程资源同类课），
分 P 已逐一核过页面分集标题与时长（2026-11-09）；第1节无对应分P，视频留空。"""
import json, os
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, '..', 'github', 'path-chem.js')

BV = 'BV1zK411674L'
UNITS = [
 dict(id='u_chem_1', name='走进化学科学', secs='第1节', pageFrom=2, pageTo=9,
      members=['chem_c001', 'chem_c002'],
      video=dict(bvid='BV11S4y1b7eE', p=1, t='走进化学科学', dur='15:21')),
 dict(id='u_chem_2', name='研究物质性质的方法和程序', secs='第2节', pageFrom=10, pageTo=16,
      members=['chem_c003', 'chem_c004'],
      video=dict(bvid=BV, p=1, t='研究物质性质的方法和程序（一）', dur='20:47')),
 dict(id='u_chem_3', name='氯气的性质', secs='第2节', pageFrom=17, pageTo=22,
      members=['chem_c005'],
      video=dict(bvid=BV, p=2, t='研究物质性质的方法和程序（二）', dur='21:27')),
 dict(id='u_chem_4', name='物质的量与摩尔质量', secs='第3节', pageFrom=23, pageTo=27,
      members=['chem_c006', 'chem_c007'],
      video=dict(bvid=BV, p=3, t='化学中常用的物理量——物质的量（一）', dur='24:12')),
 dict(id='u_chem_5', name='气体摩尔体积', secs='第3节', pageFrom=28, pageTo=30,
      members=['chem_c008'],
      video=dict(bvid=BV, p=4, t='化学中常用的物理量——物质的量（二）', dur='20:22')),
 dict(id='u_chem_6', name='物质的量浓度与配制', secs='第3节', pageFrom=31, pageTo=33,
      members=['chem_c009', 'chem_c010'],
      video=dict(bvid=BV, p=5, t='化学中常用的物理量——物质的量（三）', dur='23:37')),
 dict(id='u_chem_7', name='微项目：探秘膨松剂', secs='微项目', pageFrom=34, pageTo=36,
      members=['chem_c011'],
      video=dict(bvid=BV, p=6, t='微项目：探秘膨松剂', dur='21:02')),
]

CRIT = ['能复述定义和公式', '能看懂例题的每一步', '能独立做对基础题', '能独立做对应用题', '能独立做对综合题并讲清思路']
def node(nid, name, sec, secTitle, page, desc, pre):
    return dict(name=name, sec=sec, secTitle=secTitle, page=page, desc=desc,
                criteria=CRIT, diag=None, pre=pre, next=[])

NODES = {
 'chem_c001': node('chem_c001', '化学科学的形成与发展', 1, '走进化学科学', 2,
    '从元素概念、质量守恒到原子论、分子学说和元素周期表——五位科学家、五级台阶。', []),
 'chem_c002': node('chem_c002', '化学科学的探索与价值', 1, '走进化学科学', 5,
    '化学创造新物质、开发新材料、助力能源环境与生命科学，绿色化学是现代方向。', ['chem_c001']),
 'chem_c003': node('chem_c003', '研究物质性质的方法和程序', 2, '研究物质性质的方法和程序', 10,
    '观察、实验、分类、比较四种方法；观察→预测→实验→结论的固定程序。', []),
 'chem_c004': node('chem_c004', '金属钠的性质与过氧化钠', 2, '研究物质性质的方法和程序', 12,
    '钠的保存、与氧气反应（常温 Na₂O/加热 Na₂O₂）、Na₂O 与 Na₂O₂ 的比较。', ['chem_c003']),
 'chem_c005': node('chem_c005', '氯气的性质', 2, '研究物质性质的方法和程序', 17,
    '黄绿色有毒气体：与金属、氢气、水的反应，HClO 的漂白性与氯水的成分。', ['chem_c003']),
 'chem_c006': node('chem_c006', '物质的量与阿伏加德罗常数', 3, '化学中常用的物理量——物质的量', 23,
    '物质的量是数粒子的批量单位：n ＝ N / N_A，N_A ≈ 6.02×10²³ mol⁻¹。', []),
 'chem_c007': node('chem_c007', '摩尔质量与换算枢纽', 3, '化学中常用的物理量——物质的量', 25,
    'n ＝ m / M；一切换算先统一到 n，复合粒子注意乘下标倍数。', ['chem_c006']),
 'chem_c008': node('chem_c008', '气体摩尔体积与阿伏加德罗定律', 3, '化学中常用的物理量——物质的量', 28,
    '标况 22.4 L/mol 的两个前提；同温同压体积比＝物质的量比，密度比＝摩尔质量比。', ['chem_c007']),
 'chem_c009': node('chem_c009', '物质的量浓度', 3, '化学中常用的物理量——物质的量', 31,
    'c ＝ n / V：V 是溶液体积；离子浓度 = 盐浓度 × 下标。', ['chem_c007']),
 'chem_c010': node('chem_c010', '一定物质的量浓度溶液的配制与误差分析', 3, '化学中常用的物理量——物质的量', 32,
    '八步配制、容量瓶规矩、误差分析回归 c＝n/V。', ['chem_c009']),
 'chem_c011': node('chem_c011', '膨松剂与碳酸氢钠', 0, '微项目：探秘膨松剂', 34,
    'NaHCO₃ 受热分解、遇酸都放 CO₂；用本章方法程序做一次完整探究。', ['chem_c003', 'chem_c007']),
}

VTOP = {
 'u_chem_1': ['化学是在原子、分子水平上研究物质的学科。', '五位科学家对应五项贡献：元素概念、质量守恒、原子论、分子学说、周期表。', '绿色化学是从源头消除污染，不是末端治理。'],
 'u_chem_2': ['四种方法：观察、实验、分类、比较。', '基本程序：观察→预测→实验→结论，顺序不能乱。', '钠与氧气：常温 Na₂O（白色），加热 Na₂O₂（淡黄色）。'],
 'u_chem_3': ['氯气黄绿色、有毒，闻气味用飘闻法。', '与铁反应生成 FeCl₃，强氧化性。', '漂白靠 HClO；石蕊先变红后褪色。'],
 'u_chem_4': ['n ＝ N / N_A，N_A ≈ 6.02×10²³ mol⁻¹。', '摩尔质量数值等于相对分子质量，单位 g/mol。', '换算先统一到 n 再出发。'],
 'u_chem_5': ['22.4 L/mol 只限标准状况下的气体。', '同温同压：体积比＝物质的量比＝分子数比。', '密度比＝摩尔质量比。'],
 'u_chem_6': ['c ＝ n / V，V 是溶液体积不是溶剂体积。', '配制八步：计算、称量、溶解、转移、洗涤、定容、摇匀、装瓶。', '误差分析只看 n 和 V 谁变了。'],
 'u_chem_7': ['NaHCO₃ 受热、遇酸都放出 CO₂。', '受热分解计量比 2∶1，遇酸 1∶1。', '探究程序与第 2 节的四步完全一致。'],
}
SELF_PACKS = {'BV11S4y1b7eE|1': {'src': '/video/chem1.mp4', 'vtt': '/video/chem1.vtt', 'segs': [[0, '开场导入：从生活中的物质走进化学科学'], [124, '古代化学：用其物而不知其理（火、陶瓷、冶炼、炼丹）'], [156, '近代化学形成：波义耳、拉瓦锡、道尔顿、阿伏加德罗、门捷列夫'], [259, '我国化学成就：国家最高科学技术奖与屠呦呦'], [364, '化学的特征一：从宏观与微观两个角度认识物质'], [386, '特征二：用符号表征物质（元素符号、化学式、方程式）'], [485, '特征三：在不同层面创造物质（提取、合成、新物质）'], [605, '化学的价值与探索空间：能源、材料、环境、生命、信息'], [734, '随堂检测：三道题练手'], [855, '课堂小结：形成发展、主要特征、探索空间']]}}

VSUM = {
 'u_chem_1': '化学史就是五级台阶：波义耳给出元素的概念，拉瓦锡用定量实验确立**质量守恒**，道尔顿提出**原子论**，阿伏加德罗提出**分子学说**，门捷列夫排出周期表。现代方向记三个词：**绿色化学**（源头减污）、纳米化学、超分子化学。==考试爱考人物与贡献的对应==，以及把末端治理冒充绿色化学的陷阱。视频为化学僧鲁科版必修一《走进化学科学》（15:21）。\n易错提醒：绿色化学指的是从源头减少或消除污染，把末端治理说成绿色化学是这类题最常见的陷阱。',
 'u_chem_2': '方法四件套（观察、实验、分类、比较）加上固定程序（==观察→预测→实验→结论==），是研究任何新物质的通用打法。钠是第一个案例：保存在**煤油**中；常温被氧化成白色 **Na₂O**，加热生成淡黄色 **Na₂O₂**（氧为 −1 价，能与水、CO₂ 反应放氧，可作**供氧剂**）；与铁的比较说明金属有共性、更有个性。\n易错提醒：钠在常温下被氧化成白色 Na₂O、加热时生成淡黄色 Na₂O₂，两种产物的颜色一定要对应记准。',
 'u_chem_3': '氯气：黄绿色、刺激性气味、有毒、能溶于水。与金属生成**高价盐**（Fe→**FeCl₃**，棕褐色烟），与氢气苍白色火焰生成 HCl，与水生成 HCl 和 HClO。漂白、杀菌靠 **HClO**，干燥氯气不漂白；氯水久置变稀盐酸。**新制氯水**==使石蕊先变红后褪色==，是必考现象。\n易错提醒：真正起漂白、杀菌作用的是 HClO 而不是 Cl₂，干燥的氯气本身并不漂白。',
 'u_chem_4': '**物质的量** n 是微观粒子数的批量单位，桥梁是 N_A ≈ 6.02×10²³ mol⁻¹ 与**摩尔质量 M**（数值等于**相对分子质量**、单位 g/mol）。做题总路线：质量除以 M、==个数除以 N_A，先都换成 n==；求复合粒子（分子中的原子、离子所带电荷等）记得乘**化学式下标**。说「1 mol」必须指明粒子种类。\n易错提醒：求分子中的原子、离子所带电荷等复合粒子的数目时，一定要记得乘化学式中的下标。',
 'u_chem_5': '**气体摩尔体积** V_m：标况下约 **22.4 L/mol**，前提是「气体」加「**标准状况**」，缺一不可（水、苯、SO₃ 在标况都不是气体）。**阿伏加德罗定律**：同温同压下体积比＝物质的量比＝分子数比；==密度比＝摩尔质量比==。常温常压下 1 mol 气体约 24.5 L，不要和 22.4 混。\n易错提醒：22.4 L/mol 只适用于标准状况下的气体，非标况或非气体硬套这个数值是这类题最常见的丢分点。',
 'u_chem_6': '**物质的量浓度 c ＝ n / V**，==V 指溶液体积；溶液均一==，取出部分浓度不变；**离子浓度乘下标**。配制用**容量瓶**（就近选大、用前查漏、不能溶解和存放），八步里最易丢分的是：冷却后再转移、洗涤 2~3 次并转入、**平视定容**、摇匀后不补水。误差分析回到 c＝n/V：n 变小或 V 变大→偏低，反之偏高。\n易错提醒：公式中的 V 指的是溶液体积而不是溶剂体积，代错了浓度必然算错。',
 'u_chem_7': '微项目用 **NaHCO₃** 收官全章：受热分解 2NaHCO₃ ＝ Na₂CO₃ + H₂O + CO₂↑（膨松），遇酸 NaHCO₃ + HCl ＝ NaCl + H₂O + CO₂↑（中和胃酸）。探究流程正是第 2 节的四步程序，计算正是第 3 节的**计量换算**——==方法与定量在本课合流==。注意**碳酸钠（苏打）**与**碳酸氢钠（小苏打）**不要写混。\n易错提醒：碳酸钠是苏打、碳酸氢钠是小苏打，两者的俗名和化学式千万不要写混。'
}

VTECH = {
 'u_chem_1': ['看到「人物—贡献」连线信号 → 先锁定最有名的周期表（门捷列夫）和质量守恒（拉瓦锡），再排其余。', '看到「尾气/废水处理后排放」→ 判断为末端治理，不是绿色化学。'],
 'u_chem_2': ['看到排序题信号 → 默念「观察、预测、实验、结论」，预测永远在实验前。', '看到钠与氧气的题 → 先问条件：常温白色 Na₂O，加热淡黄 Na₂O₂。'],
 'u_chem_3': ['看到「漂白」信号 → 答题落点写 HClO，不写 Cl₂。', '看到石蕊现象 → 分两步写：先变红（酸性）后褪色（漂白）。'],
 'u_chem_4': ['看到质量/个数混合换算 → 全部先换成 n（m÷M、N÷N_A）再求目标。', '看到「分子中原子数」 → 分子 mol 先算，再乘下标。'],
 'u_chem_5': ['看到 22.4 → 先核两件事：气体？标况？有一个不满足就停手。', '看到「同温同压求密度比/求 M」 → 直接写 ρ 比 ＝ M 比。'],
 'u_chem_6': ['看到误差分析 → 只问两句：溶质少了吗？水多了还是少了？对照 c＝n/V 定偏高偏低。', '看到「溶于 1 L 水」 → 警惕：那不是溶液体积，不能直接当 V。'],
 'u_chem_7': ['看到方程式计算 → 先把已知量换成 mol，按计量数比例推目标物，再换单位。', '看到俗名（小苏打/苏打） → 先翻译成化学式再动笔。'],
}

def main():
    content = {}
    for fn in ('content-u123.json', 'content-u456.json'):
        content.update(json.load(open(os.path.join(BASE, 'chem', fn), encoding='utf-8')))
    miss = [m for u in UNITS for m in u['members'] if m not in content]
    assert not miss, f'missing content: {miss}'

    units, nodes, order = {}, {}, []
    nu = {}
    for u in UNITS:
        v = None
        if u['video']:
            v = dict(bvid=u['video']['bvid'], p=u['video']['p'], t=u['video']['t'],
                     from_=0, dur=u['video']['dur'], vtop=VTOP[u['id']], vsum=VSUM[u['id']],
                     vtech=VTECH[u['id']], vgaokao=[])
            v['from'] = 0; del v['from_']
            if u['id'] == 'u_chem_1':
                v['from'] = '化学僧'  # 2026-11-09 下午：B站嵌入失效，改本站自托管（见 SELF_PACKS）
        units[u['id']] = dict(id=u['id'], name=u['name'], secs=u['secs'], pageFrom=u['pageFrom'],
                              pageTo=u['pageTo'], members=u['members'], video=v)
        for m in u['members']:
            nu[m] = u['id']
    for nid, meta in NODES.items():
        d = dict(meta)
        d['content'] = content[nid]
        d['video'] = units[nu[nid]]['video']
        nodes[nid] = d
        order.append(nid)
    for nid, d in nodes.items():
        for pre in d['pre']:
            nodes[pre]['next'].append(nid)

    book = dict(subject='化学', book='必修第一册', version='鲁科版',
                chapters=[dict(no=1, title='认识化学科学', units=[u['id'] for u in UNITS])],
                order=[u['id'] for u in UNITS], nodes=nodes, units=units, nodeUnit=nu)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('var PATH_BOOK_CHEM = ' + json.dumps(book, ensure_ascii=False) + ';\n')
        f.write('\nwindow.SELF_VIDEO_PACKS=(window.SELF_VIDEO_PACKS||[]);window.SELF_VIDEO_PACKS.push(' + json.dumps(SELF_PACKS, ensure_ascii=False) + ');\n')
    print('wrote', OUT, 'units', len(units), 'nodes', len(nodes))

if __name__ == '__main__':
    main()
