import type { DatabaseService } from './services/databaseService';

export function seedDatabase(dbService: DatabaseService): void {
  const existingFloors = dbService.getFloors();
  if (existingFloors.length > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  const floor1 = dbService.createFloor({
    name: '1F',
    level: 1,
    width: 50,
    height: 40,
  });

  const floor2 = dbService.createFloor({
    name: '2F',
    level: 2,
    width: 50,
    height: 40,
  });

  const racksData = [
    { name: 'A01', x: 5, y: 5, width: 4, height: 8 },
    { name: 'A02', x: 12, y: 5, width: 4, height: 8 },
    { name: 'A03', x: 19, y: 5, width: 4, height: 8 },
    { name: 'B01', x: 5, y: 18, width: 4, height: 8 },
    { name: 'B02', x: 12, y: 18, width: 4, height: 8 },
    { name: 'B03', x: 19, y: 18, width: 4, height: 8 },
    { name: 'C01', x: 30, y: 5, width: 4, height: 8 },
    { name: 'C02', x: 37, y: 5, width: 4, height: 8 },
    { name: 'C03', x: 30, y: 18, width: 4, height: 8 },
    { name: 'C04', x: 37, y: 18, width: 4, height: 8 },
  ];

  const racks: any[] = [];
  for (const rackData of racksData) {
    const rack = dbService.createRack({
      ...rackData,
      floorId: floor1.id,
      rows: 4,
      columns: 8,
    });
    racks.push(rack);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        dbService.createLocation({
          rackId: rack.id,
          code: `${rack.name}-${row + 1}-${col + 1}`,
          row,
          column: col,
          level: 1,
          status: 'empty',
          quantity: 0,
          maxQuantity: 100,
        });
      }
    }
  }

  const skusData = [
    { code: 'SKU001', name: '手机 A', category: '电子产品', weight: 0.2, volume: 0.001 },
    { code: 'SKU002', name: '笔记本电脑 B', category: '电子产品', weight: 1.5, volume: 0.005 },
    { code: 'SKU003', name: '耳机 C', category: '电子产品', weight: 0.1, volume: 0.0005 },
    { code: 'SKU004', name: 'T恤 D', category: '服装', weight: 0.2, volume: 0.002 },
    { code: 'SKU005', name: '牛仔裤 E', category: '服装', weight: 0.5, volume: 0.003 },
    { code: 'SKU006', name: '水杯 F', category: '日用品', weight: 0.3, volume: 0.0015 },
    { code: 'SKU007', name: '书籍 G', category: '图书', weight: 0.4, volume: 0.002 },
    { code: 'SKU008', name: '零食 H', category: '食品', weight: 0.1, volume: 0.001 },
  ];

  const skus: any[] = [];
  for (const skuData of skusData) {
    const sku = dbService.createSKU(skuData);
    skus.push(sku);
  }

  const locations = dbService.getLocations();
  for (let i = 0; i < Math.min(40, locations.length); i++) {
    const location = locations[i];
    const skuIndex = i % skus.length;
    dbService.updateLocation(location.id, {
      skuId: skus[skuIndex].id,
      status: 'occupied',
      quantity: Math.floor(Math.random() * 50) + 20,
    });
  }

  const orderPriorities: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];
  for (let i = 1; i <= 15; i++) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    const usedSkus = new Set<string>();

    for (let j = 0; j < numItems; j++) {
      let skuIndex;
      do {
        skuIndex = Math.floor(Math.random() * skus.length);
      } while (usedSkus.has(skus[skuIndex].id) && usedSkus.size < skus.length);

      usedSkus.add(skus[skuIndex].id);
      items.push({
        skuId: skus[skuIndex].id,
        skuName: skus[skuIndex].name,
        quantity: Math.floor(Math.random() * 5) + 1,
      });
    }

    dbService.createOrder({
      orderNo: `ORD${String(i).padStart(4, '0')}`,
      priority: orderPriorities[Math.floor(Math.random() * orderPriorities.length)],
      status: 'pending',
      items,
    });
  }

  for (let i = 1; i <= 8; i++) {
    dbService.createRobot({
      name: `AGV-${String(i).padStart(2, '0')}`,
      floorId: floor1.id,
      status: 'idle',
      x: 25 + (i % 3) * 3,
      y: 32 + Math.floor(i / 3) * 3,
      battery: 80 + Math.floor(Math.random() * 20),
      speed: 2,
      capacity: 100,
    });
  }

  dbService.createLog({
    type: 'system',
    level: 'info',
    message: 'Database seeded successfully',
  });

  console.log('Database seeding completed!');
}
