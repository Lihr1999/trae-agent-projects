import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'economy.db');

const SQL = await initSqlJs();
const db = new SQL.Database();

function exec(sql) {
  db.run(sql);
}

function prepare(sql) {
  const paramCount = (sql.match(/\?/g) || []).length;
  return {
    run: (...params) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params.slice(0, paramCount));
        stmt.step();
      } finally {
        stmt.free();
      }
    },
  };
}

function transaction(fn) {
  exec('BEGIN TRANSACTION');
  try {
    fn();
    exec('COMMIT');
  } catch (e) {
    exec('ROLLBACK');
    throw e;
  }
}

exec(`
  CREATE TABLE regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    parent_id TEXT,
    gdp REAL DEFAULT 0,
    population REAL DEFAULT 0,
    geojson TEXT,
    geojson_compressed TEXT
  );
  CREATE TABLE flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    value REAL DEFAULT 0,
    type TEXT DEFAULT 'economic'
  );
  CREATE TABLE drill_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    weight REAL DEFAULT 1
  );
`);

const PROVINCES = [
  { id: 'beijing', name: '北京', center: [116.4, 39.9], gdp: 41610, pop: 2184 },
  { id: 'tianjin', name: '天津', center: [117.2, 39.1], gdp: 16311, pop: 1363 },
  { id: 'hebei', name: '河北', center: [114.5, 38.0], gdp: 42370, pop: 7420 },
  { id: 'shanxi', name: '山西', center: [112.3, 37.6], gdp: 25643, pop: 3480 },
  { id: 'neimenggu', name: '内蒙古', center: [111.7, 40.8], gdp: 23159, pop: 2396 },
  { id: 'liaoning', name: '辽宁', center: [123.4, 41.8], gdp: 28975, pop: 4197 },
  { id: 'jilin', name: '吉林', center: [125.3, 43.9], gdp: 13236, pop: 2375 },
  { id: 'heilongjiang', name: '黑龙江', center: [126.5, 45.8], gdp: 15901, pop: 3099 },
  { id: 'shanghai', name: '上海', center: [121.5, 31.2], gdp: 47219, pop: 2487 },
  { id: 'jiangsu', name: '江苏', center: [119.4, 33.0], gdp: 128222, pop: 8526 },
  { id: 'zhejiang', name: '浙江', center: [120.2, 30.3], gdp: 82553, pop: 6577 },
  { id: 'anhui', name: '安徽', center: [117.3, 31.8], gdp: 47050, pop: 6127 },
  { id: 'fujian', name: '福建', center: [119.3, 26.1], gdp: 54355, pop: 4188 },
  { id: 'jiangxi', name: '江西', center: [115.9, 28.7], gdp: 32075, pop: 4519 },
  { id: 'shandong', name: '山东', center: [118.0, 36.3], gdp: 92069, pop: 10162 },
  { id: 'henan', name: '河南', center: [113.7, 34.0], gdp: 61345, pop: 9872 },
  { id: 'hubei', name: '湖北', center: [112.3, 31.0], gdp: 55803, pop: 5844 },
  { id: 'hunan', name: '湖南', center: [112.0, 27.6], gdp: 50013, pop: 6622 },
  { id: 'guangdong', name: '广东', center: [113.4, 23.1], gdp: 135673, pop: 12684 },
  { id: 'guangxi', name: '广西', center: [108.4, 23.7], gdp: 26301, pop: 5047 },
  { id: 'hainan', name: '海南', center: [109.7, 19.2], gdp: 7551, pop: 1027 },
  { id: 'chongqing', name: '重庆', center: [106.5, 29.6], gdp: 30146, pop: 3213 },
  { id: 'sichuan', name: '四川', center: [102.7, 30.6], gdp: 60133, pop: 8374 },
  { id: 'guizhou', name: '贵州', center: [106.7, 26.8], gdp: 20913, pop: 3856 },
  { id: 'yunnan', name: '云南', center: [101.5, 25.0], gdp: 30021, pop: 4693 },
  { id: 'xizang', name: '西藏', center: [88.0, 31.8], gdp: 2393, pop: 365 },
  { id: 'shaanxi', name: '陕西', center: [108.9, 34.3], gdp: 32772, pop: 3956 },
  { id: 'gansu', name: '甘肃', center: [103.8, 36.0], gdp: 11864, pop: 2492 },
  { id: 'qinghai', name: '青海', center: [96.8, 35.7], gdp: 3799, pop: 595 },
  { id: 'ningxia', name: '宁夏', center: [106.3, 38.5], gdp: 5069, pop: 728 },
  { id: 'xinjiang', name: '新疆', center: [85.0, 41.1], gdp: 17741, pop: 2587 },
  { id: 'hongkong', name: '香港', center: [114.2, 22.3], gdp: 24280, pop: 741 },
  { id: 'macau', name: '澳门', center: [113.5, 22.2], gdp: 1900, pop: 68 },
  { id: 'taiwan', name: '台湾', center: [120.9, 23.7], gdp: 58700, pop: 2356 },
];

function makePolygon(center, size = 1.5, sides = 6) {
  const [cx, cy] = center;
  const coords = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = size * (0.8 + Math.random() * 0.4);
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  coords.push([...coords[0]]);
  return { type: 'Polygon', coordinates: [coords] };
}

function makeCityPolygon(provCenter, offset, size = 0.4) {
  return makePolygon([provCenter[0] + offset[0], provCenter[1] + offset[1]], size, 5);
}

const CITY_NAMES = {
  beijing: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区'],
  shanghai: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区'],
  tianjin: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '滨海新区'],
  hebei: ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'],
  shanxi: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁'],
  neimenggu: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔'],
  liaoning: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
  jilin: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城'],
  heilongjiang: ['哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化'],
  jiangsu: ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'],
  zhejiang: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
  anhui: ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州'],
  fujian: ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'],
  jiangxi: ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶'],
  shandong: ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽'],
  henan: ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店'],
  hubei: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施'],
  hunan: ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底'],
  guangdong: ['广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮'],
  guangxi: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左'],
  hainan: ['海口', '三亚', '三沙', '儋州'],
  chongqing: ['渝中区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '渝北区', '巴南区'],
  sichuan: ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳'],
  guizhou: ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁'],
  yunnan: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧'],
  xizang: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
  shaanxi: ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛'],
  gansu: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南'],
  qinghai: ['西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西'],
  ningxia: ['银川', '石嘴山', '吴忠', '固原', '中卫'],
  xinjiang: ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰'],
  hongkong: ['香港岛', '九龙', '新界'],
  macau: ['花地玛堂', '花王堂', '望德堂', '大堂', '风顺堂', '嘉模堂', '路氹填海'],
  taiwan: ['台北', '新北', '桃园', '台中', '台南', '高雄', '基隆', '新竹', '嘉义'],
};

const insertRegion = prepare(
  'INSERT OR REPLACE INTO regions (id, name, level, parent_id, gdp, population, geojson, geojson_compressed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

transaction(() => {
  PROVINCES.forEach((p) => {
    const geom = makePolygon(p.center, 1.8, 6);
    const geomStr = JSON.stringify(geom);
    insertRegion.run(p.id, p.name, 'province', null, p.gdp, p.pop, geomStr, geomStr);

    const cities = CITY_NAMES[p.id] || [];
    cities.forEach((cname, idx) => {
      const cid = `${p.id}-city-${idx + 1}`;
      const angle = (idx / Math.max(cities.length, 1)) * Math.PI * 2;
      const offset = [Math.cos(angle) * 0.6, Math.sin(angle) * 0.6];
      const cityGeom = makeCityPolygon(p.center, offset, 0.35);
      const cGeomStr = JSON.stringify(cityGeom);
      const cGdp = p.gdp * (0.03 + (idx % 5) * 0.02);
      const cPop = p.pop * (0.03 + (idx % 5) * 0.02);
      insertRegion.run(cid, cname, 'city', p.id, cGdp, cPop, cGeomStr, cGeomStr);
    });
  });
});

const insertFlow = prepare(
  'INSERT INTO flows (from_id, to_id, value, type) VALUES (?, ?, ?, ?)'
);

transaction(() => {
  for (let i = 0; i < PROVINCES.length; i++) {
    for (let j = 0; j < PROVINCES.length; j++) {
      if (i === j) continue;
      if (Math.random() > 0.65) {
        const val = Math.round(500 + Math.random() * 5000);
        insertFlow.run(PROVINCES[i].id, PROVINCES[j].id, val, 'economic');
      }
    }
  }
});

const insertMapping = prepare(
  'INSERT INTO drill_mapping (parent_id, child_id, weight) VALUES (?, ?, ?)'
);

transaction(() => {
  PROVINCES.forEach((p) => {
    const cities = CITY_NAMES[p.id] || [];
    cities.forEach((_c, idx) => {
      insertMapping.run(p.id, `${p.id}-city-${idx + 1}`, 1 / Math.max(cities.length, 1));
    });
  });
});

const data = db.export();
writeFileSync(dbPath, Buffer.from(data));
console.log('Database seeded successfully.');
console.log(`Path: ${dbPath}`);
db.close();
